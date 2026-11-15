import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ShieldAlert,
} from 'lucide-react';
import { SYSTEM_KNOWLEDGE } from '../data/nasaStandards';
import { getOrganParametersWithInsights } from '../engine/organInsights';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  AlertSeverity,
  AstronautBaseline,
  AstronautGender,
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  EnvironmentConfig,
  NavTab,
  SPEEventState,
  SystemId,
} from '../types/telemetry';
import { AnatomicalHudSvg } from './AnatomicalHudSvg';
import { LongitudinalAreaChart } from './TelemetryCharts';

interface HudOverviewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  gender: AstronautGender;
  history: DailyTelemetryEntry[];
  vault: BehavioralVaultEntry[];
  evaluation: EvaluationResult;
  selectedSystem: SystemId;
  onSelectSystem: (id: SystemId) => void;
  isXrayMode: boolean;
  onSetXrayMode: (xray: boolean) => void;
  isZoomed: boolean;
  onSetZoomed: (zoomed: boolean) => void;
  completedActionIds: Record<string, boolean>;
  onToggleActionDone: (actionId: string) => void;
  wearableSyncNotice?: string | null;
  onDismissWearableNotice?: () => void;
  speState: SPEEventState;
  onOpenCheckIn: (presetSystem?: SystemId) => void;
  onNavigateTab: (tab: NavTab) => void;
}

const REGION_LABEL: Record<SystemId, string> = {
  'vision-sans': 'Eyes & Brain',
  cardio: 'Heart & Lungs',
  'nutrition-hydration': 'Fluids & Nutrition',
  bone: 'Bone Density',
  muscle: 'Muscles',
  radiation: 'Radiation',
};

const SEVERITY_META: Record<
  AlertSeverity,
  { text: string; short: string; dotColor: string; textColor: string; borderColor: string; bgColor: string }
> = {
  nominal: {
    text: '● Normal',
    short: '● Normal',
    dotColor: '#34D399',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-400/35',
    bgColor: 'bg-emerald-500/12',
  },
  caution: {
    text: '▲ Watch',
    short: '▲ Watch',
    dotColor: '#FBBF24',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-400/35',
    bgColor: 'bg-amber-500/12',
  },
  urgent: {
    text: '✖ Not Normal',
    short: '✖ Not Normal',
    dotColor: '#F87171',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-400/40',
    bgColor: 'bg-rose-500/15',
  },
  'data-quality': {
    text: '◌ Update Needed',
    short: '◌ Update',
    dotColor: '#A1A1AA',
    textColor: 'text-zinc-400',
    borderColor: 'border-white/20',
    bgColor: 'bg-white/5',
  },
};

