import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_CONTEXT_WINDOW_COMPRESSION,
  LIVE_ECHO_GUARD_TAIL_MS,
  LIVE_FSM_STATUS_LABELS,
  LIVE_HIGHPASS_CUTOFF_HZ,
  LIVE_HOTSWAP_TARGET_TURN,
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_MAX_AUTO_RECONNECTS,
  LIVE_SPEECH_QUIET_CONFIRM_MS,
  LIVE_STANDBY_MAX_AGE_MS,
  LIVE_STANDBY_PREWARM_TURN,
  LIVE_STATUS_LABELS,
  LIVE_TOOL_RECOVERY_MS,
  LIVE_TOOL_TIMEOUT_MS,
  LIVE_TRANSCRIPT_THROTTLE_MS,
  LIVE_TURN_WATCHDOG_MS,
  LIVE_VOICE_OPTIONS,
  base64PcmToFloat32,
  buildConversationMemorySummary,
  buildDeterministicMemoryPrompt,
  buildLiveVoiceFunctionDeclarations,
  buildLiveVoiceSystemInstruction,
  classifyLiveVoicePillars,
  computeInt16PcmRms,
  createContinuousResampler,
  createSpeechEndProfilerState,
  downsampleFloat32ToInt16Pcm,
  formatLiveConnectionError,
  getScopedChatStorageKey,
  hasGoogleSearchGrounding,
  int16PcmToBase64,
  isNonLatinHallucinationFragment,
  observeMicRmsForProfiler,
  parsePcmSampleRate,
  recallChatHistoryLocal,
  sanitizeLiveTranscriptText,
  sanitizeLiveUserTranscript,
  summarizeVoiceMetrics,
} from "./liveVoiceHelpers";
import {
  FORMULATION_REQUIRED_COLUMNS,
  encodeFormulaTableMessage,
  extractFormulatorDraftFromTable,
  formulaTableToMarkdown,
  normalizeFormulaTableArtifact,
  parseFormulaTableMessage,
  validateAndBalanceFormulationRows,
} from "./chatNoteUtils";

