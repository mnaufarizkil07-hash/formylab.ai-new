import test from "node:test";
import assert from "node:assert/strict";
import {
  LIVE_ECHO_GUARD_TAIL_MS,
  LIVE_FSM_STATUS_LABELS,
  LIVE_HIGHPASS_CUTOFF_HZ,
  LIVE_HIGHPASS_Q,
  LIVE_HOTSWAP_TARGET_TURN,
  LIVE_INPUT_CHUNK_SAMPLES,
  LIVE_INPUT_HANG_TIME_MS,
  LIVE_INPUT_MIN_SPEECH_RMS,
  LIVE_INPUT_NOISE_CALIBRATION_MS,
  LIVE_INPUT_NOISE_FLOOR_INITIAL,
  LIVE_INPUT_NOISE_FLOOR_MAX,
  LIVE_INPUT_NOISE_FLOOR_MIN,
  LIVE_INPUT_NOISE_MULTIPLIER,
  LIVE_INPUT_ONSET_FRAMES,
  LIVE_INPUT_PREROLL_MS,
  LIVE_INPUT_QUIET_ATTENUATION,
  LIVE_INPUT_RMS_REPORT_INTERVAL_MS,
  LIVE_MAX_AUTO_RECONNECTS,
  LIVE_MEMORY_RECENT_MESSAGES,
  LIVE_NATIVE_AUDIO_MODELS,
  LIVE_PLAYBACK_FADE_IN_MS,
  LIVE_PLAYBACK_FADE_OUT_MS,
  LIVE_PLAYBACK_MAX_PREBUFFER_MS,
  LIVE_PLAYBACK_PREBUFFER_MS,
  LIVE_PLAYBACK_PREBUFFER_SAMPLES,
  LIVE_PLAYBACK_RING_SECONDS,
  LIVE_PLAYBACK_SAMPLE_RATE,
  LIVE_PLAYBACK_UNDERRUN_BUMP_MS,
  LIVE_PLAYBACK_UNDERRUN_FADEOUT_MS,
  LIVE_SPEECH_QUIET_CONFIRM_MS,
  LIVE_STANDBY_MAX_AGE_MS,
  LIVE_STANDBY_PREWARM_TURN,
  LIVE_STATUS_LABELS,
  LIVE_TABLE_DEDUP_WINDOW_MS,
  LIVE_TOOL_RECOVERY_MS,
  LIVE_TOOL_TIMEOUT_MS,
  LIVE_TRANSCRIPT_THROTTLE_MS,
  LIVE_TURN_WATCHDOG_MS,
  LIVE_VOICE_OPTIONS,
  LIVE_VOICE_SWITCH_SETTLE_MS,
  type LiveVoiceName,
  appendTranscriptFragment,
  base64PcmToFloat32,
  buildConversationMemorySummary,
  buildDeterministicMemoryPrompt,
  buildLiveVoiceFunctionDeclarations,
  buildLiveVoiceSystemInstruction,
  classifyLiveVoicePillars,
  computeInt16PcmRms,
  createAdaptiveSoftAttenuator,
  createContinuousResampler,
  createLiveVoiceConfig,
  createPlaybackRingBufferEngine,
  createSpeechEndProfilerState,
  downsampleFloat32ToInt16Pcm,
  extractLatestFormulaTableFromMessages,
  extractLocalFactSummaryFallback,
  formatLiveConnectionError,
  formatTodayIndonesianDateWib,
  getLiveThinkingConfigForModel,
  getScopedChatStorageKey,
  getVoiceMemoryStorageKey,
  hasGoogleSearchGrounding,
  hasMeaningfulAssistantText,
  hasNonLatinScript,
  int16PcmToBase64,
  isDuplicateFormulaTableRequest,
  isNonLatinHallucinationFragment,
  isValidAutoSessionTitle,
  observeMicRmsForProfiler,
  parsePcmSampleRate,
  recallChatHistoryLocal,
  sanitizeLiveTranscriptText,
  sanitizeLiveUserTranscript,
  sanitizeSidebarSessionTitle,
  sanitizeUserTranscript,
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

test("Live Voice constants match unified stability tuning (70Hz highpass, 85ms/2040-sample adaptive prebuffer, 200ms echo tail, 60ms onset, 160ms pre-roll, 600ms hang-time, 0.012x quiet attenuation, 80ms switch settle, 6s table dedup)", () => {
  assert.equal(LIVE_INPUT_CHUNK_SAMPLES, 320); // exact 20ms @ 16kHz
  assert.equal(LIVE_HIGHPASS_CUTOFF_HZ, 70);
  assert.equal(LIVE_HIGHPASS_Q, 0.7);
  assert.equal(LIVE_INPUT_NOISE_CALIBRATION_MS, 300);
  assert.equal(LIVE_INPUT_NOISE_FLOOR_INITIAL, 0.008);
  assert.equal(LIVE_INPUT_NOISE_FLOOR_MIN, 0.004);
  assert.equal(LIVE_INPUT_NOISE_FLOOR_MAX, 0.022);
  assert.equal(LIVE_INPUT_NOISE_MULTIPLIER, 2.8);
  assert.equal(LIVE_INPUT_MIN_SPEECH_RMS, 0.028);
  assert.equal(LIVE_INPUT_ONSET_FRAMES, 3); // 60ms onset confirmation
  assert.equal(LIVE_INPUT_PREROLL_MS, 160);
  assert.equal(LIVE_INPUT_HANG_TIME_MS, 600);
  assert.equal(LIVE_INPUT_QUIET_ATTENUATION, 0.012);
  assert.equal(LIVE_INPUT_RMS_REPORT_INTERVAL_MS, 60);

  assert.equal(LIVE_PLAYBACK_SAMPLE_RATE, 24000);
  assert.equal(LIVE_PLAYBACK_PREBUFFER_MS, 85);
  assert.equal(LIVE_PLAYBACK_PREBUFFER_SAMPLES, 2040); // exact 85ms @ 24kHz
  assert.equal(LIVE_PLAYBACK_UNDERRUN_BUMP_MS, 120);
  assert.equal(LIVE_PLAYBACK_MAX_PREBUFFER_MS, 140);
  assert.equal(LIVE_PLAYBACK_UNDERRUN_FADEOUT_MS, 3);
  assert.equal(LIVE_PLAYBACK_RING_SECONDS, 30);
  assert.equal(LIVE_PLAYBACK_FADE_IN_MS, 3);
  assert.equal(LIVE_PLAYBACK_FADE_OUT_MS, 5);

  assert.equal(LIVE_TRANSCRIPT_THROTTLE_MS, 80);
  assert.equal(LIVE_ECHO_GUARD_TAIL_MS, 200);
  assert.equal(LIVE_VOICE_SWITCH_SETTLE_MS, 80);
  assert.equal(LIVE_TABLE_DEDUP_WINDOW_MS, 6_000);
  assert.equal(LIVE_SPEECH_QUIET_CONFIRM_MS, 180);
  assert.equal(LIVE_STANDBY_PREWARM_TURN, 7);
  assert.equal(LIVE_HOTSWAP_TARGET_TURN, 8);
  assert.equal(LIVE_STANDBY_MAX_AGE_MS, 150_000);
  assert.equal(LIVE_TURN_WATCHDOG_MS, 10_000);
  assert.equal(LIVE_TOOL_RECOVERY_MS, 8_000);
  assert.equal(LIVE_TOOL_TIMEOUT_MS, 20_000);
  assert.equal(LIVE_MAX_AUTO_RECONNECTS, 2);
  assert.equal(LIVE_MEMORY_RECENT_MESSAGES, 16);

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

test("createLiveVoiceConfig produces 100% identical model, VAD, prebuffer, systemInstruction, and 4 tools across Aoede, Zephyr, Kore, and Puck", () => {
  const fixedDate = new Date("2026-04-12T05:00:00Z");
  const voices: LiveVoiceName[] = ["Aoede", "Zephyr", "Kore", "Puck"];
  const configs = voices.map((v) =>
    createLiveVoiceConfig(v, {
      memorySummary: "Nama user: Rina.",
      now: fixedDate,
    })
  );

  const base = configs[0];
  assert.equal(base.model, LIVE_NATIVE_AUDIO_MODELS[0]);
  assert.equal(base.playbackPrebufferMs, 85);
  assert.equal(base.echoGuardTailMs, 200);
  assert.deepEqual(base.thinkingConfig, { thinkingBudget: 0 });
  assert.equal(
    base.wsRealtimeInputConfig?.automaticActivityDetection.startOfSpeechSensitivity,
    "START_SENSITIVITY_HIGH"
  );
  assert.equal(
    base.wsRealtimeInputConfig?.automaticActivityDetection.silenceDurationMs,
    180
  );

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i];
    assert.equal(cfg.voiceName, voices[i]);
    assert.equal(cfg.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, voices[i]);
    assert.deepEqual(cfg.models, base.models);
    assert.equal(cfg.model, base.model);
    assert.equal(cfg.systemInstruction, base.systemInstruction);
    assert.deepEqual(cfg.tools, base.tools);
    assert.deepEqual(cfg.thinkingConfig, base.thinkingConfig);
    assert.deepEqual(cfg.wsRealtimeInputConfig, base.wsRealtimeInputConfig);
    assert.equal(cfg.playbackPrebufferMs, base.playbackPrebufferMs);
    assert.equal(cfg.echoGuardTailMs, base.echoGuardTailMs);
  }
});

test("getLiveThinkingConfigForModel returns thinkingBudget:0 for gemini-2.5 native audio and thinkingLevel:minimal for gemini-3.*-live", () => {
  assert.deepEqual(
    getLiveThinkingConfigForModel("gemini-2.5-flash-native-audio-preview-12-2025"),
    { thinkingBudget: 0 }
  );
  assert.deepEqual(
    getLiveThinkingConfigForModel("gemini-2.5-flash-native-audio-preview-09-2025"),
    { thinkingBudget: 0 }
  );
  assert.deepEqual(
    getLiveThinkingConfigForModel("gemini-3.8-live"),
    { thinkingLevel: "minimal" }
  );
  assert.deepEqual(
    getLiveThinkingConfigForModel("gemini-3.1-flash-live-preview"),
    { thinkingLevel: "minimal" }
  );
  assert.equal(getLiveThinkingConfigForModel("unknown-model"), undefined);
});

test("createAdaptiveSoftAttenuator continuously adapts noiseFloor, blocks room hum (RMS 0.015) & 1-2 frame clicks, requires 60ms (3-frame) onset, attenuates quiet to 0.012x, and emits edge-triggered gate events once", () => {
  const attenuator = createAdaptiveSoftAttenuator();
  const roomHumFrame = new Float32Array(320).fill(0.015);
  const speechFrame = new Float32Array(320).fill(0.09);

  // 40 frames (800ms) of persistent room hum (RMS 0.015):
  // noiseFloor adapts upward toward ~0.014, threshold rises > 0.035, gate NEVER opens, ZERO gate events!
  let gateStarts = 0;
  let gateEnds = 0;
  let lastHumPcm: Int16Array | null = null;
  for (let i = 0; i < 40; i++) {
    const res = attenuator.processFrame(roomHumFrame);
    assert.equal(res.gateOpen, false);
    assert.equal(res.gateEvent, null);
    assert.equal(res.packets.length, 1);
    lastHumPcm = res.packets[0].pcm;
  }
  assert.ok(lastHumPcm);
  // Strongly attenuated to ~0.012x (0.015 * 0.012 = 0.00018 -> silent to Server VAD!)
  const humSampleVal = Math.abs(lastHumPcm![200]) / 32767;
  assert.ok(humSampleVal < 0.0004, `Expected strong 0.012x attenuation (<0.0004), got ${humSampleVal}`);

  // Brief 2-frame click/pop (40ms < 60ms onset): MUST NOT open gate!
  assert.equal(attenuator.processFrame(speechFrame).gateOpen, false);
  assert.equal(attenuator.processFrame(speechFrame).gateOpen, false);
  assert.equal(attenuator.processFrame(roomHumFrame).gateOpen, false);

  // Real speech ("halo"): 3 consecutive frames >= threshold -> opens gate ONCE on frame #3 & flushes 160ms pre-roll (8 frames) + live!
  const f1 = attenuator.processFrame(speechFrame);
  assert.equal(f1.gateOpen, false);
  assert.equal(f1.gateEvent, null);
  const f2 = attenuator.processFrame(speechFrame);
  assert.equal(f2.gateOpen, false);
  assert.equal(f2.gateEvent, null);
  const f3 = attenuator.processFrame(speechFrame);
  assert.equal(f3.gateOpen, true);
  assert.equal(f3.gateEvent?.type, "speechStart");
  gateStarts += 1;
  assert.equal(f3.packets.length, 9); // 8 pre-roll (160ms, including f1 & f2!) + 1 live
  assert.equal(f3.packets.filter((p) => p.isPreRoll).length, 8);
  const liveSampleVal = Math.abs(f3.packets[8].pcm[200]) / 32767;
  assert.ok(Math.abs(liveSampleVal - 0.09) < 0.004);

  // After speech stops, holds 1.0x for 600ms hang-time (30 frames @ 20ms) then emits speechEnd ONCE
  for (let i = 0; i < 29; i++) {
    const hangRes = attenuator.processFrame(roomHumFrame);
    assert.equal(hangRes.gateOpen, true, `Expected gateOpen during hang-time frame ${i}`);
    assert.equal(hangRes.gateEvent, null);
  }
  const closeRes = attenuator.processFrame(roomHumFrame);
  assert.equal(closeRes.gateOpen, false);
  assert.equal(closeRes.gateEvent?.type, "speechEnd");
  gateEnds += 1;

  // Subsequent quiet frames NEVER emit duplicate speechEnd events (eliminates '(28) Speech ended' spam!)
  for (let i = 0; i < 25; i++) {
    const quietAfter = attenuator.processFrame(roomHumFrame);
    assert.equal(quietAfter.gateOpen, false);
    assert.equal(quietAfter.gateEvent, null);
  }
  assert.equal(gateStarts, 1);
  assert.equal(gateEnds, 1);
});

test("createPlaybackRingBufferEngine enforces 85ms (2040-sample) initial prebuffer, Adaptive Underrun Cushion (3ms micro fade-out + 85->120->140ms bump), short-reply flush, and 5ms stop fade-out", () => {
  const engine = createPlaybackRingBufferEngine(24000, 85, 30);
  assert.equal(engine.getPreBufferMs(), 85);

  // Push 1000 samples (< 2040 prebuffer threshold): output stays silent until 85ms or turnComplete
  engine.push(new Float32Array(1000).fill(0.5));
  const beforePrebuffer = engine.pullBlock(128);
  assert.equal(beforePrebuffer.playing, false);
  assert.equal(beforePrebuffer.drainedEvent, false);
  assert.equal(beforePrebuffer.output[0], 0);
  assert.equal(beforePrebuffer.bufferedSamples, 1000);

  // Push 1100 more samples (total 2100 >= 2040): starts playing with 3ms (72-sample) fade-in ramp
  engine.push(new Float32Array(1100).fill(0.5));
  const firstPlayBlock = engine.pullBlock(128);
  assert.equal(firstPlayBlock.playing, true);
  assert.equal(firstPlayBlock.drainedEvent, false);
  assert.equal(firstPlayBlock.output[0], 0);
  assert.ok(firstPlayBlock.output[1] > 0 && firstPlayBlock.output[1] < 0.05);
  assert.ok(Math.abs(firstPlayBlock.output[100] - 0.5) < 0.001);

  // Drain buffer WITHOUT markTurnComplete (simulated mid-sentence network jitter underrun):
  // MUST perform 3ms micro fade-out (non-zero decaying tail, NOT hard drop to 0) AND bump preBufferMs 85 -> 120ms!
  let underrunEvents = 0;
  let lastUnderrunOutput: Float32Array | null = null;
  while (engine.getBufferedSamples() > 0) {
    const step = engine.pullBlock(128);
    assert.equal(step.drainedEvent, false); // turnComplete not received yet!
    if (step.underrunEvent) {
      underrunEvents += 1;
      lastUnderrunOutput = step.output;
    }
  }
  assert.equal(underrunEvents, 1);
  assert.equal(engine.getPreBufferMs(), 120);
  assert.ok(lastUnderrunOutput);

  // A second underrun caps at 140ms (2880+ samples needed at 120ms first)
  engine.push(new Float32Array(2900).fill(0.4));
  while (engine.getBufferedSamples() > 0) {
    engine.pullBlock(128);
  }
  assert.equal(engine.getPreBufferMs(), 140);

  // When server finally sends turnComplete after buffer emptied, next pull emits drainedEvent ONCE
  engine.markTurnComplete();
  const afterComplete = engine.pullBlock(128);
  assert.equal(afterComplete.drainedEvent, true);
  assert.equal(engine.pullBlock(128).drainedEvent, false);

  // Short reply (< 140ms) stays held until markTurnComplete(), then flushes immediately
  engine.push(new Float32Array(256).fill(0.4));
  assert.equal(engine.pullBlock(128).playing, false);
  engine.markTurnComplete();
  const shortFirst = engine.pullBlock(128);
  assert.equal(shortFirst.playing, true);
  assert.ok(shortFirst.output[127] > 0.35);
  const shortSecond = engine.pullBlock(128);
  assert.equal(shortSecond.drainedEvent, true);

  // Barge-in stopWithFadeOut() ramps smoothly down to 0 and clears buffer
  engine.push(new Float32Array(3500).fill(0.6));
  assert.equal(engine.pullBlock(128).playing, true);
  engine.stopWithFadeOut();
  const fadeBlock = engine.pullBlock(128);
  assert.ok(fadeBlock.output[0] > fadeBlock.output[60]);
  assert.equal(fadeBlock.output[127], 0);
  assert.equal(engine.getBufferedSamples(), 0);
});

test("hasMeaningfulAssistantText rejects empty '...' / punctuation-only AI bubbles while keeping real responses", () => {
  assert.equal(hasMeaningfulAssistantText(""), false);
  assert.equal(hasMeaningfulAssistantText("   "), false);
  assert.equal(hasMeaningfulAssistantText("..."), false);
  assert.equal(hasMeaningfulAssistantText("…"), false);
  assert.equal(hasMeaningfulAssistantText(". , ! ? - —"), false);
  assert.equal(hasMeaningfulAssistantText("<noise> ... "), false);
  assert.equal(hasMeaningfulAssistantText("Oke siap!"), true);
  assert.equal(hasMeaningfulAssistantText("Halo, mau racik serum apa hari ini?"), true);
});

test("isDuplicateFormulaTableRequest enforces 6-second deduplication and in-flight guard against duplicate FormulaTableCard renders", () => {
  const baseEntry = {
    topic: "Moisturizer Barrier Kulit Sensitif dengan Niacinamide & Ceramide",
    tableType: "formulation",
    atMs: 10_000,
  };

  // In-flight guard always blocks concurrent duplicate call
  assert.equal(
    isDuplicateFormulaTableRequest(
      null,
      { topic: "Serum Vitamin C", tableType: "formulation", nowMs: 10_500 },
      true
    ),
    true
  );

  // Same/near-identical topic within < 6,000ms is blocked
  assert.equal(
    isDuplicateFormulaTableRequest(
      baseEntry,
      {
        topic: "Moisturizer Barrier Kulit Sensitif Niacinamide",
        tableType: "formulation",
        nowMs: 14_500,
      },
      false
    ),
    true
  );

  // Different topic within 6s is allowed
  assert.equal(
    isDuplicateFormulaTableRequest(
      baseEntry,
      {
        topic: "Sunscreen Gel SPF 50 PA++++",
        tableType: "formulation",
        nowMs: 12_000,
      },
      false
    ),
    false
  );

  // Same topic AFTER >= 6,000ms is allowed again
  assert.equal(
    isDuplicateFormulaTableRequest(
      baseEntry,
      {
        topic: "Moisturizer Barrier Kulit Sensitif dengan Niacinamide & Ceramide",
        tableType: "formulation",
        nowMs: 16_000,
      },
      false
    ),
    false
  );
});

test("appendTranscriptFragment merges chunks cleanly without glued words like fokuskan?Atau or tertentuSorry", () => {
  assert.equal(
    appendTranscriptFragment("fokuskan?", "Atau mungkin"),
    "fokuskan? Atau mungkin"
  );
  assert.equal(
    appendTranscriptFragment("ada tren tertentu", "Sorry kepotong."),
    "ada tren tertentu Sorry kepotong."
  );
  assert.equal(
    appendTranscriptFragment("Halo, mau bikin", " serum niacinamide."),
    "Halo, mau bikin serum niacinamide."
  );
  assert.equal(
    appendTranscriptFragment("Moisturizer", ", cocok untuk kulit sensitif."),
    "Moisturizer, cocok untuk kulit sensitif."
  );
  assert.equal(appendTranscriptFragment("", "Oke siap."), "Oke siap.");
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

  const searchTool = decls.find((d) => d.name === "search_web_info");
  assert.ok(searchTool?.description?.includes("siapa pejabat/presiden saat ini"));
  assert.ok(searchTool?.description?.includes("mengoreksi fakta"));

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
  assert.equal(balanced.rows.length, 5);
  assert.equal(balanced.totalPercentage, "100.00%");
  assert.equal(balanced.rows[0][2], "84.20%");

  const numericSum = balanced.rows.reduce(
    (sum, r) => sum + parseFloat(r[2].replace("%", "")),
    0
  );
  assert.ok(Math.abs(numericSum - 100) < 0.001);

  const overRows: string[][] = [
    ["A", "Water (Aqua)", "85%", "Solvent", "-"],
    ["B", "Butylene Glycol", "10%", "Humectant", "-"],
    ["B", "Caprylic/Capric Triglyceride", "12%", "Emollient", "-"],
  ];
  const balancedOver = validateAndBalanceFormulationRows(FORMULATION_REQUIRED_COLUMNS, overRows);
  assert.equal(balancedOver.totalPercentage, "100.00%");
  assert.equal(balancedOver.rows[0][2], "78.00%");
});

test("buildDeterministicMemoryPrompt emits [RINGKASAN FAKTA JANGKA PANJANG], [TABEL FORMULA AKTIF] (with auto-recovery), and [16 PESAN DIALOG TERAKHIR] using Formylab AI label", () => {
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

  const recentMessages = [
    ...Array.from({ length: 18 }, (_, idx) => ({
      role: (idx % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content:
        idx === 4
          ? "安静。"
          : `Pesan ke-${idx + 1} tentang formula moisturizer sensitif.`,
    })),
    {
      role: "assistant" as const,
      content: encodeFormulaTableMessage(table!),
    },
  ];

  const recovered = extractLatestFormulaTableFromMessages(recentMessages);
  assert.equal(recovered?.title, "Moisturizer Barrier Kulit Sensitif");

  const prompt = buildDeterministicMemoryPrompt({
    longTermSummary: "Nama user: Nadia. Fokus: moisturizer barrier kulit sensitif.",
    latestFormulaTable: null,
    recentMessages,
  });

  assert.ok(prompt.includes("[RINGKASAN FAKTA JANGKA PANJANG]"));
  assert.ok(prompt.includes("Nama user: Nadia"));
  assert.ok(prompt.includes("[TABEL FORMULA AKTIF]"));
  assert.ok(prompt.includes("Moisturizer Barrier Kulit Sensitif"));
  assert.ok(prompt.includes("Alpha-Arbutin"));
  assert.ok(prompt.includes("[16 PESAN DIALOG TERAKHIR]"));
  assert.equal(prompt.includes("安静"), false);
  assert.equal(prompt.includes("Pesan ke-1 "), false);
  assert.ok(prompt.includes("User: Pesan ke-7"));
  assert.ok(prompt.includes("Formylab AI: Pesan ke-8"));

  const localSummary = extractLocalFactSummaryFallback(
    [
      { role: "user", content: "Halo nama saya Bima, aku mau bikin serum kulit sensitif pakai Niacinamide dan Ceramide." },
      { role: "assistant", content: "Siap Bima, kita racik serum yang lembut." },
    ],
    table
  );
  assert.ok(localSummary.includes("Bima"));
  assert.ok(localSummary.includes("Niacinamide"));
  assert.ok(localSummary.includes("Moisturizer Barrier Kulit Sensitif"));
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
    { turn: 1, sessionIndex: 1, firstAudioMs: 500, queueDelayMs: 45, toolsCalled: "-", hotSwapped: "tidak" },
    { turn: 2, sessionIndex: 1, firstAudioMs: 600, queueDelayMs: 45, toolsCalled: "create_formula_table", hotSwapped: "tidak" },
    { turn: 3, sessionIndex: 1, firstAudioMs: 700, queueDelayMs: 45, toolsCalled: "-", hotSwapped: "tidak" },
    { turn: 4, sessionIndex: 2, firstAudioMs: 520, queueDelayMs: 45, toolsCalled: "save_to_google_docs", hotSwapped: "ya" },
    { turn: 5, sessionIndex: 2, firstAudioMs: 580, queueDelayMs: 45, toolsCalled: "-", hotSwapped: "tidak" },
  ]);

  assert.equal(summary.totalTurns, 5);
  assert.equal(summary.avgFirstAudioTurn1To3Ms, 600);
  assert.equal(summary.avgFirstAudioTurn4PlusMs, 550);
  assert.equal(summary.hotSwapCount, 1);
});

