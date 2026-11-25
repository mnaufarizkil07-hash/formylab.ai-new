import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_ECHO_GUARD_TAIL_MS,
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_SPEECH_QUIET_CONFIRM_MS,
  LIVE_STATUS_LABELS,
  LIVE_TRANSCRIPT_THROTTLE_MS,
  LIVE_VOICE_OPTIONS,
  base64PcmToFloat32,
  buildLiveVoiceSystemInstruction,
  classifyLiveVoicePillars,
  computeInt16PcmRms,
  createSpeechEndProfilerState,
  downsampleFloat32ToInt16Pcm,
  formatLiveConnectionError,
  getScopedChatStorageKey,
  hasGoogleSearchGrounding,
  int16PcmToBase64,
  observeMicRmsForProfiler,
  parsePcmSampleRate,
  sanitizeLiveTranscriptText,
  sanitizeLiveUserTranscript,
} from "./liveVoiceHelpers";

test("Live Voice constants use 40ms (640-sample) chunks, 180ms Echo Guard tail, 300ms quiet profiler, 4 natural voices, and no thinking label", () => {
  assert.equal(LIVE_INPUT_CHUNK_SAMPLES, 640); // ~40ms @ 16kHz
  assert.equal(LIVE_TRANSCRIPT_THROTTLE_MS, 100);
  assert.equal(LIVE_ECHO_GUARD_TAIL_MS, 180);
  assert.equal(LIVE_SPEECH_QUIET_CONFIRM_MS, 300);
  assert.deepEqual(
    LIVE_VOICE_OPTIONS.map((v) => v.id),
    ["Aoede", "Zephyr", "Kore", "Puck"]
  );
  assert.equal(LIVE_STATUS_LABELS.listening, "Live · Mendengarkan");
  assert.equal(LIVE_STATUS_LABELS.speaking, "Live · AI Berbicara");
  assert.equal("thinking" in LIVE_STATUS_LABELS, false);
});

test("sanitizeLiveTranscriptText & sanitizeLiveUserTranscript strip noise tags and stray leading punctuation", () => {
  assert.equal(sanitizeLiveTranscriptText("<noise>"), "");
  assert.equal(sanitizeLiveTranscriptText("  <inaudible>  <noise> "), "");
  assert.equal(
    sanitizeLiveTranscriptText("<noise> Buatin resep moisturizer <inaudible>"),
    "Buatin resep moisturizer"
  );
  assert.equal(
    sanitizeLiveTranscriptText("  Halo   semuanya  "),
    "Halo semuanya"
  );

  // Leading punctuation from VAD onset must be stripped cleanly
  assert.equal(
    sanitizeLiveUserTranscript(". Oke, langsung buat resepnya."),
    "Oke, langsung buat resepnya."
  );
  assert.equal(
    sanitizeLiveUserTranscript("... , !? ; :  Buatin moisturizer ringan."),
    "Buatin moisturizer ringan."
  );
  assert.equal(sanitizeLiveUserTranscript("... <noise> , "), "");
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

test("downsampleFloat32ToInt16Pcm smoothly linear-downsamples 48kHz & 44.1kHz to 16kHz in 40ms chunks", () => {
  const input48 = new Float32Array(1920).fill(0.25); // 40ms @ 48kHz
  const out48 = downsampleFloat32ToInt16Pcm(input48, 48000, 16000);
  assert.equal(out48.length, 640); // 40ms @ 16kHz
  assert.ok(Math.abs(out48[0] - Math.round(0.25 * 0x7fff)) <= 2);

  const input44 = new Float32Array(4410).fill(-0.5); // 100ms @ 44.1kHz
  const out44 = downsampleFloat32ToInt16Pcm(input44, 44100, 16000);
  assert.equal(out44.length, 1600); // 100ms @ 16kHz
  assert.ok(Math.abs(out44[0] - Math.round(-0.5 * 0x8000)) <= 2);
});

test("parsePcmSampleRate extracts rate from mimeType or falls back cleanly", () => {
  assert.equal(parsePcmSampleRate("audio/pcm;rate=24000"), 24000);
  assert.equal(parsePcmSampleRate("audio/pcm;rate=16000"), 16000);
  assert.equal(parsePcmSampleRate("audio/pcm", 24000), 24000);
  assert.equal(parsePcmSampleRate(undefined, 24000), 24000);
});

test("buildLiveVoiceSystemInstruction enforces concise 1-2 sentence spoken Indonesian style and opt-in Search", () => {
  const purePrompt = buildLiveVoiceSystemInstruction(
    "Diskusi moisturizer ceramide",
    false
  );
  assert.ok(purePrompt.length < 1150);
  assert.equal(purePrompt.includes("googleSearch"), false);
  assert.equal(purePrompt.includes("create_chat_note"), false);
  assert.equal(purePrompt.includes("create_google_doc"), false);
  assert.ok(purePrompt.includes("1 sampai 2 kalimat"));
  assert.ok(purePrompt.includes("Formulator"));
  assert.ok(purePrompt.includes("Diskusi moisturizer ceramide"));

  const searchPrompt = buildLiveVoiceSystemInstruction(
    "Diskusi moisturizer ceramide",
    true
  );
  assert.ok(searchPrompt.includes("HANYA gunakan tool googleSearch"));
  assert.ok(searchPrompt.includes("DILARANG membacakan simbol markdown"));
});

test("hasGoogleSearchGrounding detects search queries or grounding chunks", () => {
  assert.equal(hasGoogleSearchGrounding(null), false);
  assert.equal(hasGoogleSearchGrounding({}), false);
  assert.equal(
    hasGoogleSearchGrounding({ webSearchQueries: ["regulasi BPOM retinol"] }),
    true
  );
  assert.equal(
    hasGoogleSearchGrounding({
      groundingChunks: [{ web: { uri: "https://bpom.go.id" } }],
    }),
    true
  );
});

test("formatLiveConnectionError returns clear Indonesian diagnostics", () => {
  assert.ok(
    formatLiveConnectionError("NotAllowedError").includes("Izin mikrofon")
  );
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

test("computeInt16PcmRms and observeMicRmsForProfiler detect speech end after 300ms quiet without mutating audio", () => {
  const silent = new Int16Array(640);
  assert.equal(computeInt16PcmRms(silent), 0);

  const loud = new Int16Array(640).fill(16384); // ~0.5 amplitude
  assert.ok(Math.abs(computeInt16PcmRms(loud) - 0.5) < 0.001);

  let state = createSpeechEndProfilerState();
  // User speaks at t=1000ms and t=1040ms
  state = observeMicRmsForProfiler(state, 0.09, 1000);
  state = observeMicRmsForProfiler(state, 0.08, 1040);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  // User goes quiet at t=1080ms; not yet 300ms quiet at t=1280ms
  state = observeMicRmsForProfiler(state, 0.004, 1080);
  state = observeMicRmsForProfiler(state, 0.004, 1280);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.quietSinceMs, 1080);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  // At t=1380ms (300ms quiet confirmed), stamps exact quiet onset timestamp
  state = observeMicRmsForProfiler(state, 0.004, 1380);
  assert.equal(state.userSpeaking, false);
  assert.equal(state.lastSpeechEndedAtMs, 1080);
});
