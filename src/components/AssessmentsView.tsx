import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Eye,
  HeartPulse,
  Play,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  AstronautBaseline,
  EnvironmentConfig,
  MediaAssessmentItem,
  PVTSessionResult,
} from '../types/telemetry';

interface AssessmentsViewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  hoursAwakeNow: number;
  pvtSessions: PVTSessionResult[];
  onSavePvtSession: (session: PVTSessionResult) => void;
  mediaItems: MediaAssessmentItem[];
  onSaveMediaItem: (item: MediaAssessmentItem) => void;
}

type PvtPhase = 'idle' | 'waiting' | 'stimulus' | 'feedback' | 'complete';

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  env,
  baseline,
  hoursAwakeNow,
  pvtSessions,
  onSavePvtSession,
  mediaItems,
  onSaveMediaItem,
}) => {
  const [pvtMode, setPvtMode] = useState<'standard-3m' | 'calibration-45s'>('standard-3m');
  const [phase, setPhase] = useState<PvtPhase>('idle');
  const [samples, setSamples] = useState<number[]>([]);
  const [falseStarts, setFalseStarts] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState(180);
  const [latestSavedPvt, setLatestSavedPvt] = useState<PVTSessionResult | null>(null);

  const stimulusStartRef = useRef<number>(0);
  const foreperiodTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const falseStartsRef = useRef<number>(0);

  const [mediaCategory, setMediaCategory] = useState<MediaAssessmentItem['category']>('muscle-ultrasound');
  const [anatomicalSite, setAnatomicalSite] = useState('Right Rectus Femoris');
  const [mediaNotes, setMediaNotes] = useState('');
  const [flaggedClinician, setFlaggedClinician] = useState(false);
  const [compareIds, setCompareIds] = useState<[string, string]>([
    mediaItems[0]?.id ?? '',
    mediaItems[mediaItems.length - 1]?.id ?? '',
  ]);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  useEffect(() => {
    if (mediaItems.length > 0) {
      setCompareIds((prev) => [
        prev[0] || mediaItems[0].id,
        prev[1] || mediaItems[mediaItems.length - 1].id,
      ]);
    }
  }, [mediaItems]);

  const clearTimers = () => {
    if (foreperiodTimerRef.current) window.clearTimeout(foreperiodTimerRef.current);
    if (sessionTimerRef.current) window.clearInterval(sessionTimerRef.current);
  };

  const cancelPvt = () => {
    clearTimers();
    samplesRef.current = [];
    falseStartsRef.current = 0;
    setSamples([]);
    setFalseStarts(0);
    setPhase('idle');
    setRemainingSec(pvtMode === 'standard-3m' ? 180 : 45);
  };

  const finishPvtSession = useCallback(() => {
    clearTimers();
    const list = samplesRef.current;
    if (list.length === 0) {
      setPhase('idle');
      return;
    }
    const sorted = [...list].sort((a, b) => a - b);
    const mean = Math.round(list.reduce((acc, v) => acc + v, 0) / list.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    const lapses = list.filter((v) => v > 355).length;

    const result: PVTSessionResult = {
      id: `pvt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestampISO: new Date().toISOString(),
      sol: env.currentDay,
      mode: pvtMode,
      meanRtMs: mean,
      medianRtMs: median,
      lapsesCount: lapses,
      falseStarts: falseStartsRef.current,
      trialsCount: list.length,
      hoursAwakeAtTest: hoursAwakeNow,
      reactionSamplesMs: list,
    };

    setLatestSavedPvt(result);
    onSavePvtSession(result);
    setPhase('complete');
  }, [env.currentDay, hoursAwakeNow, onSavePvtSession, pvtMode]);

  const scheduleNextStimulus = useCallback(() => {
    setPhase('waiting');
    const delayMs =
      pvtMode === 'standard-3m'
        ? 2000 + Math.random() * 4500
        : 1200 + Math.random() * 2600;
    foreperiodTimerRef.current = window.setTimeout(() => {
      stimulusStartRef.current = performance.now();
      setPhase('stimulus');
    }, delayMs);
  }, [pvtMode]);

  const startPvt = () => {
    clearTimers();
    const totalSec = pvtMode === 'standard-3m' ? 180 : 45;
    samplesRef.current = [];
    falseStartsRef.current = 0;
    setSamples([]);
    setFalseStarts(0);
    setLatestSavedPvt(null);
    setLastFeedback('Wait for signal...');
    setRemainingSec(totalSec);

    sessionTimerRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          finishPvtSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    scheduleNextStimulus();
  };

  const handlePvtResponse = useCallback(() => {
    if (phase === 'waiting') {
      if (foreperiodTimerRef.current) window.clearTimeout(foreperiodTimerRef.current);
      falseStartsRef.current += 1;
      setFalseStarts(falseStartsRef.current);
      setLastFeedback('False start! Wait for signal.');
      setPhase('feedback');
      window.setTimeout(() => scheduleNextStimulus(), 900);
      return;
    }

    if (phase === 'stimulus') {
      const rt = Math.round(performance.now() - stimulusStartRef.current);
      samplesRef.current = [...samplesRef.current, rt];
      setSamples(samplesRef.current);
      setLastFeedback(rt > 355 ? `${rt} ms (Lapse)` : `${rt} ms`);
      setPhase('feedback');
      window.setTimeout(() => scheduleNextStimulus(), 750);
    }
  }, [phase, scheduleNextStimulus]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (phase === 'waiting' || phase === 'stimulus')) {
        e.preventDefault();
        handlePvtResponse();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handlePvtResponse]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const item: MediaAssessmentItem = {
        id: `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        category: mediaCategory,
        anatomicalSite: anatomicalSite.trim() || 'Unspecified Site',
        capturedAtISO: new Date().toISOString(),
        sol: env.currentDay,
        notes: mediaNotes.trim() || 'Crew scan log.',
        dataUrl,
        flaggedForClinician: flaggedClinician,
      };
      onSaveMediaItem(item);
      setCompareIds((prev) => [prev[0] || item.id, item.id]);
      setMediaNotes('');
      setUploadSuccessMsg('Scan saved offline.');
      window.setTimeout(() => setUploadSuccessMsg(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const leftMedia = mediaItems.find((m) => m.id === compareIds[0]) ?? mediaItems[0];
  const rightMedia =
    mediaItems.find((m) => m.id === compareIds[1]) ?? mediaItems[mediaItems.length - 1];

  return (
    <div className="space-y-6">
      {/* 1. Focus & Reaction Speed Test */}
      <section className="reveal-up glass-3d rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Focus &amp; Reaction Test
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Measures alertness in milliseconds against personal baseline — fatigue slows reaction speed before you feel sleepy
            </p>
          </div>

          <div className="glass-3d-recessed flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setPvtMode('standard-3m')}
              disabled={phase !== 'idle' && phase !== 'complete'}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                pvtMode === 'standard-3m'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              3-Min Test
            </button>
            <button
              type="button"
              onClick={() => setPvtMode('calibration-45s')}
              disabled={phase !== 'idle' && phase !== 'complete'}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                pvtMode === 'calibration-45s'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              45s Quick
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="glass-3d-recessed lg:col-span-7 flex flex-col justify-between rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-3">
              <span>
                <Clock className="inline h-3.5 w-3.5 mr-1 text-zinc-300" />
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
              </span>
              <span>TRIALS: {samples.length} · FALSE: {falseStarts}</span>
            </div>

            {phase === 'idle' || phase === 'complete' ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                {phase === 'complete' && latestSavedPvt ? (
                  <div className="reveal-panel space-y-3">
                    <div className="text-xs font-mono font-semibold text-emerald-400">
                      ● SESSION SAVED
                    </div>
                    <div className="text-4xl font-mono font-bold tabular-nums text-white">
                      {latestSavedPvt.meanRtMs} <span className="text-base font-medium text-zinc-400">ms mean</span>
                    </div>
                    <div className="text-xs sm:text-sm font-mono text-zinc-400">
                      Base {baseline.pvtBaselineMs} ms · Lapses: {latestSavedPvt.lapsesCount}
                    </div>
                    {latestSavedPvt.reactionSamplesMs.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 max-w-md">
                        {latestSavedPvt.reactionSamplesMs.map((ms, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums border ${
                              ms > 355
                                ? 'bg-rose-500/15 text-rose-300 border-rose-400/35'
                                : ms > baseline.pvtBaselineMs + 45
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-400/35'
                                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/35'
                            }`}
                          >
                            {ms}ms
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-300 max-w-md leading-relaxed">
                    Tap the target pad or press{' '}
                    <kbd className="glass-3d-sub px-1.5 py-0.5 rounded font-mono text-xs text-white">
                      Space
                    </kbd>{' '}
                    when the counter lights up.
                  </p>
                )}

                <button
                  onClick={startPvt}
                  className="btn-mono-primary px-6 py-3 rounded-full font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {phase === 'complete' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {phase === 'complete' ? 'Run Again' : 'Start Test'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onPointerDown={handlePvtResponse}
                  className={`w-full h-52 rounded-2xl border-2 flex flex-col items-center justify-center transition-colors select-none cursor-pointer ${
                    phase === 'stimulus'
                      ? 'border-cyan-300 bg-[#024755] text-white shadow-[0_0_32px_rgba(2,71,85,0.85)]'
                      : 'border-white/15 bg-white/[0.04] text-zinc-200'
                  }`}
                >
                  {phase === 'stimulus' ? (
                    <>
                      <span className="text-3xl font-mono font-bold tracking-wider text-white">
                        TAP NOW
                      </span>
                      <span className="text-xs font-mono text-cyan-200 mt-1">
                        TAP OR PRESS SPACE
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-mono text-white">
                        {phase === 'feedback' ? lastFeedback : 'WAIT...'}
                      </span>
                      <span className="text-xs font-mono text-zinc-400 mt-1">
                        Wait for illumination
                      </span>
                    </>
                  )}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-400">
                    Awake: {hoursAwakeNow}h
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelPvt}
                      className="btn-mono-glass px-3 py-1.5 text-xs font-mono rounded-full cursor-pointer"
                    >
                      Cancel
                    </button>
                    {samples.length >= 3 && (
                      <button
                        type="button"
                        onClick={finishPvtSession}
                        className="btn-mono-primary px-3 py-1.5 text-xs font-mono rounded-full cursor-pointer"
                      >
                        Save ({samples.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PVT-B History */}
          <div className="glass-3d-recessed lg:col-span-5 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-300">
                  Recent Sessions
                </h2>
                <span className="text-xs font-mono text-zinc-400">
                  Base: {baseline.pvtBaselineMs} ms
                </span>
              </div>
              <div className="divide-y divide-white/10">
                {pvtSessions
                  .slice(-5)
                  .reverse()
                  .map((s) => {
                    const delta = s.meanRtMs - baseline.pvtBaselineMs;
                    return (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                        <div>
                          <div className="font-mono font-semibold text-white">
                            Sol {s.sol} · {s.mode === 'standard-3m' ? '3-Min' : '45s'}
                          </div>
                          <div className="text-xs font-mono text-zinc-400">
                            {s.trialsCount} trials · {s.lapsesCount} lapses
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-base font-bold text-white">{s.meanRtMs} ms</div>
                          <div className={delta > 60 ? 'text-rose-400 font-semibold' : delta > 35 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                            {delta >= 0 ? `+${delta}` : delta} ms
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Scan & Photo Comparison */}
      <section className="reveal-up stagger-2 glass-3d rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              Scan Comparison
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Non-experts: hold probe/camera steady at the same body angle and select two dates below to check side-by-side changes
            </p>
          </div>
          {uploadSuccessMsg && (
            <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> {uploadSuccessMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="glass-3d-recessed lg:col-span-4 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-mono uppercase text-zinc-300 font-semibold">Upload Scan</div>

            <label className="block space-y-1 text-xs">
              <span className="text-zinc-400 font-medium">Type</span>
              <select
                value={mediaCategory}
                onChange={(e) => setMediaCategory(e.target.value as MediaAssessmentItem['category'])}
                className="w-full rounded-xl glass-3d-recessed px-3 py-2 text-white focus:outline-none focus:border-white/35"
              >
                <option value="muscle-ultrasound" className="bg-zinc-900 text-white">Muscle Ultrasound</option>
                <option value="skin-radiation" className="bg-zinc-900 text-white">Skin Radiation</option>
                <option value="oct-retina" className="bg-zinc-900 text-white">OCT Retina</option>
                <option value="other" className="bg-zinc-900 text-white">Other Scan</option>
              </select>
            </label>

            <label className="block space-y-1 text-xs">
              <span className="text-zinc-400 font-medium">Site</span>
              <input
                type="text"
                value={anatomicalSite}
                onChange={(e) => setAnatomicalSite(e.target.value)}
                className="w-full rounded-xl glass-3d-recessed px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/35"
                placeholder="Anatomical site"
              />
            </label>

            <label className="block space-y-1 text-xs">
              <span className="text-zinc-400 font-medium">Notes</span>
              <textarea
                rows={2}
                value={mediaNotes}
                onChange={(e) => setMediaNotes(e.target.value)}
                className="w-full rounded-xl glass-3d-recessed px-3 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/35"
                placeholder="Optional scan notes..."
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={flaggedClinician}
                onChange={(e) => setFlaggedClinician(e.target.checked)}
                className="rounded border-white/25 accent-white"
              />
              Flag for Flight Surgeon review
            </label>

            <label className="btn-mono-primary flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-all">
              <Upload className="h-4 w-4" />
              <span>Upload / Capture</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Prior Scan', item: leftMedia, idx: 0 },
              { label: 'Current Scan', item: rightMedia, idx: 1 },
            ].map((slot) => (
              <div
                key={slot.idx}
                className="glass-3d-recessed rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-300 font-semibold">{slot.label}</span>
                  <select
                    value={slot.item?.id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompareIds((prev) =>
                        slot.idx === 0 ? [val, prev[1]] : [prev[0], val]
                      );
                    }}
                    className="rounded-lg glass-3d-recessed px-2 py-1 text-[11px] font-mono text-white max-w-[160px]"
                  >
                    {mediaItems.map((m) => (
                      <option key={m.id} value={m.id} className="bg-zinc-900 text-white">
                        Sol {m.sol} · {m.anatomicalSite}
                      </option>
                    ))}
                  </select>
                </div>

                {slot.item ? (
                  <>
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25 aspect-[3/2] flex items-center justify-center">
                      <img
                        src={slot.item.dataUrl}
                        alt={`${slot.item.category} at ${slot.item.anatomicalSite}`}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                        <span>Sol {slot.item.sol} · {slot.item.category}</span>
                        {slot.item.flaggedForClinician && (
                          <span className="text-amber-400 font-semibold">▲ Flagged</span>
                        )}
                      </div>
                      <div className="text-white font-medium">{slot.item.anatomicalSite}</div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-400">No scan selected</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Quick Exam Protocols */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-white text-xs font-mono uppercase font-semibold">
            <HeartPulse className="h-4 w-4 text-zinc-300" /> 4.2 Orthostatic BP
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Record seated, supine, or standing posture; stop upright check if dizzy or presyncopal.
          </p>
        </div>
        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-white text-xs font-mono uppercase font-semibold">
            <Eye className="h-4 w-4 text-zinc-300" /> 4.4 SANS &amp; OCT Check
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Pair retinal/OCT imaging with IOP and acuity; investigational cuffs do not substitute for exams.
          </p>
        </div>
        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-white text-xs font-mono uppercase font-semibold">
            <Camera className="h-4 w-4 text-zinc-300" /> 1. Radiation Skin Log
          </div>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Capture timestamped skin photos alongside verified personal dosimetry after SPE events.
          </p>
        </div>
      </section>
    </div>
  );
};