test("sanitizeUserTranscript strictly rejects ANY non-Latin script (including 安静。 and mixed strings) while keeping clean Indonesian & INCI", () => {
  assert.equal(hasNonLatinScript("安静。"), true);
  assert.equal(hasNonLatinScript("halo 安静"), true);
  assert.equal(hasNonLatinScript("ฮัลโหล"), true);
  assert.equal(hasNonLatinScript("안녕하세요"), true);
  assert.equal(hasNonLatinScript("مرحبا"), true);
  assert.equal(hasNonLatinScript("Привет"), true);
  assert.equal(hasNonLatinScript("こんにちは"), true);
  assert.equal(hasNonLatinScript("Buatin resep moisturizer niacinamide 5%"), false);

  assert.equal(isNonLatinHallucinationFragment("安静。"), true);
  assert.equal(sanitizeUserTranscript("安静。"), "");
  assert.equal(sanitizeUserTranscript("halo 安静"), "");
  assert.equal(sanitizeUserTranscript("ฮัลโหล"), "");
  assert.equal(sanitizeUserTranscript("  ฮัลโหล <noise> "), "");
  assert.equal(sanitizeLiveUserTranscript("安静。"), "");
  assert.equal(sanitizeLiveTranscriptText("<noise>"), "");
  assert.equal(sanitizeLiveTranscriptText("  <inaudible>  <noise> "), "");
  assert.equal(
    sanitizeLiveTranscriptText("<noise> Buatin resep moisturizer <inaudible>"),
    "Buatin resep moisturizer"
  );
  assert.equal(
    sanitizeUserTranscript(". Oke, langsung buat resepnya."),
    "Oke, langsung buat resepnya."
  );
  assert.equal(
    sanitizeUserTranscript("... , !? ; :  Buatin moisturizer Butylene Glycol."),
    "Buatin moisturizer Butylene Glycol."
  );
  assert.equal(sanitizeUserTranscript("... <noise> , "), "");
});

