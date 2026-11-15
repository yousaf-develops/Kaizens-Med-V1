import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Dumbbell,
  Droplets,
  Radio,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  AstronautBaseline,
  AstronautProfile,
  DailyTelemetryEntry,
  EnvironmentConfig,
} from '../types/telemetry';
import { EvaluationResult } from '../engine/ruleEngine';

interface DailyClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AstronautProfile;
  baseline: AstronautBaseline;
  env: EnvironmentConfig;
  latest: DailyTelemetryEntry;
  evaluation: EvaluationResult;
  completedActionIds: Record<string, boolean>;
  onToggleActionDone: (actionId: string) => void;
  onPatchTelemetry: (patch: Partial<DailyTelemetryEntry>, syncSummary?: string) => void;
}

interface CrucialTask {
  id: string;
  title: string;
  category: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  isCompleted: boolean;
  actionButtonText: string;
  onComplete: () => void;
}

export const DailyClearanceModal: React.FC<DailyClearanceModalProps> = ({
  isOpen,
  onClose,
  profile,
  baseline,
  env,
  latest,
  evaluation,
  completedActionIds,
  onToggleActionDone,
  onPatchTelemetry,
}) => {
  const [justCompletedAll, setJustCompletedAll] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Avatar asset based on selected user gender
  const avatarSrc =
    profile.gender === 'female'
      ? '/assets/aistudio/avatar_female_27b5e242.png'
      : '/assets/aistudio/Avatar_male_178eaa5e.png';

  // Crucial Tasks evaluation
  const isAredDone = latest.aredCompleted || !!completedActionIds['bone-1'];
  const isHydrationDone =
    latest.fluidIntakeMl >= baseline.fluidTargetMl ||
    !latest.urineDarkConcentrated ||
    !!completedActionIds['nutr-1'];
  const isDosimetryDone = latest.dosimetryStatus === 'measured';
  const isVitalsDone =
    latest.restingHrBpm > 0 &&
    latest.bpSystolic > 0 &&
    (!!completedActionIds['cardio-3'] || latest.vo2PeakMlKgMin > 0);

  const crucialTasks: CrucialTask[] = [
    {
      id: 'ared-training',
      title: 'Daily Resistance Training (ARED)',
      category: 'Bone & Muscle Preservation',
      desc: 'Complete full deadlifts and squats to prevent bone mineral loss and preserve leg strength.',
      icon: Dumbbell,
      isCompleted: isAredDone,
      actionButtonText: 'Mark Workout Complete',
      onComplete: () => {
        onPatchTelemetry({ aredCompleted: true, aredLoadPct: 100 }, 'Completed daily resistance session');
        onToggleActionDone('bone-1');
      },
    },
    {
      id: 'hydration-target',
      title: 'Fluid Intake Target (2,500 ml)',
      category: 'Kidney Stone & Blood Volume Protection',
      desc: 'Log sufficient water intake to maintain blood volume and prevent spaceflight renal calculi.',
      icon: Droplets,
      isCompleted: isHydrationDone,
      actionButtonText: 'Log +500 ml Water',
      onComplete: () => {
        onPatchTelemetry(
          {
            fluidIntakeMl: Math.max(baseline.fluidTargetMl, latest.fluidIntakeMl + 500),
            urineDarkConcentrated: false,
          },
          'Logged 500 ml water for clearance'
        );
        onToggleActionDone('nutr-1');
      },
    },
    {
      id: 'dosimetry-sync',
      title: 'Radiation Dosimeter Badge Sync',
      category: 'Space Radiation Protection',
      desc: 'Confirm personal radiation chest badge has synced readings within the last 24 hours.',
      icon: Radio,
      isCompleted: isDosimetryDone,
      actionButtonText: 'Verify Badge Now',
      onComplete: () => {
        onPatchTelemetry(
          {
            dosimetryStatus: 'measured',
            dosimetryLastUpdatedHoursAgo: 1,
          },
          'Verified personal dosimeter badge'
        );
      },
    },
    {
      id: 'vitals-signoff',
      title: 'Resting Cardiovascular Check',
      category: 'Heart & Blood Pressure Readiness',
      desc: 'Confirm resting heart rate, blood pressure, and lack of presyncope symptoms.',
      icon: HeartPulse,
      isCompleted: isVitalsDone,
      actionButtonText: 'Sign Off Vitals',
      onComplete: () => {
        onToggleActionDone('cardio-3');
      },
    },
  ];

  const completedCount = crucialTasks.filter((t) => t.isCompleted).length;
  const totalCount = crucialTasks.length;
  const allCompleted = completedCount === totalCount;

  // Trigger smooth reveal animation when all tasks become complete
  useEffect(() => {
    if (allCompleted) {
      const timer = setTimeout(() => {
        setJustCompletedAll(true);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setJustCompletedAll(false);
    }
  }, [allCompleted]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clearance-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-2xl transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Apple-style Glass Card Container */}
      <div className="relative z-10 w-full max-w-4xl rounded-[28px] glass-3d border border-white/20 p-5 sm:p-8 shadow-[0_32px_90px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-250 flex flex-col gap-6 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-cyan-300 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
                {env.shortLabel} · Day {env.currentDay} Flight Clearance
              </div>
              <h2 id="clearance-modal-title" className="text-xl sm:text-2xl font-display font-bold text-white">
                Astronaut Daily Clearance
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-mono-glass h-9 w-9 rounded-full flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            STATE A: CRUCIAL STEPS REMAINING
        ════════════════════════════════════════════════════════════════ */}
        {!allCompleted ? (
          <div className="flex flex-col gap-5">
            {/* Warning / Progress Banner */}
            <div className="glass-3d-sub rounded-2xl p-4 sm:p-5 border-amber-400/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Remaining Crucial Steps: {totalCount - completedCount} Left</span>
                </div>
                <p className="text-xs text-zinc-300 max-w-xl">
                  NASA flight medical rules require these essential daily countermeasures before your Sol clearance
                  report can be signed off and transmitted. Complete them below:
                </p>
              </div>

              {/* Progress pill */}
              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-xs font-semibold tabular-nums text-white">
                <span>{completedCount} / {totalCount} Done</span>
                <span className="text-amber-400">({Math.round((completedCount / totalCount) * 100)}%)</span>
              </div>
            </div>

            {/* Crucial Task Cards List */}
            <div className="grid grid-cols-1 gap-3">
              {crucialTasks.map((task, idx) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      task.isCompleted
                        ? 'border-emerald-400/35 bg-emerald-500/10 text-white'
                        : 'glass-3d-sub border-white/12 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          task.isCompleted ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-zinc-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                            {task.category}
                          </span>
                          {task.isCompleted && (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Completed ✓
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold text-white">
                          {idx + 1}. {task.title}
                        </h4>
                        <p className="text-xs text-zinc-300 leading-snug max-w-lg">{task.desc}</p>
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      {task.isCompleted ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Satisfied</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={task.onComplete}
                          className="btn-mono-primary px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.03] active:scale-[0.98] transition-transform"
                        >
                          <span>{task.actionButtonText}</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════
             STATE B: ALL COMPLETED -> SMOOTH REVEAL OF DAILY REPORT + AVATAR
          ════════════════════════════════════════════════════════════════ */
          <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Success clearance badge */}
            <div className="rounded-2xl p-4 bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-between gap-3 text-emerald-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white">
                  All Crucial Steps Completed · Daily Clearance Generated
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                100% OPERATIONAL
              </span>
            </div>

            {/* TWO-COLUMN LAYOUT: Report on Left + User Avatar Popping to the Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* LEFT COLUMN: Small, Easy-to-Understand Daily Report */}
              <div className="lg:col-span-7 glass-3d-sub rounded-2xl p-5 sm:p-6 border-white/15 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-300">
                      Sol {env.currentDay} Flight Certificate
                    </span>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white mt-0.5">
                      Crew Member: {profile.firstName} {profile.lastName || ''}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    ● CLEARED
                  </span>
                </div>

                {/* 4 Metric Highlights Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-1">
                    <span className="text-zinc-400">Cardiovascular</span>
                    <div className="text-sm font-bold text-white">
                      {latest.restingHrBpm} bpm · {latest.bpSystolic}/{latest.bpDiastolic}
                    </div>
                    <span className="text-[11px] text-emerald-400">Normal rhythm</span>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-1">
                    <span className="text-zinc-400">Bone & Muscle</span>
                    <div className="text-sm font-bold text-white">
                      {latest.hipSpineBmdPct.toFixed(1)}% Hip BMD
                    </div>
                    <span className="text-[11px] text-emerald-400">ARED 100% Done</span>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-1">
                    <span className="text-zinc-400">Hydration Target</span>
                    <div className="text-sm font-bold text-white">
                      {latest.fluidIntakeMl} ml logged
                    </div>
                    <span className="text-[11px] text-emerald-400">Target Satisfied</span>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/10 p-3 space-y-1">
                    <span className="text-zinc-400">Radiation Dose</span>
                    <div className="text-sm font-bold text-white">
                      {latest.dailyDoseMsv.toFixed(2)} mSv today
                    </div>
                    <span className="text-[11px] text-emerald-400">Badge Active & Safe</span>
                  </div>
                </div>

                {/* Flight Surgeon Assessment in Plain Words */}
                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs space-y-1 text-zinc-300">
                  <strong className="text-white block font-medium">Flight Surgeon Signoff:</strong>
                  <p className="leading-relaxed">
                    Astronaut has satisfied all required biological countermeasures for Day {env.currentDay}. 
                    Cardio output and muscle readiness are certified for habitat operations, hatch maintenance, and next sol schedule.
                  </p>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAcknowledged(true);
                      setTimeout(() => {
                        onClose();
                      }, 1200);
                    }}
                    className="btn-mono-primary px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{acknowledged ? 'Signed Off & Transmitted ✓' : 'Acknowledge & Sign Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-mono-glass px-4 py-2.5 rounded-full text-xs font-semibold cursor-pointer text-zinc-300 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: User's Selected Avatar Pops In with Reveal Effect */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-4">
                <div
                  className="relative flex flex-col items-center justify-center transition-all duration-700 animate-in zoom-in-75 slide-in-from-right-8"
                  style={{
                    animationDuration: '650ms',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Subtle Aurora Aura Behind Avatar */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/30 via-emerald-500/20 to-sky-500/30 blur-2xl animate-pulse"
                    style={{ animationDuration: '4s' }}
                  />

                  {/* Glass Pedestal */}
                  <div className="relative z-10 w-48 sm:w-56 aspect-square rounded-3xl glass-3d border border-white/25 flex items-center justify-center p-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                    <img
                      src={avatarSrc}
                      alt={`${profile.firstName} avatar`}
                      className="w-full h-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.8)]"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  {/* Callout Badge beneath Avatar */}
                  <div className="relative z-10 mt-3.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-xs font-semibold text-emerald-300 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{profile.firstName} · Ready for Duty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
