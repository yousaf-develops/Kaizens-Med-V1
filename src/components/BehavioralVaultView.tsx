import React, { useState } from 'react';
import {
  Clock,
  EyeOff,
  Lock,
  MessageSquareHeart,
  Share2,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  AstronautBaseline,
  BehavioralVaultEntry,
  EnvironmentConfig,
} from '../types/telemetry';
import { LongitudinalAreaChart } from './TelemetryCharts';

interface BehavioralVaultViewProps {
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  vault: BehavioralVaultEntry[];
  evaluation: EvaluationResult;
  onAddVaultEntry: (entry: BehavioralVaultEntry) => void;
  onToggleShareEntry: (id: string) => void;
}

export const BehavioralVaultView: React.FC<BehavioralVaultViewProps> = ({
  env,
  baseline,
  vault,
  evaluation,
  onAddVaultEntry,
  onToggleShareEntry,
}) => {
  const latest = vault[vault.length - 1];

  const [sleepHours, setSleepHours] = useState(latest?.sleepHours ?? 7.2);
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(latest?.sleepQuality ?? 3);
  const [workloadHours, setWorkloadHours] = useState(latest?.workloadHours ?? 6.5);
  const [scheduleControl, setScheduleControl] = useState<1 | 2 | 3 | 4 | 5>(
    latest?.scheduleControl ?? 4
  );
  const [moodScore, setMoodScore] = useState<1 | 2 | 3 | 4 | 5>(latest?.moodScore ?? 4);
  const [stressScore, setStressScore] = useState<1 | 2 | 3 | 4 | 5>(latest?.stressScore ?? 2);
  const [meaningfulWork, setMeaningfulWork] = useState(latest?.meaningfulWork ?? true);
  const [crewCohesionScore, setCrewCohesionScore] = useState<1 | 2 | 3 | 4 | 5>(
    latest?.crewCohesionScore ?? 4
  );
  const [commDelayTension, setCommDelayTension] = useState(false);
  const [journalText, setJournalText] = useState('');
  const [shareOptIn, setShareOptIn] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const missionProgressPct = Math.round((env.currentDay / env.totalMissionDays) * 100);
  const currentQuarter = Math.min(4, Math.max(1, Math.ceil((env.currentDay / env.totalMissionDays) * 4)));
  const weeklyWorkload = vault.slice(-7).reduce((acc, v) => acc + v.workloadHours, 0);

  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const safeSleepHours = Number.isFinite(sleepHours)
      ? Math.min(14, Math.max(0, sleepHours))
      : 7.2;
    const safeWorkloadHours = Number.isFinite(workloadHours)
      ? Math.min(16, Math.max(0, workloadHours))
      : 6.5;

    const newEntry: BehavioralVaultEntry = {
      id: `bv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sol: env.currentDay,
      dateISO: new Date().toISOString().slice(0, 10),
      sleepHours: safeSleepHours,
      sleepQuality,
      wakeTimeISO: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      workloadHours: safeWorkloadHours,
      scheduleControl,
      moodScore,
      stressScore,
      meaningfulWork,
      crewCohesionScore,
      commDelayTension,
      privateJournalText:
        journalText.trim() || 'Private sleep & mood check-in.',
      sharedWithFlightSurgeon: shareOptIn,
    };
    onAddVaultEntry(newEntry);
    setJournalText('');
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Header */}
      <section className="glass-3d rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-white shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Private Sleep &amp; Mood Log
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Entries remain stored on your device unless you choose to share with your flight surgeon.
            </p>
          </div>
        </div>
        <div className="text-right text-sm tabular-nums text-zinc-400">
          <div className="text-white font-semibold">{env.missionDayLabel}</div>
          <div className="mt-0.5">{missionProgressPct}% Complete</div>
        </div>
      </section>

      {/* Guardrail Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-zinc-400" /> Hours Awake
          </div>
          <div className="text-3xl font-bold tabular-nums text-white">
            {evaluation.hoursAwakeNow.toFixed(1)} <span className="text-sm font-normal text-zinc-400">hrs</span>
          </div>
          <div className="text-sm">
            {evaluation.hoursAwakeNow >= 16 ? (
              <span className="text-rose-400 font-semibold">✖ Rest Needed</span>
            ) : evaluation.inSleepInertiaWindow ? (
              <span className="text-amber-400 font-semibold">▲ Waking Up</span>
            ) : (
              <span className="text-emerald-400 font-semibold">● Normal</span>
            )}
          </div>
        </div>

        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-zinc-400" /> Last Sleep
          </div>
          <div className="text-3xl font-bold tabular-nums text-white">
            {latest?.sleepHours.toFixed(1) ?? '0.0'} <span className="text-sm font-normal text-zinc-400">/ {baseline.sleepTargetHours}h</span>
          </div>
          <div className="text-sm flex items-center justify-between gap-2">
            <span className="text-zinc-400">Quality: {latest?.sleepQuality ?? 3}/5</span>
            <span className={(latest?.sleepHours ?? 7) < 6.5 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {(latest?.sleepHours ?? 7) < 6.5 ? '▲ Watch' : '● Normal'}
            </span>
          </div>
        </div>

        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="text-sm font-medium text-zinc-300">7-Day Workload</div>
          <div className="text-3xl font-bold tabular-nums text-white">
            {weeklyWorkload.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ 48h</span>
          </div>
          <div className="text-sm font-semibold">
            {weeklyWorkload > 48 ? (
              <span className="text-amber-400">▲ High Workload</span>
            ) : (
              <span className="text-emerald-400">● Normal</span>
            )}
          </div>
        </div>

        <div className="glass-3d glass-3d-interactive rounded-3xl p-5 space-y-1.5">
          <div className="text-sm font-medium text-zinc-300">Mission Progress</div>
          <div className="text-3xl font-bold tabular-nums text-white">
            Quarter {currentQuarter} <span className="text-sm font-normal text-zinc-400">of 4</span>
          </div>
          <div className="text-sm text-zinc-400">
            Day {env.currentDay} of {env.totalMissionDays}
          </div>
        </div>
      </div>

      {/* Sleep & Radiation Link */}
      <div className="glass-3d-recessed rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-zinc-300">
        <span>
          <strong className="text-white">Radiation &amp; Sleep Link:</strong>{' '}
          Links sleep and stress entries with radiation logs for flight surgeon review.
        </span>
        <span className="font-semibold text-zinc-200 tabular-nums">
          Radiation: {evaluation.hazardSeverities['space-radiation'] === 'nominal' ? '● Normal' : '▲ Watch'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveCheckIn}
          className="glass-3d lg:col-span-5 rounded-3xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-white">
              Daily Entry (Day {env.currentDay})
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">
              <EyeOff className="inline h-3 w-3 mr-1" /> Private
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-zinc-300 font-medium">Sleep (hours)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={sleepHours}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) setSleepHours(val);
                }}
                className="w-full rounded-xl glass-3d-recessed px-3 py-2 text-base font-mono text-white focus:outline-none focus:border-white/35"
              />
            </label>

            <label className="space-y-1">
              <span className="text-zinc-300 font-medium">Workload (hours)</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="16"
                value={workloadHours}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) setWorkloadHours(val);
                }}
                className="w-full rounded-xl glass-3d-recessed px-3 py-2 text-base font-mono text-white focus:outline-none focus:border-white/35"
              />
            </label>
          </div>

          {[
            { label: 'Sleep Quality', val: sleepQuality, set: setSleepQuality },
            { label: 'Schedule Control', val: scheduleControl, set: setScheduleControl },
            { label: 'Mood', val: moodScore, set: setMoodScore },
            { label: 'Stress Level', val: stressScore, set: setStressScore },
            { label: 'Crew Cohesion', val: crewCohesionScore, set: setCrewCohesionScore },
          ].map((scale) => (
            <div key={scale.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-white font-medium">{scale.label}</span>
                <span className="font-mono text-zinc-400">{scale.val}/5</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => scale.set(n)}
                    className={`py-2 rounded-xl text-sm font-mono border transition-colors cursor-pointer ${
                      scale.val === n
                        ? 'border-white bg-white text-zinc-950 font-bold'
                        : 'glass-3d-recessed text-zinc-300 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2 pt-1 text-xs">
            <label className="glass-3d-recessed flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer">
              <span className="text-zinc-200">Work felt meaningful today</span>
              <input
                type="checkbox"
                checked={meaningfulWork}
                onChange={(e) => setMeaningfulWork(e.target.checked)}
                className="rounded border-white/25 accent-white"
              />
            </label>
            <label className="glass-3d-recessed flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer">
              <span className="text-zinc-200">Earth comms delay caused stress</span>
              <input
                type="checkbox"
                checked={commDelayTension}
                onChange={(e) => setCommDelayTension(e.target.checked)}
                className="rounded border-white/25 accent-amber-400"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="text-zinc-200 font-medium">Private Reflection</span>
            <textarea
              rows={2}
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="Optional note..."
              className="w-full rounded-xl glass-3d-recessed px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/35"
            />
          </label>

          <label className="glass-3d-recessed flex items-center gap-2.5 rounded-xl p-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shareOptIn}
              onChange={(e) => setShareOptIn(e.target.checked)}
              className="rounded border-white/25 accent-white"
            />
            <span className="text-zinc-300">Share summary with flight surgeon</span>
          </label>

          <button
            type="submit"
            className="btn-mono-primary w-full py-3 rounded-full font-semibold text-base transition-all cursor-pointer"
          >
            {savedNotice ? 'Saved On Device' : 'Save Private Entry'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass-3d rounded-3xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">
                Sleep vs. Workload
              </h3>
              <LongitudinalAreaChart
                data={vault.slice(-7).map((v) => ({
                  label: `Day ${v.sol}`,
                  primary: v.sleepHours,
                  secondary: v.workloadHours,
                }))}
                primaryLabel="Sleep"
                secondaryLabel="Workload"
                unit="h"
                thresholdValue={8}
                thresholdLabel="8h Target"
              />
            </div>

            <div className="glass-3d rounded-3xl p-5 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Healthy Habits
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-zinc-300 list-disc pl-4">
                  <li>Aim for 8 hours of sleep each night.</li>
                  <li>Protect dedicated quiet recovery time daily.</li>
                  <li>Check in regularly with crewmates and family.</li>
                </ul>
              </div>
              <div className="glass-3d-sub rounded-2xl p-3 text-xs sm:text-sm text-zinc-300 flex items-start gap-2">
                <MessageSquareHeart className="h-4 w-4 shrink-0 mt-0.5 text-white" />
                <span>Confidential flight surgeon support is available anytime.</span>
              </div>
            </div>
          </div>

          <section className="glass-3d rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-white">
                Past Entries
              </h3>
              <span className="text-xs font-mono text-zinc-400">
                {vault.filter((v) => v.sharedWithFlightSurgeon).length}/{vault.length} shared
              </span>
            </div>

            <div className="divide-y divide-white/10 max-h-[360px] overflow-y-auto pr-1">
              {[...vault].reverse().map((entry) => (
                <div key={entry.id} className="py-3 space-y-1.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-zinc-300 text-xs sm:text-sm">
                      <span className="text-white font-semibold">Day {entry.sol}</span>
                      <span className="mx-1.5 text-zinc-500">·</span>
                      <span>Sleep {entry.sleepHours}h</span>
                      <span className="mx-1.5 text-zinc-500">·</span>
                      <span>Workload {entry.workloadHours}h</span>
                      <span className="mx-1.5 text-zinc-500">·</span>
                      <span>Mood {entry.moodScore}/5</span>
                    </div>

                    <button
                      onClick={() => onToggleShareEntry(entry.id)}
                      className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors flex items-center gap-1 cursor-pointer ${
                        entry.sharedWithFlightSurgeon
                          ? 'border-white bg-white text-zinc-950 font-semibold'
                          : 'glass-3d-recessed text-zinc-300 hover:text-white hover:border-white/30'
                      }`}
                    >
                      {entry.sharedWithFlightSurgeon ? (
                        <>
                          <Share2 className="h-3 w-3" /> Shared
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3" /> Private
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{entry.privateJournalText}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