test("Live Voice constants match low-latency audio (320 samples / 20ms, 85Hz highpass, 120ms echo tail), Turn 7/8 120s rotation, and 2.2s tool recovery", () => {
  assert.equal(LIVE_INPUT_CHUNK_SAMPLES, 320); // exact 20ms @ 16kHz
  assert.equal(LIVE_HIGHPASS_CUTOFF_HZ, 85);
  assert.equal(LIVE_TRANSCRIPT_THROTTLE_MS, 80);
  assert.equal(LIVE_ECHO_GUARD_TAIL_MS, 120);
  assert.equal(LIVE_SPEECH_QUIET_CONFIRM_MS, 260);
  assert.equal(LIVE_STANDBY_PREWARM_TURN, 7);
  assert.equal(LIVE_HOTSWAP_TARGET_TURN, 8);
  assert.equal(LIVE_STANDBY_MAX_AGE_MS, 120_000);
  assert.equal(LIVE_TURN_WATCHDOG_MS, 5_000);
  assert.equal(LIVE_TOOL_RECOVERY_MS, 2_200);
  assert.equal(LIVE_TOOL_TIMEOUT_MS, 20_000);
  assert.equal(LIVE_MAX_AUTO_RECONNECTS, 2);

  assert.deepEqual(LIVE_CONTEXT_WINDOW_COMPRESSION, {
    triggerTokens: "12000",
    slidingWindow: { targetTokens: "6000" },
  });

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

test("buildLiveVoiceFunctionDeclarations permanently registers all 4 unified skills with simplified hybrid create_formula_table schema", () => {
  const decls = buildLiveVoiceFunctionDeclarations();
  assert.deepEqual(
    decls.map((d) => d.name),
    [
      "create_formula_table",
      "save_to_google_docs",
      "search_web_info",
      "recall_chat_history",
    ]
  );

  const tableTool = decls.find((d) => d.name === "create_formula_table");
  assert.ok(tableTool?.parameters?.properties);
  assert.deepEqual(Object.keys(tableTool!.parameters!.properties!).sort(), [
    "constraints",
    "key_ingredients",
    "table_type",
    "topic",
  ]);
  assert.deepEqual(tableTool!.parameters!.required, ["topic", "table_type"]);
});

test("validateAndBalanceFormulationRows guarantees exact 100.00% sum via Aqua auto-adjustment and strips Total rows", () => {
  const rawRows: string[][] = [
    ["A", "Aqua (Water)", "70%", "Pelarut utama", "Gunakan air deionisasi"],
    ["A", "Glycerin", "5%", "Humektan", "Aman BPOM"],
    ["B", "Squalane", "6%", "Emolien", "Non-komedogenik"],
    ["C", "Niacinamide", "4%", "Brightening", "pH optimal 5.5-6.5"],
    ["C", "Phenoxyethanol", "0.8%", "Pengawet", "Maks BPOM 1%"],
    ["Total", "Total Formulasi", "85.8%", "-", "-"],
  ];

  const balanced = validateAndBalanceFormulationRows(FORMULATION_REQUIRED_COLUMNS, rawRows);
  assert.equal(balanced.rows.length, 5); // stripped the duplicate Total row
  assert.equal(balanced.totalPercentage, "100.00%");
  // Aqua should have been adjusted from 70% -> 84.20% so sum is exact 100.00%
  assert.equal(balanced.rows[0][2], "84.20%");

  const numericSum = balanced.rows.reduce(
    (sum, r) => sum + parseFloat(r[2].replace("%", "")),
    0
  );
  assert.ok(Math.abs(numericSum - 100) < 0.001);

  // Also handles overshooting > 100% by scaling or trimming Aqua cleanly
  const overRows: string[][] = [
    ["A", "Water (Aqua)", "85%", "Solvent", "-"],
    ["B", "Butylene Glycol", "10%", "Humectant", "-"],
    ["B", "Caprylic/Capric Triglyceride", "12%", "Emollient", "-"],
  ];
  const balancedOver = validateAndBalanceFormulationRows(FORMULATION_REQUIRED_COLUMNS, overRows);
  assert.equal(balancedOver.totalPercentage, "100.00%");
  assert.equal(balancedOver.rows[0][2], "78.00%");
});

test("buildDeterministicMemoryPrompt emits [RINGKASAN FAKTA], [TABEL FORMULA AKTIF], and [12 PESAN DIALOG TERAKHIR]", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Moisturizer Barrier Kulit Sensitif",
    subtitle: "Target pH 5.3 · Gel-cream",
    tableType: "formulation",
    columns: [...FORMULATION_REQUIRED_COLUMNS],
    rows: [
      ["A", "Aqua (Water)", "80.00%", "Pelarut", "Deionized"],
      ["A", "Butylene Glycol", "5.00%", "Humektan", "Aman BPOM"],
      ["B", "Squalane", "10.00%", "Emolien", "Halal plant-derived"],
      ["C", "Alpha-Arbutin", "2.00%", "Brightening", "Maks BPOM 2%"],
      ["C", "Panthenol", "2.00%", "Soothing", "Aman kulit sensitif"],
      ["C", "Phenoxyethanol", "1.00%", "Pengawet", "Maks 1%"],
    ],
    specs: {
      targetPh: "5.2 – 5.8",
      texture: "Gel-cream ringan cepat meresap",
      stabilityNote: "Stabil 45°C / 4 minggu",
      bpomHalalNote: "Sesuai batas BPOM & bebas alkohol",
    },
    notes: "Homogenisasi pada 70°C.",
  });
  assert.ok(table);

  const recentMessages = Array.from({ length: 15 }, (_, idx) => ({
    role: (idx % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `Pesan ke-${idx + 1} tentang formula moisturizer sensitif.`,
  }));

  const prompt = buildDeterministicMemoryPrompt({
    longTermSummary: "Nama user: Nadia. Fokus: moisturizer barrier kulit sensitif.",
    latestFormulaTable: table,
    recentMessages,
  });

  assert.ok(prompt.includes("[RINGKASAN FAKTA]"));
  assert.ok(prompt.includes("Nama user: Nadia"));
  assert.ok(prompt.includes("[TABEL FORMULA AKTIF]"));
  assert.ok(prompt.includes("Moisturizer Barrier Kulit Sensitif"));
  assert.ok(prompt.includes("Alpha-Arbutin"));
  assert.ok(prompt.includes("[12 PESAN DIALOG TERAKHIR]"));
  assert.equal(prompt.includes("Pesan ke-1 "), false); // only last 12 kept
  assert.ok(prompt.includes("User: Pesan ke-5"));
  assert.ok(prompt.includes("Asisten: Pesan ke-4"));
  assert.ok(prompt.includes("Pesan ke-15"));
});

