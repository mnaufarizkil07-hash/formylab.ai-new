import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_MIN_SPEECH_MS,
  LIVE_NOISE_CALIBRATION_MS,
  LIVE_SPEECH_END_SILENCE_MS,
  LIVE_STATUS_LABELS,
  base64PcmToFloat32,
  buildLiveVoiceSystemInstruction,
  classifyLiveVoicePillars,
  computeFrameRms,
  computeThresholdsFromNoiseFloor,
  createAdaptiveVoiceDetectorState,
  downsampleFloat32ToInt16Pcm,
  formatLiveConnectionError,
  getScopedChatStorageKey,
  hasGoogleSearchGrounding,
  int16PcmToBase64,
  parsePcmSampleRate,
  resetDetectorTurnFlush,
  sanitizeLiveTranscriptText,
  stepAdaptiveVoiceDetector,
} from "./liveVoiceHelpers";

test("Live Voice constants match 20ms chunks, 400ms calibration, 100ms speech, and 350ms flush", () => {
  assert.equal(LIVE_INPUT_CHUNK_SAMPLES, 320); // 20ms @ 16kHz
  assert.equal(LIVE_NOISE_CALIBRATION_MS, 400);
  assert.equal(LIVE_MIN_SPEECH_MS, 100);
  assert.equal(LIVE_SPEECH_END_SILENCE_MS, 350);
  assert.equal(LIVE_STATUS_LABELS.listening, "Live · Mendengarkan");
  assert.equal(LIVE_STATUS_LABELS.thinking, "Live · AI Berpikir...");
});

test("sanitizeLiveTranscriptText strips <noise> and <inaudible> tags cleanly without creating empty bubbles", () => {
  assert.equal(sanitizeLiveTranscriptText("<noise>"), "");
  assert.equal(sanitizeLiveTranscriptText("  <inaudible>  <noise> "), "");
  assert.equal(
    sanitizeLiveTranscriptText("<noise> Okey, lanjutkan <inaudible>"),
    "Okey, lanjutkan"
  );
  assert.equal(sanitizeLiveTranscriptText("  Halo   semuanya  "), "Halo semuanya");
});

test("classifyLiveVoicePillars classifies 0ms locally with Interactive/Generative/Analytical", () => {
  const analytical = classifyLiveVoicePillars(
    "Berapa batas pH aman BPOM untuk serum niacinamide 5%?",
    "Batas pH yang ideal sekitar lima koma lima sampai enam koma lima.",
    false
  );
  assert.deepEqual(analytical, [
    "Interactive AI",
    "Generative AI",
    "Analytical AI",
  ]);

  const grounded = classifyLiveVoicePillars(
    "Apa kabar?",
    "Halo, ada yang bisa dibantu?",
    true
  );
  assert.ok(grounded.includes("Interactive AI"));
  assert.ok(grounded.includes("Analytical AI"));

  const casual = classifyLiveVoicePillars("Halo", "Halo!", false);
  assert.deepEqual(casual, ["Interactive AI"]);
});

test("PCM Int16 <-> Base64 <-> Float32 round-trip preserves waveform within Int16 quantization", () => {
  const samples = new Float32Array([0, 0.5, -0.5, 0.99, -0.99]);
  const int16 = downsampleFloat32ToInt16Pcm(samples, 16000, 16000);
  assert.equal(int16.length, samples.length);

  const b64 = int16PcmToBase64(int16);
  assert.ok(b64.length > 0);

  const decoded = base64PcmToFloat32(b64);
  assert.equal(decoded.length, samples.length);
  for (let i = 0; i < samples.length; i++) {
    assert.ok(Math.abs(decoded[i] - samples[i]) < 0.001);
  }
});

test("downsampleFloat32ToInt16Pcm smoothly linear-downsamples 48kHz & 44.1kHz to 16kHz in 20ms chunks", () => {
  const input48 = new Float32Array(960).fill(0.25); // 20ms @ 48kHz
  const out48 = downsampleFloat32ToInt16Pcm(input48, 48000, 16000);
  assert.equal(out48.length, 320); // 20ms @ 16kHz
  assert.ok(Math.abs(out48[0] - Math.round(0.25 * 0x7fff)) <= 2);

  const input44 = new Float32Array(4410).fill(-0.5); // 100ms @ 44.1kHz
  const out44 = downsampleFloat32ToInt16Pcm(input44, 44100, 16000);
  assert.equal(out44.length, 1600); // 100ms @ 16kHz
  assert.ok(Math.abs(out44[0] - Math.round(-0.5 * 0x8000)) <= 2);
});

