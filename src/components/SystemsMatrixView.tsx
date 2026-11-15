import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Database,
  Plus,
  Radio,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  AlertSeverity,
  AstronautBaseline,
  DailyTelemetryEntry,
  EnvironmentConfig,
  NavTab,
  SPEEventState,
  SystemId,
} from '../types/telemetry';
import { LongitudinalAreaChart } from './TelemetryCharts';

interface SystemsMatrixViewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  history: DailyTelemetryEntry[];
  evaluation: EvaluationResult;
  speState: SPEEventState;
  onUpdateSpeState: (next: SPEEventState) => void;
  onToggleDosimetryStale: () => void;
  onPatchTelemetry?: (patch: Partial<DailyTelemetryEntry>, syncLabel?: string) => void;
  onAdvanceSol?: () => void;
  onOpenCheckIn: (preset?: SystemId) => void;
  onSelectSystemInHud?: (id: SystemId) => void;
  onNavigateTab?: (tab: NavTab) => void;
}

const SEV_PILL: Record<AlertSeverity, { label: string; cls: string }> = {
  nominal: { label: '● Normal', cls: 'text-emerald-400' },
  caution: { label: '▲ Watch', cls: 'text-amber-400' },
  urgent: { label: '✖ Alert', cls: 'text-rose-400' },
  'data-quality': { label: '◌ Stale', cls: 'text-zinc-400' },
};