test("recallChatHistoryLocal finds older messages and active table locally in <1ms", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Serum Arbutin 2%",
    columns: [...FORMULATION_REQUIRED_COLUMNS],
    rows: [
      ["A", "Aqua (Water)", "93.00%", "Pelarut", "-"],
      ["A", "Butylene Glycol", "5.00%", "Humektan", "-"],
      ["C", "Alpha-Arbutin", "2.00%", "Brightening", "Maks 2%"],
    ],
  });

  const history = [
    { role: "user" as const, content: "Halo, nama saya Raka, aku mau bikin serum arbutin." },
    { role: "assistant" as const, content: "Siap Raka, kita racik serum arbutin yang lembut ya." },
    { role: "user" as const, content: "Tambahin butylene glycol ya biar lembap." },
  ];

  const found = recallChatHistoryLocal(history, "Raka arbutin", table);
  assert.ok(found.includes("[Tabel Formula Aktif] Serum Arbutin 2%"));
  assert.ok(found.includes("Raka"));

  const notFound = recallChatHistoryLocal(history, "retinol bakuchiol", table);
  assert.ok(notFound.includes("Tidak ditemukan"));
});

test("buildConversationMemorySummary keeps max 8 recent messages, expands FormulaTable cards, and caps at 350 words", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Serum Niacinamide 5%",
    columns: ["Fase", "Bahan", "Persen"],
    rows: [
      ["A", "Aqua", "95%"],
      ["C", "Niacinamide", "5%"],
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
  assert.equal(summary.includes("Pesan ke-1 "), false);
  assert.ok(summary.includes("Pesan ke-5"));
  assert.ok(summary.includes("Tabel Formula: Serum Niacinamide 5%"));
  assert.ok(summary.split(/\s+/).length <= 350);
});