test("stepAdaptiveVoiceDetector calibrates in 400ms, requires >=100ms speech, fires audioStreamEnd ONCE at 350ms silence, and never repeats while silent", () => {
  const speechFrame = new Float32Array(320).fill(0.015);
  const ambientFrame = new Float32Array(320).fill(0.004);
  assert.ok(computeFrameRms(speechFrame) >= 0.014);
  assert.ok(computeFrameRms(ambientFrame) <= 0.005);

  const thresholds = computeThresholdsFromNoiseFloor(0.004);
  assert.ok(Math.abs(thresholds.speechThreshold - 0.0088) < 0.0001);
  assert.ok(thresholds.silenceThreshold < thresholds.speechThreshold);

  const state = createAdaptiveVoiceDetectorState();

  // Phase 1: 400ms ambient noise calibration (20 frames x 20ms)
  let calibrated = false;
  for (let i = 0; i < 20; i++) {
    const res = stepAdaptiveVoiceDetector(state, 0.004, 20, false);
    if (i < 19) {
      assert.equal(res.event, "none");
      assert.equal(state.calibrated, false);
    } else {
      assert.equal(res.event, "calibrated");
      assert.equal(state.calibrated, true);
      calibrated = true;
    }
  }
  assert.equal(calibrated, true);

  // Brief click (< 100ms = 60ms) followed by silence must NOT fire speech_end
  for (let i = 0; i < 3; i++) {
    assert.equal(stepAdaptiveVoiceDetector(state, 0.02, 20, false).event, "none");
  }
  for (let i = 0; i < 25; i++) {
    assert.equal(stepAdaptiveVoiceDetector(state, 0.004, 20, false).event, "none");
  }

  // Soft 1-word utterance ("okey", rms = 0.015 for 120ms = 6 frames x 20ms) arms qualified speech
  let started = false;
  for (let i = 0; i < 6; i++) {
    const res = stepAdaptiveVoiceDetector(state, 0.015, 20, false);
    if (res.event === "speech_start") started = true;
  }
  assert.equal(started, true);
  assert.equal(state.hasQualifiedSpeech, true);

  // Return to noise floor for 350ms -> fires speech_end EXACTLY ONCE (on frame 18: 18*20ms = 360ms >= 350ms)
  let flushCount = 0;
  for (let i = 0; i < 18; i++) {
    const res = stepAdaptiveVoiceDetector(state, 0.004, 20, false);
    if (res.event === "speech_end") flushCount += 1;
  }
  assert.equal(flushCount, 1);
  assert.equal(state.flushSentForTurn, true);

  // Prolonged silence (another 1000ms = 50 frames) MUST NOT fire speech_end again
  for (let i = 0; i < 50; i++) {
    assert.equal(stepAdaptiveVoiceDetector(state, 0.004, 20, false).event, "none");
  }

  // turnComplete resets flush flag cleanly
  resetDetectorTurnFlush(state);
  assert.equal(state.flushSentForTurn, false);

  // Next utterance (>= 100ms) -> 350ms silence fires speech_end once again
  for (let i = 0; i < 5; i++) {
    stepAdaptiveVoiceDetector(state, 0.03, 20, false);
  }
  let secondFlushCount = 0;
  for (let i = 0; i < 20; i++) {
    const res = stepAdaptiveVoiceDetector(state, 0.004, 20, false);
    if (res.event === "speech_end") secondFlushCount += 1;
  }
  assert.equal(secondFlushCount, 1);
});

test("parsePcmSampleRate extracts rate from mimeType or falls back cleanly", () => {
  assert.equal(parsePcmSampleRate("audio/pcm;rate=24000"), 24000);
  assert.equal(parsePcmSampleRate("audio/pcm;rate=16000"), 16000);
  assert.equal(parsePcmSampleRate("audio/pcm", 24000), 24000);
  assert.equal(parsePcmSampleRate(undefined, 24000), 24000);
});

test("buildLiveVoiceSystemInstruction enforces strict googleSearch rule and concise tone", () => {
  const prompt = buildLiveVoiceSystemInstruction("Diskusi serum ceramide 2%");
  assert.ok(prompt.length < 1300, `Expected concise prompt, got ${prompt.length}`);
  assert.ok(prompt.includes("HANYA gunakan tool googleSearch"));
  assert.ok(prompt.includes("JAWAB LANGSUNG"));
  assert.ok(prompt.includes("Diskusi serum ceramide 2%"));
  assert.ok(prompt.includes("DILARANG menyebutkan simbol markdown"));
});

test("hasGoogleSearchGrounding detects search queries or grounding chunks", () => {
  assert.equal(hasGoogleSearchGrounding(null), false);
  assert.equal(hasGoogleSearchGrounding({}), false);
  assert.equal(
    hasGoogleSearchGrounding({ webSearchQueries: ["regulasi BPOM retinol"] }),
    true
  );
  assert.equal(
    hasGoogleSearchGrounding({ groundingChunks: [{ web: { uri: "https://bpom.go.id" } }] }),
    true
  );
});

test("formatLiveConnectionError returns clear Indonesian diagnostics", () => {
  assert.ok(formatLiveConnectionError("NotAllowedError").includes("Izin mikrofon"));
  assert.ok(formatLiveConnectionError("quota exceeded", 1011).includes("Kuota"));
  assert.ok(formatLiveConnectionError("timeout").includes("batas waktu"));
});

test("getScopedChatStorageKey scopes keys per normalized user email", () => {
  assert.equal(
    getScopedChatStorageKey("formylab_chat_sessions", "User@Example.COM"),
    "formylab_chat_sessions::user@example.com"
  );
  assert.equal(
    getScopedChatStorageKey("formylab_chat_sessions", ""),
    "formylab_chat_sessions"
  );
});
