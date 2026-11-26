import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_ECHO_GUARD_TAIL_MS,
  LIVE_FSM_STATUS_LABELS,
  LIVE_HOTSWAP_TARGET_TURN,
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_MAX_AUTO_RECONNECTS,
  LIVE_SPEECH_QUIET_CONFIRM_MS,
  LIVE_STANDBY_MAX_AGE_MS,
  LIVE_STANDBY_PREWARM_TURN,
  LIVE_STATUS_LABELS,
  LIVE_TOOL_TIMEOUT_MS,
  LIVE_TRANSCRIPT_THROTTLE_MS,
  LIVE_TURN_WATCHDOG_MS,
  LIVE_VOICE_OPTIONS,
  base64PcmToFloat32,
  buildConversationMemorySummary,
  buildLiveVoiceFunctionDeclarations,
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
  summarizeVoiceMetrics,
} from "./liveVoiceHelpers";
import {
  encodeFormulaTableMessage,
  extractFormulatorDraftFromTable,
  formulaTableToMarkdown,
  normalizeFormulaTableArtifact,
  parseFormulaTableMessage,
} from "./chatNoteUtils";

test("Live Voice O(1) Hot-Swap, FSM, Echo Guard (220ms), Watchdog (5s), and Tool Timeout (12s) constants match architecture", () => {
  assert.equal(LIVE_INPUT_CHUNK_SAMPLES, 640); // exact 40ms @ 16kHz
  assert.equal(LIVE_TRANSCRIPT_THROTTLE_MS, 80);
  assert.equal(LIVE_ECHO_GUARD_TAIL_MS, 220);
  assert.equal(LIVE_SPEECH_QUIET_CONFIRM_MS, 300);
  assert.equal(LIVE_STANDBY_PREWARM_TURN, 2);
  assert.equal(LIVE_HOTSWAP_TARGET_TURN, 3);
  assert.equal(LIVE_STANDBY_MAX_AGE_MS, 55_000);
  assert.equal(LIVE_TURN_WATCHDOG_MS, 5_000);
  assert.equal(LIVE_TOOL_TIMEOUT_MS, 12_000);
  assert.equal(LIVE_MAX_AUTO_RECONNECTS, 2);

  assert.deepEqual(
    LIVE_VOICE_OPTIONS.map((v) => v.id),
    ["Aoede", "Zephyr", "Kore", "Puck"]
  );
  assert.equal(LIVE_STATUS_LABELS.listening, "Live · Mendengarkan");
  assert.equal(LIVE_STATUS_LABELS.speaking, "Live · AI Berbicara");
  assert.equal(LIVE_FSM_STATUS_LABELS.LISTENING, "Live · Mendengarkan");
  assert.equal(LIVE_FSM_STATUS_LABELS.AI_SPEAKING, "Live · AI Berbicara");
  assert.equal(LIVE_FSM_STATUS_LABELS.TOOL_EXECUTING, "Live · Menyiapkan Aksi...");
});

test("buildLiveVoiceFunctionDeclarations provides unified tools across all voice chips and adds search_web_info only when Search is ON", () => {
  const withoutSearch = buildLiveVoiceFunctionDeclarations(false);
  assert.deepEqual(
    withoutSearch.map((d) => d.name),
    ["create_formula_table", "save_to_google_docs"]
  );

  const withSearch = buildLiveVoiceFunctionDeclarations(true);
  assert.deepEqual(
    withSearch.map((d) => d.name),
    ["create_formula_table", "save_to_google_docs", "search_web_info"]
  );
});

test("buildConversationMemorySummary keeps max 8 recent messages, expands FormulaTable cards, and caps at 350 words", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Serum Niacinamide 5%",
    columns: ["Bahan", "Persen"],
    rows: [
      ["Aqua", "90%"],
      ["Niacinamide", "5%"],
    ],
  });
  assert.ok(table);

  const messages = Array.from({ length: 12 }, (_, idx) => ({
    role: (idx % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content:
      idx === 11
        ? encodeFormulaTableMessage(table!)
        : `Pesan ke-${idx + 1} tentang formulasi pelembap kulit sensitif.`,
  }));

  const summary = buildConversationMemorySummary(messages, 8, 350);
  assert.equal(summary.includes("Pesan ke-1 "), false); // older than last 8
  assert.ok(summary.includes("Pesan ke-5"));
  assert.ok(summary.includes("Tabel Formulasi — Serum Niacinamide 5%"));
  assert.ok(summary.split(/\s+/).length <= 350);
});

