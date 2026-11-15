import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Flame,
  HardDrive,
  RadioTower,
  RotateCcw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { EvaluationResult } from '../engine/ruleEngine';
import {
  BehavioralVaultEntry,
  DailyTelemetryEntry,
  DeltaSyncPacket,
  EnvironmentConfig,
} from '../types/telemetry';

interface SyncQueueViewProps {
  env: EnvironmentConfig;
  syncQueue: DeltaSyncPacket[];
  evaluation: EvaluationResult;
  history: DailyTelemetryEntry[];
  vault: BehavioralVaultEntry[];
  isOnline: boolean;
  onTransmitQueued: () => void;
  onResetWorkspace: () => void;
  onPatchTelemetry?: (patch: Partial<DailyTelemetryEntry>, syncLabel?: string) => void;
}

export const SyncQueueView: React.FC<SyncQueueViewProps> = ({
  env,
  syncQueue,
  evaluation,
  history,
  vault,
  isOnline,
  onTransmitQueued,
  onResetWorkspace,
  onPatchTelemetry,
}) => {
  const [transmitting, setTransmitting] = useState(false);
  const latest = history[history.length - 1];
  const commBroken = !!latest?.commBreakdownFlag;
  const seuFault = latest?.seuChecksumOk === false;

  const queuedCount = syncQueue.filter((p) => p.status === 'queued').length;
  const totalQueuedBytes = syncQueue
    .filter((p) => p.status === 'queued')
    .reduce((acc, p) => acc + p.payloadBytes, 0);

  const handleBurstSync = () => {
    if (queuedCount === 0) return;
    setTransmitting(true);
    window.setTimeout(() => {
      onTransmitQueued();
      setTransmitting(false);
    }, 1000);
  };

  const handleExportReport = () => {
    const sharedVaultOnly = vault.filter((v) => v.sharedWithFlightSurgeon);
    const exportPayload = {
      exportedAtISO: new Date().toISOString(),
      environment: env.label,
      latestTelemetry: history[history.length - 1],
      activeAlerts: evaluation.alerts,
      explicitlySharedBehavioralEntries: sharedVaultOnly,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaizens-med-sol-${env.currentDay}-delta-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="glass-3d rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-zinc-400">
            Hazard 3 · Distance from Earth · CHP-IDA / CSA Bio-Monitor / OSDR
          </div>
          <span className="text-sm sm:text-base font-medium text-white">
            Autonomous Edge Sync &amp; Communication Latency ({env.oneWayLatencyLabel})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportReport}
            className="btn-mono-glass px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="btn-mono-glass px-4 py-2 rounded-full hover:border-rose-400/60 text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Hazard 3 Crew-Ground Comms & SEU Resilience */}
      {onPatchTelemetry && latest && (
        <section className="glass-3d rounded-3xl p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 items-center">
          <div className="glass-3d-recessed rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400">3.1 Crew-Ground Comms</div>
              <div className={`text-sm font-semibold mt-0.5 ${commBroken ? 'text-amber-400' : 'text-emerald-400'}`}>
                {commBroken ? '▲ Breakdown / Delay Logged' : '● Async Protocol Nominal'}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onPatchTelemetry(
                  { commBreakdownFlag: !commBroken },
                  commBroken ? 'Comm breakdown resolved' : 'Delayed crew-ground comm breakdown logged'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer shrink-0 ${
                commBroken ? 'border-amber-400 bg-amber-400 text-zinc-950' : 'btn-mono-glass'
              }`}
            >
              {commBroken ? 'Clear' : 'Log Delay'}
            </button>
          </div>

          <div className="glass-3d-recessed rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400">3.2 SEU Hardware Checksum</div>
              <div className={`text-sm font-semibold mt-0.5 ${seuFault ? 'text-amber-400' : 'text-emerald-400'}`}>
                {seuFault ? '◌ Bit-Flip Verification Needed' : '● Parity & Vault Intact'}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onPatchTelemetry(
                  { seuChecksumOk: seuFault },
                  seuFault ? 'SEU memory checksum verified' : 'Simulated radiation SEU checksum mismatch'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer shrink-0 ${
                seuFault ? 'border-amber-400 bg-amber-400 text-zinc-950' : 'btn-mono-glass'
              }`}
            >
              {seuFault ? 'Verify' : 'Test SEU'}
            </button>
          </div>

          <div className="glass-3d-recessed rounded-2xl p-4">
            <div className="text-xs text-zinc-400">Bandwidth Store-and-Forward</div>
            <div className="text-sm font-semibold text-white mt-0.5">
              Offline Edge + Delta Compression
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              Non-medical-officer guided steps active locally
            </div>
          </div>
        </section>
      )}

      {/* Habit Streaks */}
      <section className="glass-3d rounded-3xl p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Flame className="h-5 w-5 text-white" />
          Daily Streaks
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="glass-3d-recessed rounded-2xl p-4">
            <div className="text-sm text-zinc-400">ARED Lift</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {evaluation.streaks.aredStreakDays} <span className="text-sm font-normal text-zinc-400">days</span>
            </div>
          </div>
          <div className="glass-3d-recessed rounded-2xl p-4">
            <div className="text-sm text-zinc-400">Hydration</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {evaluation.streaks.hydrationStreakDays} <span className="text-sm font-normal text-zinc-400">days</span>
            </div>
          </div>
          <div className="glass-3d-recessed rounded-2xl p-4">
            <div className="text-sm text-zinc-400">Sleep Logs</div>
            <div className="text-3xl font-bold tabular-nums text-emerald-400 mt-1">
              {evaluation.streaks.sleepLogStreakDays} <span className="text-sm font-normal text-zinc-400">entries</span>
            </div>
          </div>
          <div className="glass-3d-recessed rounded-2xl p-4">
            <div className="text-sm text-zinc-400">Focus Tests</div>
            <div className="text-3xl font-bold tabular-nums text-white mt-1">
              {evaluation.streaks.pvtCheckInCount} <span className="text-sm font-normal text-zinc-400">runs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Earth Link & Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="glass-3d lg:col-span-4 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
              <RadioTower className="h-5 w-5 text-zinc-300" /> Earth Link
            </h2>
            <span className="text-sm tabular-nums text-zinc-400">{env.oneWayLatencyLabel}</span>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-zinc-400">Storage</span>
              <span className="text-emerald-400 font-semibold">● Local Saved</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-zinc-400">Signal</span>
              <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isOnline ? '● Relay Ready' : '▲ Offline'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-zinc-400">Queued</span>
              <span className="text-white font-semibold tabular-nums">
                {queuedCount} ({totalQueuedBytes} B)
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-400">Vault</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Protected
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBurstSync}
            disabled={queuedCount === 0 || transmitting}
            className="btn-mono-primary w-full py-3 rounded-full disabled:opacity-40 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" />
            {transmitting
              ? 'Sending...'
              : queuedCount === 0
                ? 'All Sent'
                : `Send ${queuedCount} Update${queuedCount > 1 ? 's' : ''}`}
          </button>
        </section>

        <section className="glass-3d lg:col-span-8 rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-zinc-300" /> Update Log
            </h2>
            <span className="text-sm tabular-nums text-zinc-400">{syncQueue.length} packets</span>
          </div>

          <div className="divide-y divide-white/10">
            {[...syncQueue].reverse().map((pkt) => (
              <div key={pkt.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-zinc-300 font-semibold">Sol {pkt.sol}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-white font-medium">{pkt.domain}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400">{pkt.payloadBytes} B</span>
                  </div>
                  <p className="text-zinc-300">{pkt.summary}</p>
                </div>

                <div className="text-sm shrink-0 font-semibold">
                  {pkt.status === 'acknowledged' ? (
                    <span className="text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Sent
                    </span>
                  ) : (
                    <span className="text-amber-400">▲ Queued</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
