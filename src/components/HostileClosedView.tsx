import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Utensils,
  Wind,
} from 'lucide-react';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  AstronautBaseline,
  DailyTelemetryEntry,
  EnvironmentConfig,
  EvaPhaseStatus,
  NavTab,
} from '../types/telemetry';

interface HostileClosedViewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  latest: DailyTelemetryEntry | undefined;
  evaluation: EvaluationResult;
  onPatchTelemetry: (patch: Partial<DailyTelemetryEntry>, syncLabel?: string) => void;
  onNavigateTab: (tab: NavTab) => void;
}

const EVA_PHASES: EvaPhaseStatus[] = [
  'Nominal / Inside',
  'Pre-EVA Prep',
  'In-EVA Spacewalk',
  'Post-EVA Recovery',
];

const EVA_SYMPTOM_OPTIONS = [
  'Dizziness',
  'Shortness of breath',
  'Chest discomfort',
  'Joint / decompression pain',
  'Skin rash',
];

const IMMUNE_SYMPTOM_OPTIONS = [
  'Fever',
  'Skin rash',
  'Sore throat',
  'Persistent fatigue',
  'Allergic flare',
];

export const HostileClosedView: React.FC<HostileClosedViewProps> = ({
  env,
  baseline,
  latest,
  evaluation,
  onPatchTelemetry,
  onNavigateTab,
}) => {
  const [showPlainGuide, setShowPlainGuide] = useState(false);
  if (!latest) return null;

  const envStale = latest.envDataStatus === 'stale';
  const temp = latest.cabinTempC ?? 22.3;
  const pressure = latest.cabinPressureKpa ?? 101.3;
  const co2 = latest.cabinCo2MmHg ?? 2.8;
  const o2 = latest.cabinO2Pct ?? 20.9;
  const noise = latest.cabinNoiseDba ?? 61;

  const evaPhase = latest.evaStatus ?? 'Nominal / Inside';
  const evaSymptoms = latest.evaSymptoms ?? [];
  const evaUrgent = !!latest.evaUrgentSymptom;

  const foodScore = latest.foodAcceptabilityScore ?? 4;
  const foodSafetyFlag = !!latest.foodSafetyFlag;
  const immuneSymptoms = latest.immuneInfectionSymptoms ?? [];
  const microbiomeShift = !!latest.microbiomeSymptomsFlag;

  const h5Alerts = evaluation.alerts.filter((a) => a.hazardId === 'hostile-closed');
  const h5Severity = evaluation.hazardSeverities['hostile-closed'];

  const toggleItem = (list: string[], item: string) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const isTempOut =
    temp < baseline.cabinTempCRange[0] || temp > baseline.cabinTempCRange[1];
  const isPressureOut =
    pressure < baseline.cabinPressureKpaRange[0] ||
    pressure > baseline.cabinPressureKpaRange[1];
  const isCo2Elevated = co2 > baseline.cabinCo2MaxMmHg;
  const isO2Out =
    o2 < baseline.cabinO2PctRange[0] || o2 > baseline.cabinO2PctRange[1];

  return (
    <div className="space-y-5">
      {/* Header Strip */}
      <section className="glass-3d rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-400">
            <span className="font-semibold text-white">Hazard 5 · Hostile / Closed Environments</span>
            <span aria-hidden="true">·</span>
            <span>{env.vehicle}</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Cabin, EVA &amp; Crew Environment
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded-full glass-3d-recessed ${
              h5Severity === 'urgent'
                ? 'text-rose-400'
                : h5Severity === 'caution'
                  ? 'text-amber-400'
                  : h5Severity === 'data-quality'
                    ? 'text-zinc-300'
                    : 'text-emerald-400'
            }`}
          >
            {h5Severity === 'urgent'
              ? '✖ Action Needed'
              : h5Severity === 'caution'
                ? '▲ Watch'
                : h5Severity === 'data-quality'
                  ? '◌ Data Stale'
                  : '● Normal'}
          </span>
          <button
            type="button"
            onClick={() => setShowPlainGuide((prev) => !prev)}
            className="btn-mono-glass px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-emerald-400" />
            Simple Guide
            {showPlainGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('research')}
            className="btn-mono-glass px-4 py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer"
          >
            5 Hazards Spec →
          </button>
        </div>
      </section>

      {/* Plain-Language Guide & Current Environment Health Notes */}
      {showPlainGuide && (
        <section className="reveal-panel glass-3d rounded-3xl p-5 space-y-3 text-sm text-zinc-300">
          <div className="font-semibold text-white">
            Plain-Language Cabin &amp; EVA Guide ({env.shortLabel} · {env.gravityLabel})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div className="glass-3d-recessed rounded-2xl p-3 space-y-1">
              <div className="font-semibold text-white">Cabin Air (CO₂ &amp; Pressure)</div>
              <p>High CO₂ (&gt; 3.0 mmHg) causes headaches &amp; slow focus even before alarms sound. Normal pressure (~101 kPa) keeps oxygen easy to breathe.</p>
            </div>
            <div className="glass-3d-recessed rounded-2xl p-3 space-y-1">
              <div className="font-semibold text-white">Spacewalk (EVA) Signs</div>
              <p>Log joint aches, dizziness, skin rashes, or breathlessness around any EVA. Chest pain or severe breathlessness is an urgent stop signal.</p>
            </div>
            <div className="glass-3d-recessed rounded-2xl p-3 space-y-1">
              <div className="font-semibold text-white">{env.shortLabel} Watch Points</div>
              <p>{env.environmentHealthInsights[0]}</p>
            </div>
          </div>
        </section>
      )}

      {/* Active Hazard 5 Alert Banner if any */}
      {h5Alerts.length > 0 && (
        <section
          className={`reveal-panel glass-3d rounded-3xl p-4 sm:p-5 space-y-2 border ${
            h5Severity === 'urgent'
              ? 'border-rose-400/50 bg-rose-500/12'
              : h5Severity === 'data-quality'
                ? 'border-amber-400/45 bg-amber-500/12'
                : 'border-amber-400/35 bg-amber-500/10'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Active Environment Triggers ({h5Alerts.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {h5Alerts.map((alert) => (
              <div
                key={alert.id}
                className="glass-3d-recessed rounded-2xl px-3.5 py-2.5 text-sm space-y-0.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{alert.title}</span>
                  <span className="text-xs text-zinc-400">{alert.classification}</span>
                </div>
                <p className="text-xs text-zinc-300">{alert.recommendedAction}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5.1 Cabin Environment + Data Availability Guard */}
      <section className="glass-3d rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Wind className="h-5 w-5 text-white shrink-0" />
            <div>
              <h3 className="text-lg font-display font-semibold text-white">
                5.1 Cabin Environment
              </h3>
              <p className="text-xs text-zinc-400">
                Missing or stale telemetry is flagged as a Data-Quality trigger, never Normal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onPatchTelemetry(
                { envDataStatus: envStale ? 'measured' : 'stale' },
                envStale ? 'Cabin Sensor Restored' : 'Cabin Sensor Marked Stale'
              )
            }
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              envStale
                ? 'border-amber-400/60 bg-amber-400 text-zinc-950'
                : 'btn-mono-glass'
            }`}
          >
            <Database className="h-4 w-4" />
            {envStale ? 'Restore Env Sensor' : 'Simulate Stale Env Sensor'}
          </button>
        </div>

        {envStale && (
          <div className="rounded-2xl border border-amber-400/45 bg-amber-500/14 p-3.5 flex items-start gap-2.5 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Environmental Data Unavailable:</strong> Cabin telemetry is stale or unverified. Cabin state cannot be labeled Normal until ECLSS bus measurements resume.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="glass-3d-sub rounded-2xl p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Cabin Temp</div>
            <div className={`text-2xl font-bold tabular-nums ${envStale ? 'text-zinc-400' : isTempOut ? 'text-rose-400' : 'text-white'}`}>
              {envStale ? '--' : `${temp.toFixed(1)}°C`}
            </div>
            <div className="text-xs text-zinc-400 tabular-nums">
              Range {baseline.cabinTempCRange[0]}–{baseline.cabinTempCRange[1]}°C
            </div>
          </div>

          <div className="glass-3d-sub rounded-2xl p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Cabin Pressure</div>
            <div className={`text-2xl font-bold tabular-nums ${envStale ? 'text-zinc-400' : isPressureOut ? 'text-rose-400' : 'text-white'}`}>
              {envStale ? '--' : `${pressure.toFixed(1)} kPa`}
            </div>
            <div className="text-xs text-zinc-400 tabular-nums">
              Range {baseline.cabinPressureKpaRange[0]}–{baseline.cabinPressureKpaRange[1]}
            </div>
          </div>

          <div className="glass-3d-sub rounded-2xl p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">CO2 Partial</div>
            <div className={`text-2xl font-bold tabular-nums ${envStale ? 'text-zinc-400' : isCo2Elevated ? 'text-amber-400' : 'text-emerald-400'}`}>
              {envStale ? '--' : `${co2.toFixed(1)} mmHg`}
            </div>
            <div className="text-xs text-zinc-400 tabular-nums">
              Target &le; {baseline.cabinCo2MaxMmHg.toFixed(1)} mmHg
            </div>
          </div>

          <div className="glass-3d-sub rounded-2xl p-4 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Oxygen (O2)</div>
            <div className={`text-2xl font-bold tabular-nums ${envStale ? 'text-zinc-400' : isO2Out ? 'text-rose-400' : 'text-white'}`}>
              {envStale ? '--' : `${o2.toFixed(1)}%`}
            </div>
            <div className="text-xs text-zinc-400 tabular-nums">
              Safe {baseline.cabinO2PctRange[0]}–{baseline.cabinO2PctRange[1]}%
            </div>
          </div>

          <div className="glass-3d-sub rounded-2xl p-4 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-xs text-zinc-400 font-medium">Cabin Noise</div>
            <div className={`text-2xl font-bold tabular-nums ${envStale ? 'text-zinc-400' : noise >= 68 ? 'text-amber-400' : 'text-white'}`}>
              {envStale ? '--' : `${noise} dBA`}
            </div>
            <div className="text-xs text-zinc-400 tabular-nums">Acoustic fatigue check</div>
          </div>
        </div>
      </section>

      {/* 5.2 EVA-Related Health Monitoring & 5.3 Food / Immune / Microbiome */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* 5.2 EVA Health Monitoring */}
        <section className="glass-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-white shrink-0" />
                <h3 className="text-lg font-display font-semibold text-white">
                  5.2 EVA Health Monitoring
                </h3>
              </div>
              <span className="text-xs font-medium text-zinc-400">
                Monitoring &amp; logging only
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">EVA Phase Status</div>
              <div className="grid grid-cols-2 gap-2">
                {EVA_PHASES.map((phase) => {
                  const active = evaPhase === phase;
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() =>
                        onPatchTelemetry(
                          { evaStatus: phase },
                          `EVA status updated: ${phase}`
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-white border-white text-zinc-950'
                          : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {phase}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">Pre / In / Post-EVA Symptoms</div>
              <div className="flex flex-wrap gap-1.5">
                {EVA_SYMPTOM_OPTIONS.map((sym) => {
                  const checked = evaSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() =>
                        onPatchTelemetry(
                          { evaSymptoms: toggleItem(evaSymptoms, sym) },
                          `EVA symptom log updated`
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        checked
                          ? 'border-amber-400 bg-amber-400/20 text-amber-200 font-semibold'
                          : 'glass-3d-recessed text-zinc-300 hover:text-white'
                      }`}
                    >
                      {checked ? `▲ ${sym}` : sym}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2.5 rounded-2xl border border-rose-400/35 bg-rose-500/12 p-3 text-xs sm:text-sm text-rose-100 cursor-pointer">
              <input
                type="checkbox"
                checked={evaUrgent}
                onChange={(e) =>
                  onPatchTelemetry(
                    { evaUrgentSymptom: e.target.checked },
                    e.target.checked ? 'Urgent EVA symptom flagged' : 'Urgent EVA symptom cleared'
                  )
                }
                className="accent-rose-600"
              />
              <span>Severe breathlessness, chest pain, or acute incapacitation (Urgent EVA Trigger)</span>
            </label>
          </div>

          <div className="glass-3d-recessed rounded-2xl p-3 text-xs text-zinc-400 leading-relaxed">
            Safety boundary: Supports EVA symptom logging and escalation only — official mission medical/operations authority determines EVA approval or clearance.
          </div>
        </section>

        {/* 5.3 Food Acceptability/Safety, Immune/Infection & Microbiome */}
        <section className="glass-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-white shrink-0" />
              <h3 className="text-lg font-display font-semibold text-white">
                5.3 Food, Immune &amp; Microbiome
              </h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Food Acceptability &amp; Variety</span>
                <span className="tabular-nums text-zinc-400">{foodScore}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      onPatchTelemetry(
                        { foodAcceptabilityScore: n },
                        `Food acceptability logged: ${n}/5`
                      )
                    }
                    className={`py-2 rounded-xl text-sm font-semibold border transition-colors cursor-pointer tabular-nums ${
                      foodScore === n
                        ? 'bg-white border-white text-zinc-950 font-bold'
                        : 'glass-3d-recessed text-zinc-300 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <label className="glass-3d-recessed flex items-center gap-2.5 rounded-2xl p-3 text-xs sm:text-sm text-zinc-200 cursor-pointer hover:border-white/25">
              <input
                type="checkbox"
                checked={foodSafetyFlag}
                onChange={(e) =>
                  onPatchTelemetry(
                    { foodSafetyFlag: e.target.checked },
                    'Food safety / adverse GI check updated'
                  )
                }
                className="accent-rose-600"
              />
              <span>Spoiled food, swollen pouch, or acute food-linked GI distress</span>
            </label>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-300">
                Immune, Infection &amp; Sensitivity Tracking
              </div>
              <div className="flex flex-wrap gap-1.5">
                {IMMUNE_SYMPTOM_OPTIONS.map((sym) => {
                  const checked = immuneSymptoms.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() =>
                        onPatchTelemetry(
                          { immuneInfectionSymptoms: toggleItem(immuneSymptoms, sym) },
                          'Immune symptom log updated'
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        checked
                          ? 'border-amber-400 bg-amber-400/20 text-amber-200 font-semibold'
                          : 'glass-3d-recessed text-zinc-300 hover:text-white'
                      }`}
                    >
                      {checked ? `▲ ${sym}` : sym}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="glass-3d-recessed flex items-center gap-2.5 rounded-2xl p-3 text-xs sm:text-sm text-zinc-200 cursor-pointer hover:border-white/25">
              <input
                type="checkbox"
                checked={microbiomeShift}
                onChange={(e) =>
                  onPatchTelemetry(
                    { microbiomeSymptomsFlag: e.target.checked },
                    'Microbiome GI/skin log updated'
                  )
                }
                className="accent-amber-500"
              />
              <span>Persistent GI change or recurrent skin irritation (Microbiome review)</span>
            </label>
          </div>

          <div className="glass-3d-recessed rounded-2xl p-3 text-xs text-zinc-400 leading-relaxed">
            Links persistent food-aversion or immune logs to nutrition intake and crew medical review without automated clinical diagnosis.
          </div>
        </section>
      </div>
    </div>
  );
};