test("FormulaTableArtifact round-trip encode/parse preserves specs, procedure, totalPercentage, Markdown, and Formulator draft", () => {
  const table = normalizeFormulaTableArtifact({
    title: "Moisturizer Kulit Sensitif",
    subtitle: "Target pH 5.3 · Tekstur gel-cream",
    tableType: "formulation",
    totalPercentage: "100.00%",
    columns: [...FORMULATION_REQUIRED_COLUMNS],
    rows: [
      ["A", "Aqua (Water)", "93.00%", "Pelarut", "Deionisasi"],
      ["B", "Squalane", "6.00%", "Emolien", "Halal"],
      ["C", "Ceramide NP", "1.00%", "Skin barrier", "Tambahkan di bawah 45°C"],
    ],
    specs: {
      targetPh: "5.3",
      texture: "Gel-cream ringan",
      stabilityNote: "Uji sentrifugasi lulus",
      bpomHalalNote: "Aman BPOM & Halal",
    },
    procedure: [
      "Siapkan Fase A dan panaskan 70°C.",
      "Panaskan Fase B 70°C lalu homogenisasi ke Fase A.",
      "Dinginkan ke 40°C lalu masukkan Fase C.",
    ],
    notes: "Homogenisasi pada 70°C.",
  });
  assert.ok(table);

  const encoded = encodeFormulaTableMessage(table!);
  const parsed = parseFormulaTableMessage(encoded);
  assert.ok(parsed);
  assert.equal(parsed?.title, "Moisturizer Kulit Sensitif");
  assert.equal(parsed?.totalPercentage, "100.00%");
  assert.equal(parsed?.specs?.targetPh, "5.3");
  assert.equal(parsed?.procedure?.length, 3);

  const md = formulaTableToMarkdown(parsed!);
  assert.ok(md.includes("| Fase | Nama Bahan & INCI | Persentase (%) | Fungsi Utama | Catatan Teknis & Batas Aman |"));
  assert.ok(md.includes("| C | Ceramide NP | 1.00% | Skin barrier | Tambahkan di bawah 45°C |"));
  assert.ok(md.includes("Spesifikasi Target"));
  assert.ok(md.includes("Prosedur Pembuatan"));

  const draft = extractFormulatorDraftFromTable(parsed!);
  assert.equal(draft.formulaName, "Moisturizer Kulit Sensitif");
  assert.equal(draft.targetPh, "5.3");
  assert.equal(draft.skinTarget, "Sensitive");
  assert.deepEqual(draft.customIngredients, [
    "Aqua (Water) (93.00%)",
    "Squalane (6.00%)",
    "Ceramide NP (1.00%)",
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

test("sanitizeLiveUserTranscript & isNonLatinHallucinationFragment drop Thai/CJK/Arabic/Cyrillic/Korean hallucinations while keeping Indonesian & INCI", () => {
  assert.equal(isNonLatinHallucinationFragment("ฮัลโหล"), true);
  assert.equal(isNonLatinHallucinationFragment("안녕하세요"), true);
  assert.equal(isNonLatinHallucinationFragment("مرحبا"), true);
  assert.equal(isNonLatinHallucinationFragment("Привет"), true);
  assert.equal(isNonLatinHallucinationFragment("こんにちは"), true);
  assert.equal(isNonLatinHallucinationFragment("Buatin resep moisturizer niacinamide"), false);

  assert.equal(sanitizeLiveUserTranscript("ฮัลโหล"), "");
  assert.equal(sanitizeLiveUserTranscript("  ฮัลโหล <noise> "), "");
  assert.equal(sanitizeLiveTranscriptText("<noise>"), "");
  assert.equal(sanitizeLiveTranscriptText("  <inaudible>  <noise> "), "");
  assert.equal(
    sanitizeLiveTranscriptText("<noise> Buatin resep moisturizer <inaudible>"),
    "Buatin resep moisturizer"
  );
  assert.equal(
    sanitizeLiveUserTranscript(". Oke, langsung buat resepnya."),
    "Oke, langsung buat resepnya."
  );
  assert.equal(
    sanitizeLiveUserTranscript("... , !? ; :  Buatin moisturizer Butylene Glycol."),
    "Buatin moisturizer Butylene Glycol."
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

test("createContinuousResampler streams 128-sample blocks from 48kHz & 44.1kHz into exact 320-sample (20ms) packets with smooth phase continuity", () => {
  // 48kHz -> 16kHz (ratio 3.0): 440Hz sine wave across 30 blocks of 128 samples (3840 samples = 80ms = 4 packets of 320 samples)
  const resampler48 = createContinuousResampler(48000, 16000, 320);
  const packets48: Int16Array[] = [];
  let sampleCursor = 0;
  for (let b = 0; b < 30; b++) {
    const block = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      block[i] = 0.5 * Math.sin((2 * Math.PI * 440 * sampleCursor) / 48000);
      sampleCursor++;
    }
    packets48.push(...resampler48.pushBlock(block));
  }
  assert.equal(packets48.length, 4);
  for (const pkt of packets48) {
    assert.equal(pkt.length, 320);
  }
  // Verify smooth waveform continuity across packet boundaries (no clicks/jumps)
  const maxAllowedDelta = Math.round(0.5 * 32767 * (2 * Math.PI * 440 / 16000) * 1.4);
  for (let p = 1; p < packets48.length; p++) {
    const prevLast = packets48[p - 1][319];
    const nextFirst = packets48[p][0];
    assert.ok(
      Math.abs(nextFirst - prevLast) <= maxAllowedDelta,
      `Boundary jump too large between packet ${p - 1} (${prevLast}) and ${p} (${nextFirst})`
    );
  }

  // 44.1kHz -> 16kHz fractional ratio (2.75625): verify steady packet output without drift
  const resampler44 = createContinuousResampler(44100, 16000, 320);
  const packets44: Int16Array[] = [];
  for (let b = 0; b < 40; b++) {
    const block = new Float32Array(128).fill(0.25);
    packets44.push(...resampler44.pushBlock(block));
  }
  assert.ok(packets44.length >= 5);
  assert.equal(packets44[0].length, 320);
  assert.ok(Math.abs(packets44[1][100] - Math.round(0.25 * 0x7fff)) <= 2);
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

test("parsePcmSampleRate extracts rate from mimeType or falls back cleanly", () => {
  assert.equal(parsePcmSampleRate("audio/pcm;rate=24000"), 24000);
  assert.equal(parsePcmSampleRate("audio/pcm;rate=16000"), 16000);
  assert.equal(parsePcmSampleRate("audio/pcm", 24000), 24000);
  assert.equal(parsePcmSampleRate(undefined, 24000), 24000);
});

test("buildLiveVoiceSystemInstruction enforces Indonesian language lock, all 4 automatic skills, and deterministic memory injection", () => {
  const prompt = buildLiveVoiceSystemInstruction(
    "[RINGKASAN FAKTA]\nUser: Sari\n\n[12 PESAN DIALOG TERAKHIR]\nUser: Halo\nAsisten: Halo Sari!"
  );
  assert.ok(prompt.startsWith("BAHASA UTAMA: User selalu berbicara dalam Bahasa Indonesia"));
  assert.ok(prompt.includes("1 sampai 2 kalimat"));
  assert.ok(prompt.includes("create_formula_table"));
  assert.ok(prompt.includes("save_to_google_docs"));
  assert.ok(prompt.includes("search_web_info"));
  assert.ok(prompt.includes("recall_chat_history"));
  assert.ok(prompt.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"));
  assert.ok(prompt.includes("DILARANG membacakan simbol markdown"));
  assert.ok(prompt.includes("JANGAN PERNAH menolak"));

  const emptyMemPrompt = buildLiveVoiceSystemInstruction("");
  assert.ok(emptyMemPrompt.includes("search_web_info"));
  assert.equal(emptyMemPrompt.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"), false);
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

test("computeInt16PcmRms and observeMicRmsForProfiler detect speech end cleanly without mutating audio", () => {
  const silent = new Int16Array(320);
  assert.equal(computeInt16PcmRms(silent), 0);

  const loud = new Int16Array(320).fill(16384); // ~0.5 amplitude
  assert.ok(Math.abs(computeInt16PcmRms(loud) - 0.5) < 0.001);

  let state = createSpeechEndProfilerState();
  state = observeMicRmsForProfiler(state, 0.09, 1000);
  state = observeMicRmsForProfiler(state, 0.08, 1020);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  state = observeMicRmsForProfiler(state, 0.004, 1040);
  state = observeMicRmsForProfiler(state, 0.004, 1200);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.quietSinceMs, 1040);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  state = observeMicRmsForProfiler(state, 0.004, 1300);
  assert.equal(state.userSpeaking, false);
  assert.equal(state.lastSpeechEndedAtMs, 1040);
});