test("isValidAutoSessionTitle & sanitizeSidebarSessionTitle reject short mumbles and clean legacy non-Latin titles", () => {
  assert.equal(isValidAutoSessionTitle("Oh."), false);
  assert.equal(isValidAutoSessionTitle("Halo."), false);
  assert.equal(isValidAutoSessionTitle("Oke."), false);
  assert.equal(isValidAutoSessionTitle("安静。"), false);
  assert.equal(isValidAutoSessionTitle("hmm"), false);
  assert.equal(isValidAutoSessionTitle("Tren bahan aktif skincare 2026"), true);

  assert.equal(
    sanitizeSidebarSessionTitle("安静。", [
      { role: "user", content: "安静。" },
      { role: "user", content: "Halo." },
      { role: "user", content: "Buatin resep moisturizer untuk kulit sensitif" },
    ]),
    "Buatin resep moisturizer untuk kulit s..."
  );

  assert.equal(
    sanitizeSidebarSessionTitle("安静。", [
      { role: "user", content: "Oh." },
    ]),
    "Obrolan Baru"
  );

  assert.equal(
    sanitizeSidebarSessionTitle("Formulasi Serum Barrier"),
    "Formulasi Serum Barrier"
  );
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
  const maxAllowedDelta = Math.round(0.5 * 32767 * ((2 * Math.PI * 440) / 16000) * 1.4);
  for (let p = 1; p < packets48.length; p++) {
    const prevLast = packets48[p - 1][319];
    const nextFirst = packets48[p][0];
    assert.ok(
      Math.abs(nextFirst - prevLast) <= maxAllowedDelta,
      `Boundary jump too large between packet ${p - 1} (${prevLast}) and ${p} (${nextFirst})`
    );
  }

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

test("buildLiveVoiceSystemInstruction injects dynamic WIB today date on line 1, enforces strict search_web_info rules, and keeps base prompt concise", () => {
  const fixedDate = new Date("2026-04-12T05:00:00Z"); // Sunday, 12 April 2026 in WIB
  const expectedDate = formatTodayIndonesianDateWib(fixedDate);
  const emptyMemPrompt = buildLiveVoiceSystemInstruction("", fixedDate);
  const baseWordCount = emptyMemPrompt.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(
    baseWordCount <= 230,
    `Expected compact base systemInstruction <= 230 words, got ${baseWordCount}`
  );
  assert.ok(
    emptyMemPrompt.startsWith(`Waktu saat ini: ${expectedDate} (WIB).`),
    `Expected top date line, got: ${emptyMemPrompt.slice(0, 80)}`
  );
  assert.ok(emptyMemPrompt.includes("ATURAN BAHASA MUTLAK: User selalu berbicara dalam Bahasa Indonesia"));
  assert.ok(emptyMemPrompt.includes("1 sampai 2 kalimat"));
  assert.ok(emptyMemPrompt.includes("WAJIB panggil tool `search_web_info` terlebih dahulu sebelum menjawab"));
  assert.ok(emptyMemPrompt.includes("DILARANG KERAS mengatakan 'Berdasarkan informasi terkini...'"));
  assert.ok(emptyMemPrompt.includes("create_formula_table"));
  assert.ok(emptyMemPrompt.includes("save_to_google_docs"));
  assert.ok(emptyMemPrompt.includes("search_web_info"));
  assert.ok(emptyMemPrompt.includes("recall_chat_history"));
  assert.ok(emptyMemPrompt.includes("DILARANG membacakan simbol markdown"));
  assert.ok(emptyMemPrompt.includes("JANGAN PERNAH menolak"));
  assert.equal(emptyMemPrompt.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"), false);

  const withMemory = buildLiveVoiceSystemInstruction(
    "[RINGKASAN FAKTA JANGKA PANJANG]\nUser: Sari\n\n[16 PESAN DIALOG TERAKHIR]\nUser: Halo\nFormylab AI: Halo Sari!",
    fixedDate
  );
  assert.ok(withMemory.startsWith(`Waktu saat ini: ${expectedDate} (WIB).`));
  assert.ok(withMemory.includes("[MEMORI PERCAKAPAN SEBELUMNYA]"));
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

test("getScopedChatStorageKey and getVoiceMemoryStorageKey scope keys cleanly per user & room", () => {
  assert.equal(
    getScopedChatStorageKey("formylab_chat_sessions", "User@Example.COM"),
    "formylab_chat_sessions::user@example.com"
  );
  assert.equal(
    getScopedChatStorageKey("formylab_chat_sessions", ""),
    "formylab_chat_sessions"
  );
  assert.equal(
    getVoiceMemoryStorageKey("chat-123", "User@Example.COM"),
    "formylab_voice_memory_v1::user@example.com::chat-123"
  );
});

test("computeInt16PcmRms and observeMicRmsForProfiler fire speechStartedEvent and speechEndedEvent ONLY after real speech on active turn", () => {
  const silent = new Int16Array(320);
  assert.equal(computeInt16PcmRms(silent), 0);

  const loud = new Int16Array(320).fill(16384); // ~0.5 amplitude
  assert.ok(Math.abs(computeInt16PcmRms(loud) - 0.5) < 0.001);

  // Quiet frames before any speech MUST NOT set lastSpeechEndedAtMs or fire speechEndedEvent
  let state = createSpeechEndProfilerState();
  state = observeMicRmsForProfiler(state, 0.003, 100);
  state = observeMicRmsForProfiler(state, 0.003, 500);
  assert.equal(state.hasDetectedSpeechInTurn, false);
  assert.equal(state.speechStartedEvent, false);
  assert.equal(state.speechEndedEvent, false);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  // Normal voice ("halo") triggers speechStartedEvent once
  state = observeMicRmsForProfiler(state, 0.05, 1000);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.hasDetectedSpeechInTurn, true);
  assert.equal(state.speechStartedEvent, true);
  assert.equal(state.peakRmsInTurn, 0.05);

  state = observeMicRmsForProfiler(state, 0.09, 1020);
  assert.equal(state.speechStartedEvent, false); // edge-triggered only once per turn
  assert.equal(state.peakRmsInTurn, 0.09);

  // Quiet below threshold for 100ms (< 180ms): still waiting
  state = observeMicRmsForProfiler(state, 0.003, 1040);
  state = observeMicRmsForProfiler(state, 0.003, 1140);
  assert.equal(state.userSpeaking, true);
  assert.equal(state.speechEndedEvent, false);
  assert.equal(state.lastSpeechEndedAtMs, 0);

  // Quiet for >= 180ms: fires speechEndedEvent and locks lastSpeechEndedAtMs = 1040
  state = observeMicRmsForProfiler(state, 0.003, 1220);
  assert.equal(state.userSpeaking, false);
  assert.equal(state.speechEndedEvent, true);
  assert.equal(state.lastSpeechEndedAtMs, 1040);
});
