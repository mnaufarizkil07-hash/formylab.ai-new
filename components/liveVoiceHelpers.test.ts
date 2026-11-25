import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_NOISE_GATE_HOLD_MS,
  LIVE_NOISE_GATE_RMS_THRESHOLD,
  base64PcmToFloat32,
  buildLiveVoiceSystemInstruction,
  classifyLiveVoicePillars,
  computeFrameRms,
  createSilenceGateState,
  downsampleFloat32ToInt16Pcm,
  evaluateSilenceGate,
  formatLiveConnectionError,
  getScopedChatStorageKey,
  hasGoogleSearchGrounding,
  int16PcmToBase64,
  parsePcmSampleRate,
} from "./liveVoiceHelpers";

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

test("downsampleFloat32ToInt16Pcm mathematically linear-downsamples 48kHz & 44.1kHz to 16kHz", () => {
  assert.ok(
    LIVE_INPUT_CHUNK_SAMPLES >= 320 && LIVE_INPUT_CHUNK_SAMPLES <= 512,
    "Chunk size must be 20-32ms @ 16kHz (320-512 samples)"
  );

  const input48 = new Float32Array(1200).fill(0.25); // 25ms @ 48kHz
  const out48 = downsampleFloat32ToInt16Pcm(input48, 48000, 16000);
  assert.equal(out48.length, 400); // 25ms @ 16kHz
  assert.ok(Math.abs(out48[0] - Math.round(0.25 * 0x7fff)) <= 2);

  const input44 = new Float32Array(4410).fill(-0.5); // 100ms @ 44.1kHz
  const out44 = downsampleFloat32ToInt16Pcm(input44, 44100, 16000);
  assert.equal(out44.length, 1600); // 100ms @ 16kHz
  assert.ok(Math.abs(out44[0] - Math.round(-0.5 * 0x8000)) <= 2);
});

test("computeFrameRms and 150ms silence gate transition cleanly from speech to zero-silence", () => {
  const speechFrame = new Float32Array(128).fill(0.1);
  const fanNoiseFrame = new Float32Array(128).fill(0.004);
  assert.ok(computeFrameRms(speechFrame) > LIVE_NOISE_GATE_RMS_THRESHOLD);
  assert.ok(computeFrameRms(fanNoiseFrame) < LIVE_NOISE_GATE_RMS_THRESHOLD);

  const state = createSilenceGateState();

  // Speech active -> gate off
  const r1 = evaluateSilenceGate(state, 0.08, 25);
  assert.equal(r1.emitZeroSilence, false);
  assert.equal(r1.justActivatedAfterSpeech, false);

  // Brief pause (<= 150ms) -> still passes natural breathing without cutting off
  const r2 = evaluateSilenceGate(state, 0.003, 120);
  assert.equal(r2.emitZeroSilence, false);
  assert.equal(r2.justActivatedAfterSpeech, false);

  // Crosses 150ms holdover -> gate activates & signals user stopped speaking once
  const r3 = evaluateSilenceGate(state, 0.003, LIVE_NOISE_GATE_HOLD_MS);
  assert.equal(r3.emitZeroSilence, true);
  assert.equal(r3.justActivatedAfterSpeech, true);

  // Subsequent silent frames stay zero-gated without re-firing transition log
  const r4 = evaluateSilenceGate(state, 0.002, 25);
  assert.equal(r4.emitZeroSilence, true);
  assert.equal(r4.justActivatedAfterSpeech, false);

  // New speech immediately opens gate again
  const r5 = evaluateSilenceGate(state, 0.05, 25);
  assert.equal(r5.emitZeroSilence, false);
  assert.equal(r5.justActivatedAfterSpeech, false);
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