export const HudOverview: React.FC<HudOverviewProps> = ({
  env,
  baseline,
  gender,
  history,
  vault,
  evaluation,
  selectedSystem,
  onSelectSystem,
  isXrayMode,
  onSetXrayMode,
  isZoomed,
  onSetZoomed,
  completedActionIds,
  onToggleActionDone,
  wearableSyncNotice,
  onDismissWearableNotice,
  speState,
  onOpenCheckIn,
  onNavigateTab,
}) => {
  const [showMoreDetail, setShowMoreDetail] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [expandedInsightIds, setExpandedInsightIds] = useState<Record<string, boolean>>({});

  const latest = history[history.length - 1];
  const last7 = history.slice(-7);
  const latestSleepHours = vault[vault.length - 1]?.sleepHours;
  const knowledge = SYSTEM_KNOWLEDGE[selectedSystem];
  const systemAlerts = evaluation.alerts.filter((a) => a.systemId === selectedSystem);
  const selectedSeverity = evaluation.systemSeverities[selectedSystem];

  const handleSelectBodyPart = (id: SystemId) => {
    if (selectedSystem === id && isZoomed) {
      onSetZoomed(false);
    } else {
      onSelectSystem(id);
      onSetZoomed(true);
    }
  };

  const toggleParameterInsight = (paramKey: string) => {
    setExpandedInsightIds((prev) => ({
      ...prev,
      [paramKey]: !prev[paramKey],
    }));
  };

  const getSelectedChartConfig = () => {
    switch (selectedSystem) {
      case 'bone':
        return {
          title: 'Bone Density %',
          unit: '%',
          threshold: 95,
          thresholdLabel: 'Safe 95%',
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.hipSpineBmdPct,
            secondary: d.femoralNeckBmdPct,
          })),
          secondaryLabel: 'Femur Neck',
        };
      case 'cardio':
        return {
          title: 'Aerobic Fitness',
          unit: 'ml/kg/min',
          threshold: env.evaVo2Floor,
          thresholdLabel: `Floor ${env.evaVo2Floor}`,
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.vo2PeakMlKgMin,
          })),
        };
      case 'muscle':
        return {
          title: 'Muscle Strength %',
          unit: '%',
          threshold: 80,
          thresholdLabel: 'Safe 80%',
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.strengthPctBaseline,
            secondary: d.muscleCsaPctBaseline,
          })),
          secondaryLabel: 'Muscle Size %',
        };
      case 'vision-sans':
        return {
          title: 'Eye Pressure',
          unit: 'mmHg',
          threshold: baseline.iopMmHgRange[1],
          thresholdLabel: `Limit ${baseline.iopMmHgRange[1]}`,
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.iopMmHg,
          })),
        };
      case 'nutrition-hydration':
        return {
          title: 'Fluid Intake',
          unit: 'ml',
          threshold: baseline.fluidTargetMl,
          thresholdLabel: `Target ${baseline.fluidTargetMl}`,
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.fluidIntakeMl,
            secondary: d.urineOutputMl,
          })),
          secondaryLabel: 'Urine',
        };
      case 'radiation':
        return {
          title: 'Daily Radiation',
          unit: 'mSv',
          threshold: env.radiationAmbientRateMsvDay * 1.4,
          thresholdLabel: 'Elevated',
          data: last7.map((d) => ({
            label: `Day ${d.sol}`,
            primary: d.dailyDoseMsv,
          })),
        };
    }
  };

  const plainParams = useMemo(
    () =>
      getOrganParametersWithInsights(
        selectedSystem,
        latest,
        last7,
        baseline,
        env,
        speState,
        latestSleepHours
      ),
    [selectedSystem, latest, last7, baseline, env, speState, latestSleepHours]
  );
  const chartCfg = getSelectedChartConfig();

  const systemMetrics: Record<SystemId, string> = useMemo(
    () => ({
      'vision-sans': latest ? `${latest.iopMmHg} mmHg` : '--',
      radiation: latest ? `${latest.dailyDoseMsv.toFixed(2)} mSv` : '--',
      cardio: latest ? `${latest.restingHrBpm} bpm` : '--',
      'nutrition-hydration': latest ? `${latest.fluidIntakeMl} ml` : '--',
      bone: latest ? `${latest.hipSpineBmdPct.toFixed(1)}%` : '--',
      muscle: latest ? `${latest.strengthPctBaseline.toFixed(1)}%` : '--',
    }),
    [latest]
  );

  // =========================================================================
  // INITIAL LANDING STATE (!isXrayMode): Avatar Only, Zero Parameters
  // =========================================================================
  if (!isXrayMode) {
    return (
      <div className="h-full flex items-center justify-center min-h-0">
        <div className="reveal-up w-full max-w-[760px] h-full min-h-0 flex flex-col">
          <AnatomicalHudSvg
            gender={gender}
            astronautName={baseline.callsign}
            selectedSystem={selectedSystem}
            isXrayMode={false}
            onActivateXray={() => {
              onSetXrayMode(true);
              onSetZoomed(false);
            }}
            onExitXray={() => {
              onSetXrayMode(false);
              onSetZoomed(false);
            }}
            isZoomed={false}
            onSelectPart={handleSelectBodyPart}
            onResetZoom={() => onSetZoomed(false)}
            systemSeverities={evaluation.systemSeverities}
            systemMetrics={systemMetrics}
            speActive={speState.activeWarning}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {wearableSyncNotice && (
        <div className="reveal-panel shrink-0 glass-3d rounded-2xl border-emerald-400/35 px-4 py-2 flex items-center justify-between gap-3 text-sm text-white">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{wearableSyncNotice}</span>
          </span>
          {onDismissWearableNotice && (
            <button
              type="button"
              onClick={onDismissWearableNotice}
              className="text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Hide
            </button>
          )}
        </div>
      )}

      {/* X-RAY BODY STAGE + CLEAN INSPECTOR */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT: Full Uncropped X-Ray Model + Non-Truncating 6-Region Pills */}
        <section className="reveal-up stagger-1 glass-3d lg:col-span-6 rounded-3xl p-4 flex flex-col justify-between gap-3 min-h-0">
          <AnatomicalHudSvg
            gender={gender}
            astronautName={baseline.callsign}
            selectedSystem={selectedSystem}
            isXrayMode={true}
            onActivateXray={() => onSetXrayMode(true)}
            onExitXray={() => {
              onSetXrayMode(false);
              onSetZoomed(false);
            }}
            isZoomed={isZoomed}
            onSelectPart={handleSelectBodyPart}
            onResetZoom={() => onSetZoomed(false)}
            systemSeverities={evaluation.systemSeverities}
            systemMetrics={systemMetrics}
            speActive={speState.activeWarning}
          />

          <div className="grid grid-cols-3 gap-2 shrink-0">
            {(Object.keys(SYSTEM_KNOWLEDGE) as SystemId[]).map((id) => {
              const active = selectedSystem === id;
              const sev = evaluation.systemSeverities[id];
              const meta = SEVERITY_META[sev];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectBodyPart(id)}
                  className={`px-3 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors border cursor-pointer whitespace-nowrap ${
                    active
                      ? `${meta.borderColor} ${meta.bgColor} text-white font-semibold`
                      : 'glass-3d-sub text-zinc-200 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: meta.dotColor }}
                  />
                  <span className="text-xs sm:text-sm font-medium">
                    {REGION_LABEL[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Clean, Spacious Parameter Inspector */}
        <section className="reveal-up stagger-2 glass-3d lg:col-span-6 rounded-3xl p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div
            key={`head-${selectedSystem}`}
            className="reveal-panel shrink-0 flex items-center justify-between gap-3 border-b border-white/10 pb-3"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold">
                <span className={SEVERITY_META[selectedSeverity].textColor}>
                  {SEVERITY_META[selectedSeverity].text}
                </span>
                <span aria-hidden="true" className="text-zinc-500">·</span>
                <span className="text-zinc-400 font-medium">{knowledge.hazardTitle}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-0.5">
                {REGION_LABEL[selectedSystem]}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onOpenCheckIn(selectedSystem)}
              className="btn-mono-primary px-4 py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer shrink-0"
            >
              Update
            </button>
          </div>

          {systemAlerts.length > 0 && (
            <div
              key={`alert-${selectedSystem}`}
              className={`reveal-panel shrink-0 rounded-2xl border px-3.5 py-2.5 flex items-center gap-2.5 text-sm ${
                systemAlerts[0].severity === 'urgent'
                  ? 'border-rose-400/35 bg-rose-500/12 text-rose-100'
                  : 'border-amber-400/35 bg-amber-500/12 text-amber-100'
              }`}
            >
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="font-medium">{systemAlerts[0].title}</span>
            </div>
          )}

          {/* Clean 2x2 Metrics Grid (Concise, Uncluttered) */}
          <div key={`grid-${selectedSystem}`} className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {plainParams.map((param, idx) => {
              const meta = SEVERITY_META[param.severity];
              const isFlagged = param.severity !== 'nominal';
              const staggerCls = `stagger-${Math.min(4, idx + 1)}`;
              const insightKey = `${selectedSystem}:${param.id}`;
              const isInsightOpen = !!expandedInsightIds[insightKey];
              const insightPanelId = `insight-panel-${selectedSystem}-${param.id}`;

              return (
                <div
                  key={param.id}
                  className={`reveal-up ${staggerCls} glass-3d-sub rounded-2xl p-4 space-y-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">
                      {param.label}
                    </span>
                    <span className={`text-xs font-semibold shrink-0 ${meta.textColor}`}>
                      {meta.short}
                    </span>
                  </div>

                  <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${meta.textColor}`}>
                    {param.reading}
                  </div>

                  <div className="text-xs tabular-nums text-zinc-400">
                    {param.vsBaseline}
                  </div>

                  <p className="text-xs text-zinc-300 leading-snug">
                    {param.plainMeaning}
                  </p>

                  {isFlagged && param.insight.steps[0] && (
                    <div className="rounded-xl bg-white/[0.04] border border-white/10 px-2.5 py-2 text-xs text-white leading-snug">
                      <span className="font-semibold text-zinc-300">What to do: </span>
                      {param.insight.steps[0]}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleParameterInsight(insightKey)}
                    aria-expanded={isInsightOpen}
                    aria-controls={insightPanelId}
                    className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                  >
                    <span>{isInsightOpen ? 'Hide Full Guidance' : 'More Guidance'}</span>
                    {isInsightOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isInsightOpen && (
                    <div
                      id={insightPanelId}
                      className="reveal-panel pt-1 space-y-1.5 text-xs text-zinc-300"
                    >
                      <p className="text-zinc-200 font-medium leading-snug">
                        {param.insight.headline}
                      </p>
                      <ul className="space-y-1 text-zinc-300">
                        {param.insight.steps.slice(0, 3).map((step, stepIdx) => (
                          <li key={stepIdx} className="leading-snug">
                            • {step}
                          </li>
                        ))}
                      </ul>
                      {isFlagged && (
                        <button
                          type="button"
                          onClick={() =>
                            param.id === 'solar-storm' || param.id === 'dosimeter-badge'
                              ? onNavigateTab('sync')
                              : onOpenCheckIn(selectedSystem)
                          }
                          className="text-xs font-semibold text-white inline-flex items-center gap-1 pt-0.5 cursor-pointer"
                        >
                          <span>Update Reading</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Compact Collapsible 7-Day Trend */}
          <div className="glass-3d-recessed rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreDetail((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:text-white cursor-pointer"
            >
              <span>7-Day Trend &amp; Guide</span>
              {showMoreDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showMoreDetail && (
              <div className="reveal-panel px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{knowledge.standardsCitation}</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('systems')}
                    className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    All Trends <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <LongitudinalAreaChart
                  data={chartCfg.data}
                  primaryLabel={chartCfg.title}
                  secondaryLabel={chartCfg.secondaryLabel}
                  unit={chartCfg.unit}
                  thresholdValue={chartCfg.threshold}
                  thresholdLabel={chartCfg.thresholdLabel}
                  status={selectedSeverity}
                  height={104}
                />
                <div className="glass-3d-sub rounded-xl p-3 space-y-1.5 text-xs text-zinc-300">
                  <div className="font-semibold text-white">
                    System Guide · {env.shortLabel} ({env.gravityLabel})
                  </div>
                  <p className="leading-snug">{knowledge.whyItMatters}</p>
                  <div className="text-zinc-400 pt-1">
                    <strong className="text-zinc-200">How to check:</strong> {knowledge.examSteps[0]}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Collapsible Daily Actions */}
          <div className="glass-3d-recessed rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setShowActions((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:text-white cursor-pointer"
            >
              <span>Daily Checklist</span>
              <span className="flex items-center gap-2 text-xs tabular-nums text-zinc-400">
                {knowledge.dailyActions.filter((a) => completedActionIds[a.id]).length}/
                {knowledge.dailyActions.length}
                {showActions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {showActions && (
              <div className="reveal-panel px-3 pb-3 pt-1.5 border-t border-white/10 space-y-1.5">
                {knowledge.dailyActions.map((action, idx) => {
                  const done = !!completedActionIds[action.id];
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onToggleActionDone(action.id)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                        done
                          ? 'border-emerald-400/35 bg-emerald-500/12 text-white'
                          : 'glass-3d-sub text-zinc-200 hover:border-white/25'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-500 shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${done ? 'line-through opacity-75' : ''}`}>
                        {idx + 1}. {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
