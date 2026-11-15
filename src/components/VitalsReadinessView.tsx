import React, { useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Compass, Watch } from 'lucide-react';
import { AstronautRankInfo } from '../engine/routinePrompts';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  compareReadingToBaseline,
  readingFromTelemetry,
} from '../engine/wearableBaseline';
import {
  AstronautBaseline,
  BaselineVerdict,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  EnvironmentConfig,
  GamificationBadge,
  GamificationState,
  NavTab,
  RoutinePromptItem,
  SystemId,
} from '../types/telemetry';
import { RoutineGamificationPanel } from './RoutineGamificationPanel';
import {
  AdherenceBarCluster,
  BiomarkerHelixWave,
  CardiacWaveformCard,
  ComplianceMatrixGrid,
  ReadinessRingCluster,
} from './TelemetryCharts';

interface VitalsReadinessViewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  history: DailyTelemetryEntry[];
  vault: BehavioralVaultEntry[];
  evaluation: EvaluationResult;
  rank: AstronautRankInfo;
  gamification: GamificationState;
  prompts: RoutinePromptItem[];
  badges: GamificationBadge[];
  onCompletePrompt: (prompt: RoutinePromptItem) => void;
  onOpenCheckIn: (presetSystem?: SystemId) => void;
  onSelectSystemInHud: (id: SystemId) => void;
  onOpenWearableSync: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

const VERDICT_BADGE: Record<BaselineVerdict, { label: string; cls: string }> = {
  normal: { label: '● Normal', cls: 'text-emerald-400' },
  borderline: { label: '▲ Watch', cls: 'text-amber-400' },
  'not-normal': { label: '✖ Alert', cls: 'text-rose-400' },
};