export const SystemsMatrixView: React.FC<SystemsMatrixViewProps> = ({
  env,
  baseline,
  history,
  evaluation,
  speState,
  onUpdateSpeState,
  onToggleDosimetryStale,
  onPatchTelemetry,
  onAdvanceSol,
  onOpenCheckIn,
  onSelectSystemInHud,
  onNavigateTab,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'flagged'>('all');
  const [solWindow, setSolWindow] = useState<'7' | '14' | 'all'>('14');
  const latest = history[history.length - 1];
  const chartHistory =
    solWindow === '7'
      ? history.slice(-7)
      : solWindow === '14'
        ? history.slice(-14)
        : history;

  const filteredAlerts =
    filterSeverity === 'all'
      ? evaluation.alerts
      : evaluation.alerts.filter((a) => a.severity !== 'nominal');

  const handleToggleSpe = () => {
    if (speState.activeWarning) {
      onUpdateSpeState({
        ...speState,
        activeWarning: false,
        acknowledged: false,
        shelterOccupied: false,
        shelterEnteredAtISO: null,
        eventId: 'SPE-2026-11-NONE',
      });
    } else {
      onUpdateSpeState({
        ...speState,
        activeWarning: true,
        eventId: 'SPE-2026-142-X2',
        issuedAtISO: new Date().toISOString(),
        acknowledged: false,
        shelterOccupied: false,
        shelterEnteredAtISO: null,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact Simulator & Dynamic Chart Timeframe Controls */}
      <div className="glass-3d rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm sm:text-base font-medium text-white">
            Dynamic Multi-Sol Trends ({chartHistory.length} Sols)
          </span>
          <div className="glass-3d-recessed flex items-center gap-1 rounded-xl p-1 text-xs font-semibold">
            {([
              { id: '7', label: '7 Sols' },
              { id: '14', label: '14 Sols' },
              { id: 'all', label: 'All' },
            ] as const).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSolWindow(w.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  solWindow === w.id ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAdvanceSol && (
            <button
              type="button"
              onClick={onAdvanceSol}
              className="btn-mono-primary px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Advance +1 Sol
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleSpe}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              speState.activeWarning
                ? 'border-rose-400/60 bg-rose-500/80 text-white'
                : 'btn-mono-glass'
            }`}
          >
            <Radio className="h-4 w-4" />
            {speState.activeWarning ? 'Clear Solar Storm' : 'Simulate Storm'}
          </button>

          <button
            type="button"
            onClick={onToggleDosimetryStale}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              latest?.dosimetryStatus === 'stale'
                ? 'border-amber-400/60 bg-amber-400 text-zinc-950'
                : 'btn-mono-glass'
            }`}
          >
            <Database className="h-4 w-4" />
            {latest?.dosimetryStatus === 'stale' ? 'Restore Sensor' : 'Test Stale Sensor'}
          </button>

          {onPatchTelemetry && (
            <button
              type="button"
              onClick={() => {
                const isPost = latest?.postLandingPhase === 'Post-Landing Readapting';
                onPatchTelemetry(
                  {
                    postLandingPhase: isPost ? 'In-Flight' : 'Post-Landing Readapting',
                    postLandingSymptoms: !isPost,
                  },
                  isPost ? 'Post-landing phase cleared' : 'Post-landing readaptation check triggered'
                );
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                latest?.postLandingPhase === 'Post-Landing Readapting'
                  ? 'border-amber-400/60 bg-amber-400 text-zinc-950'
                  : 'btn-mono-glass'
              }`}
            >
              {latest?.postLandingPhase === 'Post-Landing Readapting'
                ? 'Clear Post-Landing'
                : 'Test Post-Landing (4.1)'}
            </button>
          )}
        </div>
      </div>

      {/* Solar Storm Shelter Banner */}
      {speState.activeWarning && (
        <section className="reveal-panel glass-3d rounded-3xl border-rose-400/50 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertOctagon className="h-5 w-5 text-rose-400" />
              <div>
                <h2 className="text-base font-display font-semibold text-white">
                  Solar Storm Alert: {speState.eventId}
                </h2>
                <div className="text-sm text-rose-300 font-medium">
                  Shelter: {speState.assignedShelter}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!speState.acknowledged && (
                <button
                  type="button"
                  onClick={() => onUpdateSpeState({ ...speState, acknowledged: true })}
                  className="px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Acknowledge
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onUpdateSpeState({
                    ...speState,
                    acknowledged: true,
                    shelterOccupied: !speState.shelterOccupied,
                    shelterEnteredAtISO: !speState.shelterOccupied ? new Date().toISOString() : null,
                  })
                }
                className="btn-mono-glass px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Timer className="h-4 w-4" />
                {speState.shelterOccupied ? 'Log Exit' : 'Confirm Shelter'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 6 Multi-Sol System Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <article className="reveal-up stagger-1 glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Bone Strength</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities.bone].cls}`}>
                {SEV_PILL[evaluation.systemSeverities.bone].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('bone')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.hipSpineBmdPct,
              secondary: d.femoralNeckBmdPct,
            }))}
            primaryLabel="Hip & Spine %"
            secondaryLabel="Thigh %"
            unit="%"
            thresholdValue={95}
            thresholdLabel="Min 95%"
            status={evaluation.systemSeverities.bone}
          />
        </article>

        <article className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Heart &amp; Fitness</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities.cardio].cls}`}>
                {SEV_PILL[evaluation.systemSeverities.cardio].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('cardio')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.vo2PeakMlKgMin,
            }))}
            primaryLabel="VO2 Fitness"
            unit="ml/kg"
            thresholdValue={env.evaVo2Floor}
            thresholdLabel={`EVA Min ${env.evaVo2Floor}`}
            status={evaluation.systemSeverities.cardio}
          />
        </article>

        <article className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Muscle Strength</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities.muscle].cls}`}>
                {SEV_PILL[evaluation.systemSeverities.muscle].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('muscle')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.strengthPctBaseline,
              secondary: d.muscleCsaPctBaseline,
            }))}
            primaryLabel="Strength %"
            secondaryLabel="CSA %"
            unit="%"
            thresholdValue={80}
            thresholdLabel="Min 80%"
            status={evaluation.systemSeverities.muscle}
          />
        </article>

        <article className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Eye Pressure</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities['vision-sans']].cls}`}>
                {SEV_PILL[evaluation.systemSeverities['vision-sans']].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('vision-sans')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.iopMmHg,
            }))}
            primaryLabel="IOP"
            unit="mmHg"
            thresholdValue={baseline.iopMmHgRange[1]}
            thresholdLabel={`Max ${baseline.iopMmHgRange[1]}`}
            status={evaluation.systemSeverities['vision-sans']}
          />
        </article>

        <article className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Hydration</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities['nutrition-hydration']].cls}`}>
                {SEV_PILL[evaluation.systemSeverities['nutrition-hydration']].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('nutrition-hydration')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.fluidIntakeMl,
              secondary: d.urineOutputMl,
            }))}
            primaryLabel="Water In"
            secondaryLabel="Urine Out"
            unit="mL"
            thresholdValue={baseline.fluidTargetMl}
            thresholdLabel={`Goal ${baseline.fluidTargetMl}`}
            status={evaluation.systemSeverities['nutrition-hydration']}
          />
        </article>

        <article className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold text-white">Radiation</h3>
              <span className={`text-xs font-semibold ${SEV_PILL[evaluation.systemSeverities.radiation].cls}`}>
                {SEV_PILL[evaluation.systemSeverities.radiation].label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenCheckIn('radiation')}
              className="text-sm font-semibold text-zinc-300 hover:text-white cursor-pointer"
            >
              + Update
            </button>
          </div>
          <LongitudinalAreaChart
            data={chartHistory.map((d) => ({
              label: `Sol ${d.sol}`,
              primary: d.cumulativeMissionDoseMsv,
            }))}
            primaryLabel="Mission Total"
            unit="mSv"
            status={evaluation.systemSeverities.radiation}
          />
        </article>
      </div>

      {/* Active Alerts Table */}
      <section className="glass-3d rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-semibold text-white">
            Active Alerts ({filteredAlerts.length})
          </h2>

          <div className="glass-3d-recessed flex items-center gap-1 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setFilterSeverity('all')}
              className={`px-3.5 py-1.5 text-sm rounded-lg cursor-pointer ${
                filterSeverity === 'all' ? 'bg-white text-zinc-950 font-semibold' : 'text-zinc-300 hover:text-white'
              }`}
            >
              All ({evaluation.alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('flagged')}
              className={`px-3.5 py-1.5 text-sm rounded-lg cursor-pointer ${
                filterSeverity === 'flagged' ? 'bg-white text-zinc-950 font-semibold' : 'text-zinc-300 hover:text-white'
              }`}
            >
              Flagged
            </button>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="flex items-center gap-2 py-5 text-base text-emerald-400 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            All parameters within baseline.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredAlerts.map((alert) => {
              const targetSystemId: SystemId | null =
                alert.systemId === 'behavioral' ||
                alert.systemId === 'distance' ||
                alert.systemId === 'hostile-closed'
                  ? null
                  : alert.systemId;
              const targetTab: NavTab | null =
                alert.systemId === 'behavioral'
                  ? 'vault'
                  : alert.systemId === 'distance'
                    ? 'sync'
                    : alert.systemId === 'hostile-closed'
                      ? 'environment'
                      : null;

              return (
                <div
                  key={alert.id}
                  className="py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-sm"
                >
                  <div className="lg:col-span-4 space-y-0.5">
                    <div className="text-xs font-semibold text-zinc-400">
                      {alert.hazardLabel} · {alert.classification}
                    </div>
                    <div className="font-semibold text-white text-base">{alert.title}</div>
                  </div>
                  <div className="lg:col-span-3 tabular-nums text-zinc-200 font-medium">
                    {alert.metricSummary}
                  </div>
                  <div className="lg:col-span-3 text-zinc-300">{alert.recommendedAction}</div>
                  <div className="lg:col-span-2 flex items-center lg:justify-end gap-3">
                    <span
                      className={`font-semibold shrink-0 ${
                        alert.severity === 'urgent'
                          ? 'text-rose-400'
                          : alert.severity === 'data-quality'
                            ? 'text-zinc-400'
                            : 'text-amber-400'
                      }`}
                    >
                      {alert.severity === 'urgent' ? (
                        <span className="inline-flex items-center gap-1">
                          <ShieldAlert className="h-4 w-4" /> Alert
                        </span>
                      ) : alert.severity === 'data-quality' ? (
                        '◌ Stale'
                      ) : (
                        '▲ Watch'
                      )}
                    </span>
                    {targetSystemId && onSelectSystemInHud && (
                      <button
                        type="button"
                        onClick={() => onSelectSystemInHud(targetSystemId)}
                        className="text-xs font-semibold text-white hover:text-zinc-300 cursor-pointer shrink-0"
                      >
                        Inspect →
                      </button>
                    )}
                    {!targetSystemId && targetTab && onNavigateTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateTab(targetTab)}
                        className="text-xs font-semibold text-white hover:text-zinc-300 cursor-pointer shrink-0"
                      >
                        Open →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
