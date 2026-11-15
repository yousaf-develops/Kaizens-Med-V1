import React, { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Mic, MicOff, ShieldAlert, Sparkles, X } from 'lucide-react';
import { CHECKIN_HOWTO_GUIDES, SYSTEM_KNOWLEDGE } from '../data/nasaStandards';
import {
  DailyTelemetryEntry,
  EnvironmentConfig,
  SystemId,
} from '../types/telemetry';

interface CheckInDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  env: EnvironmentConfig;
  latest: DailyTelemetryEntry;
  initialSystem?: SystemId;
  onSubmitEntry: (entry: DailyTelemetryEntry, domainSummary: string, appendAsNewSol?: boolean) => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const CheckInDrawer: React.FC<CheckInDrawerProps> = ({
  isOpen,
  onClose,
  env,
  latest,
  initialSystem = 'cardio',
  onSubmitEntry,
}) => {
  const [activeTab, setActiveTab] = useState<SystemId>(initialSystem);
  const [showSimpleGuide, setShowSimpleGuide] = useState(true);
  const [appendAsNewSol, setAppendAsNewSol] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatusMsg, setVoiceStatusMsg] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Editable telemetry fields seeded from latest Sol
  const [bpSystolic, setBpSystolic] = useState(latest.bpSystolic);
  const [bpDiastolic, setBpDiastolic] = useState(latest.bpDiastolic);
  const [bpPosture, setBpPosture] = useState<'seated' | 'supine' | 'standing'>(latest.bpPosture);
  const [submaxHrBpm, setSubmaxHrBpm] = useState(latest.submaxHrBpm);
  const [restingHrBpm, setRestingHrBpm] = useState(latest.restingHrBpm);
  const [spo2Pct, setSpo2Pct] = useState(latest.spo2Pct ?? 98);
  const [vo2PeakMlKgMin, setVo2PeakMlKgMin] = useState(latest.vo2PeakMlKgMin);
  const [orthostaticSymptoms, setOrthostaticSymptoms] = useState(false);
  const [chestOrPresyncope, setChestOrPresyncope] = useState(false);

  const [aredCompleted, setAredCompleted] = useState(latest.aredCompleted);
  const [hipSpineBmdPct, setHipSpineBmdPct] = useState(latest.hipSpineBmdPct);
  const [femoralNeckBmdPct, setFemoralNeckBmdPct] = useState(latest.femoralNeckBmdPct);
  const [bonePainSymptom, setBonePainSymptom] = useState(false);
  const [postLandingSymptoms, setPostLandingSymptoms] = useState(!!latest.postLandingSymptoms);

  const [strengthPctBaseline, setStrengthPctBaseline] = useState(latest.strengthPctBaseline);
  const [muscleCsaPctBaseline, setMuscleCsaPctBaseline] = useState(latest.muscleCsaPctBaseline);
  const [rpe, setRpe] = useState(latest.rpe);
  const [limitingMusclePain, setLimitingMusclePain] = useState(false);

  const [iopMmHg, setIopMmHg] = useState(latest.iopMmHg);
  const [blurredVision, setBlurredVision] = useState(false);
  const [persistentHeadache, setPersistentHeadache] = useState(false);
  const [octExamOverdue, setOctExamOverdue] = useState(latest.octExamOverdue);
  const [sansCountermeasureDone, setSansCountermeasureDone] = useState(latest.sansCountermeasureDone);

  const [fluidIntakeMl, setFluidIntakeMl] = useState(latest.fluidIntakeMl);
  const [urineOutputMl, setUrineOutputMl] = useState(latest.urineOutputMl);
  const [caloriesKcal, setCaloriesKcal] = useState(latest.caloriesKcal);
  const [sodiumMg, setSodiumMg] = useState(latest.sodiumMg);
  const [bodyTempC, setBodyTempC] = useState(latest.bodyTempC ?? 36.8);
  const [bloodGlucoseMgDl, setBloodGlucoseMgDl] = useState(latest.bloodGlucoseMgDl ?? 96);
  const [urineDarkConcentrated, setUrineDarkConcentrated] = useState(latest.urineDarkConcentrated);
  const [renalColicSymptoms, setRenalColicSymptoms] = useState(false);
  const [nutritionSymptomsFlag, setNutritionSymptomsFlag] = useState(!!latest.nutritionSymptomsFlag);

  const [dailyDoseMsv, setDailyDoseMsv] = useState(latest.dailyDoseMsv);
  const [prodromalNausea, setProdromalNausea] = useState(false);
  const [neurologicalRedFlag, setNeurologicalRedFlag] = useState(false);
  const [commBreakdownFlag, setCommBreakdownFlag] = useState(!!latest.commBreakdownFlag);

  if (!isOpen) return null;

  // Natural-language parser for hands-free voice transcripts
  const parseVoiceTranscript = (raw: string) => {
    const lower = raw.toLowerCase();
    const matched: string[] = [];

    const bpMatch = lower.match(/(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/);
    if (bpMatch) {
      setBpSystolic(Number(bpMatch[1]));
      setBpDiastolic(Number(bpMatch[2]));
      matched.push(`BP ${bpMatch[1]}/${bpMatch[2]}`);
    }
    const restHrMatch = lower.match(/(?:resting\s*hr|resting\s*heart\s*rate|rhr|pulse)\s*[:=]?\s*(\d{2,3})/);
    if (restHrMatch) {
      setRestingHrBpm(Number(restHrMatch[1]));
      matched.push(`HR ${restHrMatch[1]} bpm`);
    } else {
      const hrMatch = lower.match(/(?:heart rate|hr|beats)\s*[:=]?\s*(\d{2,3})/);
      if (hrMatch) {
        setRestingHrBpm(Number(hrMatch[1]));
        matched.push(`HR ${hrMatch[1]} bpm`);
      }
    }

    const spo2Match = lower.match(/\b(?:spo2|oxygen|o2|blood air|blood oxygen)\b\s*[:=]?\s*(\d{2,3})/);
    if (spo2Match) {
      setSpo2Pct(Number(spo2Match[1]));
      matched.push(`Blood Oxygen ${spo2Match[1]}%`);
    }

    const tempMatch = lower.match(/\b(?:temp|temperature|heat)\b\s*[:=]?\s*(\d{2}(?:\.\d+)?)/);
    if (tempMatch) {
      setBodyTempC(Number(tempMatch[1]));
      matched.push(`Temp ${tempMatch[1]}°C`);
    }

    const glucoseMatch = lower.match(/\b(?:glucose|blood\s*sugar|sugar)\b\s*[:=]?\s*(\d{2,3})/);
    if (glucoseMatch) {
      setBloodGlucoseMgDl(Number(glucoseMatch[1]));
      matched.push(`Glucose ${glucoseMatch[1]} mg/dL`);
    }

    const fluidMatch = lower.match(/(\d{3,4})\s*(?:ml|milliliters|millilitres|water|fluid)/);
    if (fluidMatch) {
      setFluidIntakeMl(Number(fluidMatch[1]));
      matched.push(`Fluid ${fluidMatch[1]} ml`);
    }

    const rpeMatch = lower.match(/(?:rpe|effort|hardness)\s*(\d{1,2})/);
    if (rpeMatch) {
      setRpe(Math.min(10, Math.max(1, Number(rpeMatch[1]))));
      matched.push(`Effort ${rpeMatch[1]}/10`);
    }

    if (lower.includes('ared completed') || lower.includes('ared done') || lower.includes('weights done') || lower.includes('training done')) {
      setAredCompleted(true);
      matched.push('Resistance training done');
    }
    if (lower.includes('seated') || lower.includes('sitting')) setBpPosture('seated');
    if (lower.includes('standing')) setBpPosture('standing');
    if (lower.includes('supine') || lower.includes('lying down')) setBpPosture('supine');
    if (lower.includes('blurred vision') || lower.includes('blurry')) setBlurredVision(true);
    if (lower.includes('flank pain') || lower.includes('renal') || lower.includes('side pain')) setRenalColicSymptoms(true);
    if (lower.includes('dizziness') || lower.includes('presyncope') || lower.includes('dizzy')) setOrthostaticSymptoms(true);

    setVoiceStatusMsg(
      matched.length > 0
        ? `Updated: ${matched.join(' · ')}`
        : 'No measurements detected — enter your values below.'
    );
  };

  const toggleVoiceCapture = () => {
    if (voiceActive && recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceActive(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      const sample = '118 over 76 sitting, 2600 water, weights done, hardness 6';
      setVoiceTranscript(sample);
      parseVoiceTranscript(sample);
      setVoiceStatusMsg('Mic is off here; loaded a sample line for you.');
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setVoiceTranscript(text);
      parseVoiceTranscript(text);
    };
    rec.onerror = () => {
      setVoiceActive(false);
      setVoiceStatusMsg('Mic not ready; type your numbers below.');
    };
    rec.onend = () => {
      setVoiceActive(false);
    };

    recognitionRef.current = rec;
    setVoiceActive(true);
    setVoiceStatusMsg('Listening... say numbers like "118 over 76 seated, 2600 ml"');
    rec.start();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const visionSymptoms: string[] = [];
    if (blurredVision) visionSymptoms.push('Blurred vision');
    if (persistentHeadache) visionSymptoms.push('Persistent headache');

    const radiationProdromalSymptoms: string[] = [];
    if (prodromalNausea) radiationProdromalSymptoms.push('Nausea / appetite loss');

    const targetSol = appendAsNewSol ? latest.sol + 1 : latest.sol;
    const nextEntry: DailyTelemetryEntry = {
      ...latest,
      id: `sol-${targetSol}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sol: targetSol,
      dateISO: new Date().toISOString().slice(0, 10),
      hipSpineBmdPct,
      femoralNeckBmdPct,
      aredCompleted,
      bonePainSymptom,
      postLandingPhase: postLandingSymptoms ? 'Post-Landing Readapting' : latest.postLandingPhase,
      postLandingSymptoms,
      vo2PeakMlKgMin,
      submaxHrBpm,
      restingHrBpm,
      spo2Pct,
      bpSystolic,
      bpDiastolic,
      bpPosture,
      rpe,
      orthostaticSymptoms,
      chestOrPresyncope,
      strengthPctBaseline,
      muscleCsaPctBaseline,
      limitingMusclePain,
      iopMmHg,
      octExamOverdue,
      sansCountermeasureDone,
      visionSymptoms,
      fluidIntakeMl,
      urineOutputMl,
      caloriesKcal,
      sodiumMg,
      bodyTempC,
      bloodGlucoseMgDl,
      urineDarkConcentrated,
      renalColicSymptoms,
      nutritionSymptomsFlag,
      dailyDoseMsv,
      cumulativeMissionDoseMsv: Number((latest.cumulativeMissionDoseMsv + 0.1).toFixed(2)),
      dosimetryStatus: 'measured',
      dosimetryLastUpdatedHoursAgo: 0,
      radiationProdromalSymptoms,
      neurologicalRedFlag,
      commBreakdownFlag,
    };

    onSubmitEntry(
      nextEntry,
      `Day ${targetSol} ${SYSTEM_KNOWLEDGE[activeTab].shortName}: BP ${bpSystolic}/${bpDiastolic} mmHg, Fluid ${fluidIntakeMl} ml.`,
      appendAsNewSol
    );
    onClose();
  };

  const setSafeNum =
    (setter: React.Dispatch<React.SetStateAction<number>>, min?: number, max?: number) =>
    (raw: string) => {
      const val = Number(raw);
      if (!Number.isFinite(val)) return;
      const clamped =
        min !== undefined && max !== undefined
          ? Math.min(max, Math.max(min, val))
          : min !== undefined
            ? Math.max(min, val)
            : val;
      setter(clamped);
    };

  const urgentRedFlag =
    chestOrPresyncope || orthostaticSymptoms || renalColicSymptoms || neurologicalRedFlag;

  return (
    <div className="reveal-backdrop fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="reveal-drawer relative w-full max-w-xl bg-[#1D2028]/82 backdrop-blur-3xl border-l border-white/15 h-full overflow-y-auto p-6 space-y-5 shadow-[0_0_60px_rgba(0,0,0,0.65)] text-white">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              {env.label} · Day {env.currentDay}
            </div>
            <h2 className="text-xl font-display font-semibold text-white mt-0.5">
              Update Health Check
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close health check drawer"
            className="p-2 rounded-full btn-mono-glass cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Voice Logger */}
        <div className="rounded-2xl glass-3d-sub p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-white">
              Voice Entry
            </span>
            <button
              type="button"
              onClick={toggleVoiceCapture}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                voiceActive
                  ? 'bg-[#FF453A] text-white shadow-[0_4px_14px_rgba(255,69,58,0.45)]'
                  : 'btn-mono-glass'
              }`}
            >
              {voiceActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {voiceActive ? 'Stop' : 'Speak'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              placeholder='Speak or type: "118 over 76, 2600 ml"'
              className="flex-1 rounded-xl glass-3d-recessed px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/35"
            />
            <button
              type="button"
              onClick={() => parseVoiceTranscript(voiceTranscript)}
              className="px-3.5 py-2 rounded-xl btn-mono-glass text-sm flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" /> Apply
            </button>
          </div>
          {voiceStatusMsg && <div className="text-xs font-mono text-zinc-300">{voiceStatusMsg}</div>}
        </div>

        {/* Domain Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {(Object.keys(SYSTEM_KNOWLEDGE) as SystemId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-2 py-2.5 rounded-xl text-xs font-medium border truncate transition-all cursor-pointer ${
                activeTab === id
                  ? 'border-white bg-white text-zinc-950 font-semibold shadow-sm'
                  : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/25'
              }`}
            >
              {SYSTEM_KNOWLEDGE[id].shortName}
            </button>
          ))}
        </div>

        {/* Plain-Language How-To & Risk Guide */}
        <div className="glass-3d-recessed rounded-2xl">
          <button
            type="button"
            onClick={() => setShowSimpleGuide((prev) => !prev)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              Measurement Guide ({SYSTEM_KNOWLEDGE[activeTab].shortName})
            </span>
            {showSimpleGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showSimpleGuide && (
            <div className="reveal-panel px-3.5 pb-3 pt-1.5 border-t border-white/10 space-y-2 text-xs text-zinc-300">
              <p className="text-white font-medium leading-snug">
                {CHECKIN_HOWTO_GUIDES[activeTab].whatIsIt}
              </p>
              <ul className="space-y-1 list-disc pl-4 leading-snug">
                {CHECKIN_HOWTO_GUIDES[activeTab].howToMeasure.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
              <p className="text-amber-300 leading-snug">
                <strong>Why this matters:</strong> {CHECKIN_HOWTO_GUIDES[activeTab].riskSummary}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {activeTab === 'cardio' && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Upper BP (Systolic)</span>
                  <input
                    type="number"
                    value={bpSystolic}
                    onChange={(e) => setSafeNum(setBpSystolic, 50, 260)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Lower BP (Diastolic)</span>
                  <input
                    type="number"
                    value={bpDiastolic}
                    onChange={(e) => setSafeNum(setBpDiastolic, 30, 160)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Posture</span>
                  <select
                    value={bpPosture}
                    onChange={(e) => setBpPosture(e.target.value as 'seated' | 'supine' | 'standing')}
                    className="w-full rounded-xl glass-3d-recessed px-2 py-2.5 text-white focus:outline-none focus:border-white/35"
                  >
                    <option value="seated" className="bg-zinc-900 text-white">Seated</option>
                    <option value="supine" className="bg-zinc-900 text-white">Lying Down</option>
                    <option value="standing" className="bg-zinc-900 text-white">Standing</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Resting HR</span>
                  <input
                    type="number"
                    value={restingHrBpm}
                    onChange={(e) => setSafeNum(setRestingHrBpm, 25, 220)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Blood O2 %</span>
                  <input
                    type="number"
                    value={spo2Pct}
                    onChange={(e) => setSafeNum(setSpo2Pct, 50, 100)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Exercise HR</span>
                  <input
                    type="number"
                    value={submaxHrBpm}
                    onChange={(e) => setSafeNum(setSubmaxHrBpm, 40, 230)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Aerobic Fit</span>
                  <input
                    type="number"
                    step="0.1"
                    value={vo2PeakMlKgMin}
                    onChange={(e) => setSafeNum(setVo2PeakMlKgMin, 10, 90)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={orthostaticSymptoms}
                  onChange={(e) => setOrthostaticSymptoms(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Dizziness, tunnel vision, or nausea when standing</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={chestOrPresyncope}
                  onChange={(e) => setChestOrPresyncope(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Chest discomfort, shortness of breath, or feeling faint</span>
              </label>
            </div>
          )}

          {activeTab === 'bone' && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Hip &amp; Spine Density %</span>
                  <input
                    type="number"
                    step="0.1"
                    value={hipSpineBmdPct}
                    onChange={(e) => setSafeNum(setHipSpineBmdPct, 50, 120)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Upper Thigh Bone %</span>
                  <input
                    type="number"
                    step="0.1"
                    value={femoralNeckBmdPct}
                    onChange={(e) => setSafeNum(setFemoralNeckBmdPct, 50, 120)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={aredCompleted}
                  onChange={(e) => setAredCompleted(e.target.checked)}
                  className="accent-zinc-950"
                />
                <span>Completed daily resistance training</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={bonePainSymptom}
                  onChange={(e) => setBonePainSymptom(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Localized bone pain, swelling, or impact injury</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={postLandingSymptoms}
                  onChange={(e) => setPostLandingSymptoms(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Unsteadiness or dizziness after landing</span>
              </label>
            </div>
          )}

          {activeTab === 'muscle' && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Strength %</span>
                  <input
                    type="number"
                    step="0.1"
                    value={strengthPctBaseline}
                    onChange={(e) => setSafeNum(setStrengthPctBaseline, 30, 130)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Thigh Size %</span>
                  <input
                    type="number"
                    step="0.1"
                    value={muscleCsaPctBaseline}
                    onChange={(e) => setSafeNum(setMuscleCsaPctBaseline, 30, 130)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Effort (1–10)</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={rpe}
                    onChange={(e) => setSafeNum(setRpe, 1, 10)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={limitingMusclePain}
                  onChange={(e) => setLimitingMusclePain(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Muscle pain limiting normal tasks</span>
              </label>
            </div>
          )}

          {activeTab === 'vision-sans' && (
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-zinc-300 font-medium">Eye Pressure (mmHg)</span>
                <input
                  type="number"
                  value={iopMmHg}
                  onChange={(e) => setSafeNum(setIopMmHg, 5, 45)(e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={blurredVision}
                  onChange={(e) => setBlurredVision(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Blurred or distorted near vision</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={persistentHeadache}
                  onChange={(e) => setPersistentHeadache(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Persistent headache</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={sansCountermeasureDone}
                  onChange={(e) => setSansCountermeasureDone(e.target.checked)}
                  className="accent-zinc-950"
                />
                <span>Completed daily thigh cuff session</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={octExamOverdue}
                  onChange={(e) => setOctExamOverdue(e.target.checked)}
                  className="accent-amber-600"
                />
                <span>Scheduled retinal eye scan is overdue</span>
              </label>
            </div>
          )}

          {activeTab === 'nutrition-hydration' && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Fluid Intake (ml)</span>
                  <input
                    type="number"
                    value={fluidIntakeMl}
                    onChange={(e) => setSafeNum(setFluidIntakeMl, 0, 8000)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Urine Output (ml)</span>
                  <input
                    type="number"
                    value={urineOutputMl}
                    onChange={(e) => setSafeNum(setUrineOutputMl, 0, 6000)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Body Temp (°C)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={bodyTempC}
                    onChange={(e) => setSafeNum(setBodyTempC, 32, 43)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Blood Glucose (mg/dL)</span>
                  <input
                    type="number"
                    value={bloodGlucoseMgDl}
                    onChange={(e) => setSafeNum(setBloodGlucoseMgDl, 20, 500)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Calories (kcal)</span>
                  <input
                    type="number"
                    value={caloriesKcal}
                    onChange={(e) => setSafeNum(setCaloriesKcal, 0, 8000)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-300 font-medium">Sodium (mg)</span>
                  <input
                    type="number"
                    value={sodiumMg}
                    onChange={(e) => setSafeNum(setSodiumMg, 0, 12000)(e.target.value)}
                    className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={urineDarkConcentrated}
                  onChange={(e) => setUrineDarkConcentrated(e.target.checked)}
                  className="accent-amber-600"
                />
                <span>Dark, concentrated urine today</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={nutritionSymptomsFlag}
                  onChange={(e) => setNutritionSymptomsFlag(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Poor appetite, dry mouth, or unusual fatigue</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/12 p-3 cursor-pointer text-rose-100">
                <input
                  type="checkbox"
                  checked={renalColicSymptoms}
                  onChange={(e) => setRenalColicSymptoms(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Sharp side pain, painful urination, or blood in urine</span>
              </label>
            </div>
          )}

          {activeTab === 'radiation' && (
            <div className="space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="text-zinc-300 font-medium">Daily Radiation (mSv)</span>
                <input
                  type="number"
                  step="0.01"
                  value={dailyDoseMsv}
                  onChange={(e) => setSafeNum(setDailyDoseMsv, 0, 5000)(e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={prodromalNausea}
                  onChange={(e) => setProdromalNausea(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Nausea or digestive upset</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl glass-3d-recessed p-3 cursor-pointer text-zinc-200 hover:border-white/25">
                <input
                  type="checkbox"
                  checked={commBreakdownFlag}
                  onChange={(e) => setCommBreakdownFlag(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Crew–ground signal delay or out-of-order messages</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/12 p-3 cursor-pointer text-rose-100">
                <input
                  type="checkbox"
                  checked={neurologicalRedFlag}
                  onChange={(e) => setNeurologicalRedFlag(e.target.checked)}
                  className="accent-rose-600"
                />
                <span>Sudden confusion, loss of balance, or fainting</span>
              </label>
            </div>
          )}

          {urgentRedFlag && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/14 p-3.5 text-sm text-rose-100 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Immediate Attention:</strong> Pause heavy activity, rest safely, and contact your flight surgeon.
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={appendAsNewSol}
                onChange={(e) => setAppendAsNewSol(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Log as next day (Day {latest.sol + 1})</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-full btn-mono-glass text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full btn-mono-primary font-semibold text-sm transition-all cursor-pointer"
              >
                Save Check (+40 pts)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