export const VitalsReadinessView: React.FC<VitalsReadinessViewProps> = ({
  env,
  baseline,
  history,
  vault,
  evaluation,
  rank,
  gamification,
  prompts,
  badges,
  onCompletePrompt,
  onOpenCheckIn,
  onSelectSystemInHud,
  onOpenWearableSync,
  onNavigateTab,
}) => {
  const [showExtraSummary, setShowExtraSummary] = useState(false);

  const latest = history[history.length - 1];
  const last7 = history.slice(-7);
  const latestSleepHours = vault[vault.length - 1]?.sleepHours;

  const wearableComparison = useMemo(() => {
    if (!latest) return null;
    const payload = readingFromTelemetry(latest, latestSleepHours);
    return compareReadingToBaseline(payload, baseline, env);
  }, [latest, latestSleepHours, baseline, env]);

  const vo2Pct = latest ? (latest.vo2PeakMlKgMin / baseline.vo2PeakMlKgMin) * 100 : 100;
  const aredCompliancePct =
    (last7.filter((d) => d.aredCompleted).length / Math.max(1, last7.length)) * 100;
  const aeroCompliancePct =
    (last7.filter((d) => d.aerobicCompleted).length / Math.max(1, last7.length)) * 100;
  const hydrationPct = latest ? (latest.fluidIntakeMl / baseline.fluidTargetMl) * 100 : 100;
  const caloriePct = latest ? (latest.caloriesKcal / baseline.calorieTargetKcal) * 100 : 100;

  return (
    <div className="space-y-5">
      {/* Compact Environment & Device Telemetry Strip + Color Legend */}
      <div className="glass-3d rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 tabular-nums">
          <span className="font-semibold text-white">{env.label}</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span>{env.gravityLabel}</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span>
            Sensor: <strong className="text-white">{latest?.wearableSource ?? 'CSA Bio-Monitor'}</strong>
          </span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span>
            Cabin: <strong className="text-white">{(latest?.cabinTempC ?? 22.3).toFixed(1)}°C · {(latest?.cabinCo2MmHg ?? 2.8).toFixed(1)} mmHg CO₂</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="text-emerald-400">● Normal</span>
          <span className="text-amber-400">▲ Watch</span>
          <span className="text-rose-400">✖ Alert</span>
          <span className="text-zinc-400">◌ Stale</span>
          <button
            type="button"
            onClick={onOpenWearableSync}
            className="text-sm font-semibold text-white hover:text-zinc-300 cursor-pointer ml-1"
          >
            Compare Baseline →
          </button>
        </div>
      </div>

      {/* Environment-Specific Health Insights */}
      <section className="glass-3d rounded-3xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-base font-display font-semibold text-white">
            <Compass className="h-4 w-4 text-emerald-400" />
            <span>{env.environmentType} Health Focus · {env.vehicle}</span>
          </div>
          <span className="text-xs text-zinc-400 tabular-nums">
            Link: {env.oneWayLatencyLabel} · {env.evaContextLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm text-zinc-300">
          {env.environmentHealthInsights.map((tip, i) => (
            <div key={i} className="glass-3d-recessed rounded-2xl px-3.5 py-2.5 leading-snug">
              <strong className="text-white">{i + 1}.</strong> {tip}
            </div>
          ))}
        </div>
      </section>

      {/* Mission Routine Prompts & Gamification Progress */}
      <RoutineGamificationPanel
        rank={rank}
        gamification={gamification}
        prompts={prompts}
        badges={badges}
        onCompletePrompt={onCompletePrompt}
        onOpenCheckIn={onOpenCheckIn}
        onNavigateTab={onNavigateTab}
      />

      {/* 3-Card Vitals, Readiness & Daily Routine Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <section className="reveal-up stagger-1 glass-3d glass-3d-interactive rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-white">
              Wearable vs. Baseline
            </h2>
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">
              {wearableComparison?.normalCount ?? 0} / {wearableComparison?.items.length ?? 0} Normal
            </span>
          </div>

          <div className="divide-y divide-white/10">
            {wearableComparison?.items.slice(0, 7).map((item) => {
              const badge = VERDICT_BADGE[item.verdict];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectSystemInHud(item.targetSystem)}
                  className="w-full py-2.5 flex items-center justify-between gap-2 text-left hover:bg-white/5 rounded-lg px-1.5 -mx-1.5 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-medium text-zinc-300 truncate">{item.label}</span>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-sm font-bold text-white">
                      {item.readingDisplay}
                    </span>
                    <span className={`text-sm font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onOpenWearableSync}
            className="btn-mono-primary w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Watch className="h-4 w-4" />
            Sync Wearable
          </button>
        </section>

        <section className="reveal-up stagger-2 glass-3d glass-3d-interactive rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-white">Readiness</h2>
            <span className="text-sm text-zinc-400">Tap ring</span>
          </div>
          <ReadinessRingCluster
            rings={[
              {
                label: 'Bone',
                pct: evaluation.readinessSummary.bonePct,
                floorPct: 95,
                sublabel: 'Min 95%',
                onClick: () => onSelectSystemInHud('bone'),
              },
              {
                label: 'Heart',
                pct: evaluation.readinessSummary.cardioPct,
                floorPct: 80,
                sublabel: 'Min 80%',
                onClick: () => onSelectSystemInHud('cardio'),
              },
              {
                label: 'Muscle',
                pct: evaluation.readinessSummary.musclePct,
                floorPct: 80,
                sublabel: 'Min 80%',
                onClick: () => onSelectSystemInHud('muscle'),
              },
            ]}
          />
          <button
            type="button"
            onClick={() => onNavigateTab('assessments')}
            className="btn-mono-glass w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Activity className="h-4 w-4 text-white" />
            Focus Test
          </button>
        </section>

        <section className="reveal-up stagger-3 glass-3d glass-3d-interactive rounded-3xl p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold text-white">Daily Routine</h2>
              <span className="text-sm text-zinc-400 font-semibold">Today</span>
            </div>
            <AdherenceBarCluster
              items={[
                {
                  label: 'Resistance Lift',
                  valuePct: aredCompliancePct,
                  displayValue: `${aredCompliancePct.toFixed(0)}%`,
                  severity: aredCompliancePct < 75 ? 'caution' : 'nominal',
                },
                {
                  label: 'Cardio Session',
                  valuePct: aeroCompliancePct,
                  displayValue: `${aeroCompliancePct.toFixed(0)}%`,
                  severity: aeroCompliancePct < 75 ? 'caution' : 'nominal',
                },
                {
                  label: 'Fluid Intake',
                  valuePct: hydrationPct,
                  displayValue: `${latest?.fluidIntakeMl ?? 0} mL`,
                  severity: evaluation.systemSeverities['nutrition-hydration'],
                },
                {
                  label: 'Calories',
                  valuePct: caloriePct,
                  displayValue: `${latest?.caloriesKcal ?? 0}`,
                  severity: caloriePct < 92 ? 'caution' : 'nominal',
                },
              ]}
            />
          </div>

          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setShowExtraSummary((prev) => !prev)}
              className="w-full flex items-center justify-between text-sm font-semibold text-zinc-200 hover:text-white cursor-pointer"
            >
              <span>{showExtraSummary ? 'Hide ECG & 7-Sol' : 'ECG, Radiation & 7-Sol'}</span>
              {showExtraSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showExtraSummary && latest && (
              <div className="reveal-panel mt-4 space-y-4">
                <ComplianceMatrixGrid
                  sols={last7.map((d) => d.sol)}
                  rows={[
                    { label: 'ARED Lift', cells: last7.map((d) => (d.aredCompleted ? 'ok' : 'miss')) },
                    {
                      label: 'Hydration',
                      cells: last7.map((d) =>
                        d.fluidIntakeMl >= baseline.fluidTargetMl * 0.9 && !d.urineDarkConcentrated
                          ? 'ok'
                          : 'warn'
                      ),
                    },
                  ]}
                />
                <div className="border-t border-white/10 pt-3">
                  <CardiacWaveformCard
                    restingHr={latest.restingHrBpm}
                    submaxHr={latest.submaxHrBpm}
                    baselineSubmaxHr={baseline.submaxHrBpm}
                    vo2Pct={vo2Pct}
                    bpText={`${latest.bpSystolic}/${latest.bpDiastolic}`}
                    onInspect={() => onSelectSystemInHud('cardio')}
                  />
                </div>
                <div className="border-t border-white/10 pt-3">
                  <BiomarkerHelixWave
                    cumulativeMsv={latest.cumulativeMissionDoseMsv + baseline.priorCareerDoseMsv}
                    careerLimitMsv={baseline.careerRadiationLimitMsv}
                    dailyDoseMsv={latest.dailyDoseMsv}
                    status={latest.dosimetryStatus}
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