test("FormulaTableArtifact round-trip encode/parse, Markdown conversion, and Formulator draft extraction", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Moisturizer Kulit Sensitif",
    subtitle: "Target pH 5.3 · Tekstur gel-cream",
    columns: ["Fase", "Bahan", "Persentase (%)", "Fungsi"],
    rows: [
      ["A", "Aqua", "82%", "Pelarut"],
      ["B", "Squalane", "6%", "Emolien"],
      ["C", "Ceramide NP", "1%", "Skin barrier"],
    ],
    notes: "Homogenisasi pada 70°C.",
  });
  assert.ok(table);

  const encoded = encodeFormulaTableMessage(table!);
  const parsed = parseFormulaTableMessage(encoded);
  assert.ok(parsed);
  assert.equal(parsed?.title, "Moisturizer Kulit Sensitif");
  assert.equal(parsed?.rows.length, 3);

  const md = formulaTableToMarkdown(parsed!);
  assert.ok(md.includes("| Fase | Bahan | Persentase (%) | Fungsi |"));
  assert.ok(md.includes("| C | Ceramide NP | 1% | Skin barrier |"));
  assert.ok(md.includes("Homogenisasi pada 70°C."));

  const draft = extractFormulatorDraftFromTable(parsed!);
  assert.equal(draft.formulaName, "Moisturizer Kulit Sensitif");
  assert.equal(draft.targetPh, "5.3");
  assert.equal(draft.skinTarget, "Sensitive");
  assert.deepEqual(draft.customIngredients, [
    "Aqua (82%)",
    "Squalane (6%)",
    "Ceramide NP (1%)",
  ]);
});

test("summarizeVoiceMetrics computes Turn #1-3 vs Turn #4+ averages and hot-swap count", () => {
  const summary = summarizeVoiceMetrics([
    { turn: 1, sessionIndex: 1, firstAudioMs: 500, queueDelayMs: 20, toolsCalled: "-", hotSwapped: "tidak" },
    { turn: 2, sessionIndex: 1, firstAudioMs: 600, queueDelayMs: 22, toolsCalled: "create_formula_table", hotSwapped: "tidak" },
    { turn: 3, sessionIndex: 1, firstAudioMs: 700, queueDelayMs: 18, toolsCalled: "-", hotSwapped: "tidak" },
    { turn: 4, sessionIndex: 2, firstAudioMs: 520, queueDelayMs: 19, toolsCalled: "save_to_google_docs", hotSwapped: "ya" },
    { turn: 5, sessionIndex: 2, firstAudioMs: 580, queueDelayMs: 20, toolsCalled: "-", hotSwapped: "tidak" },
  ]);

  assert.equal(summary.totalTurns, 5);
  assert.equal(summary.avgFirstAudioTurn1To3Ms, 600);
  assert.equal(summary.avgFirstAudioTurn4PlusMs, 550);
  assert.equal(summary.hotSwapCount, 1);
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

test("buildLiveVoiceSystemInstruction enforces Module 4 natural spoken Indonesian, Unified Tools, and text memory injection", () => {
  const purePrompt = buildLiveVoiceSystemInstruction(
    "User: Halo\nAI: Halo, ada formula yang mau dibahas?",
    false
  );
  assert.ok(purePrompt.includes("1 sampai 2 kalimat"));
  assert.ok(purePrompt.includes("create_formula_table"));
  assert.ok(purePrompt.includes("save_to_google_docs"));
  assert.ok(purePrompt.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"));
  assert.ok(purePrompt.includes("DILARANG membacakan simbol markdown"));
  assert.ok(purePrompt.includes("JANGAN PERNAH menolak"));

  const searchPrompt = buildLiveVoiceSystemInstruction("", true);
  assert.ok(searchPrompt.includes("search_web_info"));
  assert.equal(searchPrompt.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"), false);
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
  state = observeMicRmsForProfiler(state, 0.09, 1000);
  state = observeMicRmsForProfiler(state, 0.08, 1040);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  state = observeMicRmsForProfiler(state, 0.004, 1080);
  state = observeMicRmsForProfiler(state, 0.004, 1280);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.quietSinceMs, 1080);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  state = observeMicRmsForProfiler(state, 0.004, 1380);
  assert.equal(state.userSpeaking, false);
  assert.equal(state.lastSpeechEndedAtMs, 1080);
});
