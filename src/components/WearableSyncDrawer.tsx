import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Battery,
  Bluetooth,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  Unplug,
  Watch,
  X,
} from 'lucide-react';
import { DEFAULT_BASELINE } from '../data/nasaStandards';
import { payloadFromBleSnapshot } from '../engine/bluetoothWearable';
import {
  compareReadingToBaseline,
  parseWearableFileOrText,
  readingFromTelemetry,
  WEARABLE_PRESETS,
} from '../engine/wearableBaseline';
import { useBluetoothWearable } from '../hooks/useBluetoothWearable';
import {
  AstronautBaseline,
  BaselineVerdict,
  DailyTelemetryEntry,
  EnvironmentConfig,
  WearableReadingPayload,
} from '../types/telemetry';

interface WearableSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  env: EnvironmentConfig;
  baseline: AstronautBaseline;
  latest: DailyTelemetryEntry;
  latestSleepHours?: number;
  ble: ReturnType<typeof useBluetoothWearable>;
  onApplyWearableReading: (reading: WearableReadingPayload) => void;
  onSaveBaseline: (nextBaseline: AstronautBaseline) => void;
}

type SyncMode = 'bluetooth' | 'import' | 'manual' | 'baseline';

const VERDICT_STYLE: Record<
  BaselineVerdict,
  { badge: string; label: string; rowBorder: string }
> = {
  normal: {
    badge: 'text-emerald-400',
    label: '● Normal',
    rowBorder: 'border-white/10',
  },
  borderline: {
    badge: 'text-amber-400',
    label: '▲ Watch',
    rowBorder: 'border-amber-400/35',
  },
  'not-normal': {
    badge: 'text-rose-400',
    label: '✖ Alert',
    rowBorder: 'border-rose-400/40',
  },
};

export const WearableSyncDrawer: React.FC<WearableSyncDrawerProps> = ({
  isOpen,
  onClose,
  env,
  baseline,
  latest,
  latestSleepHours,
  ble,
  onApplyWearableReading,
  onSaveBaseline,
}) => {
  const isBleStreaming = ble.status === 'connected' || ble.status === 'simulated';

  const [mode, setMode] = useState<SyncMode>(() =>
    isBleStreaming ? 'bluetooth' : 'import'
  );
  const [draftReading, setDraftReading] = useState<WearableReadingPayload>(() => {
    if (isBleStreaming && ble.deviceInfo) {
      return {
        ...readingFromTelemetry(latest, latestSleepHours),
        ...payloadFromBleSnapshot(ble.deviceInfo.name, ble.snapshot),
      };
    }
    return readingFromTelemetry(latest, latestSleepHours);
  });
  const [pasteText, setPasteText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Baseline editor state
  const [editBaseline, setEditBaseline] = useState<AstronautBaseline>(baseline);
  const [baselineSavedToast, setBaselineSavedToast] = useState(false);

  useEffect(() => {
    setEditBaseline(baseline);
  }, [baseline]);

  // Keep draft comparator synced in real time when live Bluetooth packets arrive in bluetooth mode
  useEffect(() => {
    if (!isBleStreaming || !ble.deviceInfo || mode !== 'bluetooth') return;
    if (ble.snapshot.packetCount === 0 && !ble.snapshot.bpm) return;
    const livePayload = payloadFromBleSnapshot(ble.deviceInfo.name, ble.snapshot);
    setDraftReading((prev) => ({
      ...prev,
      deviceName: livePayload.deviceName,
      sourceType: 'bluetooth',
      capturedAtISO: livePayload.capturedAtISO,
      restingHrBpm: livePayload.restingHrBpm ?? prev.restingHrBpm,
      hrvMs: livePayload.hrvMs ?? prev.hrvMs,
      spo2Pct: livePayload.spo2Pct ?? prev.spo2Pct,
      bodyTempC: livePayload.bodyTempC ?? prev.bodyTempC,
      bpSystolic: livePayload.bpSystolic ?? prev.bpSystolic,
      bpDiastolic: livePayload.bpDiastolic ?? prev.bpDiastolic,
      bloodGlucoseMgDl: livePayload.bloodGlucoseMgDl ?? prev.bloodGlucoseMgDl,
    }));
  }, [ble.deviceInfo, ble.snapshot, isBleStreaming, mode]);

  const comparison = useMemo(
    () => compareReadingToBaseline(draftReading, baseline, env),
    [draftReading, baseline, env]
  );

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseWearableFileOrText(text, file.name);
      if (parsed) {
        setDraftReading(parsed);
        setStatusMessage(`Imported readings from ${file.name} and compared against your baseline.`);
      } else {
        setStatusMessage(
          `Could not detect vital columns in ${file.name}. Try CSV/JSON with headers like hr, spo2, temp, glucose, bp_sys, bp_dia.`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleParseText = () => {
    const parsed = parseWearableFileOrText(pasteText, 'Pasted Wearable Data');
    if (parsed) {
      setDraftReading(parsed);
      setStatusMessage('Parsed wearable text and compared against baseline.');
    } else {
      setStatusMessage(
        'No readable vitals found. Try e.g. "HR: 84, SpO2: 96%, Temp: 37.8C, Glucose: 105, BP: 128/82".'
      );
    }
  };

  const handleApplyToHud = () => {
    onApplyWearableReading(draftReading);
    onClose();
  };

  const handleSaveBaseline = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBaseline(editBaseline);
    setBaselineSavedToast(true);
    window.setTimeout(() => setBaselineSavedToast(false), 2500);
  };

  const updateNumberField = (key: keyof WearableReadingPayload, raw: string) => {
    if (raw === '') {
      setDraftReading((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    const num = Number(raw);
    if (Number.isFinite(num)) {
      setDraftReading((prev) => ({
        ...prev,
        sourceType: 'manual',
        capturedAtISO: new Date().toISOString(),
        [key]: num,
      }));
    }
  };

  const updateBaselineScalar = (
    updater: (num: number, cur: AstronautBaseline) => AstronautBaseline,
    raw: string
  ) => {
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) return;
    setEditBaseline((cur) => updater(num, cur));
  };

  const bpmSeries = ble.snapshot.recentBpmSeries;
  const maxBpm = bpmSeries.length > 0 ? Math.max(...bpmSeries, 100) : 100;
  const minBpm = bpmSeries.length > 0 ? Math.min(...bpmSeries, 45) : 45;
  const bpmSpan = Math.max(10, maxBpm - minBpm);

  return (
    <div className="reveal-backdrop fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="reveal-drawer relative w-full max-w-2xl bg-[#1D2028]/82 backdrop-blur-3xl border-l border-white/15 h-full overflow-y-auto p-6 space-y-5 shadow-[0_0_60px_rgba(0,0,0,0.65)] text-white">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Watch className="h-4 w-4 text-white" /> Universal Wearable Sync & Baseline Check
            </div>
            <h2 className="text-2xl font-display font-bold text-white mt-0.5">
              Connect Any Wearable Device
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wearable sync"
            className="p-2 rounded-full btn-mono-glass cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Clean 4-Mode Segmented Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl glass-3d-recessed p-1.5">
          {(
            [
              { id: 'bluetooth', label: 'Bluetooth BLE', icon: Bluetooth },
              { id: 'import', label: 'Import / Devices', icon: FileUp },
              { id: 'manual', label: 'Type Readings', icon: Activity },
              { id: 'baseline', label: 'My Baseline', icon: SlidersHorizontal },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-zinc-950 shadow-sm'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mode: Live Web Bluetooth GATT */}
        {mode === 'bluetooth' && (
          <div className="reveal-panel space-y-4">
            <div className="rounded-2xl glass-3d-sub p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Real-Time Bluetooth Low Energy (BLE) Wearable Pairing
                  </h3>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    Streams Heart Rate (0x180D + RR-Interval HRV), Pulse Oximeter (0x1822),
                    Thermometer (0x1809), Blood Pressure (0x1810), Glucose (0x1808) & Battery.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ble.canReconnect && (
                    <button
                      type="button"
                      onClick={() => ble.reconnectLastDevice()}
                      className="px-4 py-2 rounded-full btn-mono-glass text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" /> Reconnect
                    </button>
                  )}
                  {isBleStreaming ? (
                    <button
                      type="button"
                      onClick={() => ble.disconnect()}
                      className="px-4 py-2 rounded-full border border-rose-400/45 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Unplug className="h-4 w-4" /> Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => ble.connectRealDevice()}
                      disabled={ble.status === 'connecting'}
                      className="px-5 py-2.5 rounded-full btn-mono-primary font-semibold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Bluetooth className="h-4 w-4" />
                      {ble.status === 'connecting' ? 'Scanning BLE...' : 'Pair Bluetooth Device'}
                    </button>
                  )}
                </div>
              </div>

              {/* Scan Mode Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <span>Scan Filter:</span>
                  <div className="glass-3d-recessed inline-flex rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => ble.setScanMode('medical')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        ble.scanMode === 'medical'
                          ? 'bg-white text-zinc-950'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      Health Wearables (0x180D/1822)
                    </button>
                    <button
                      type="button"
                      onClick={() => ble.setScanMode('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        ble.scanMode === 'all'
                          ? 'bg-white text-zinc-950'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      All Nearby BLE Devices
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ble.autoSyncToHud}
                    onChange={(e) => ble.setAutoSyncToHud(e.target.checked)}
                    className="h-4 w-4 rounded accent-zinc-950"
                  />
                  Auto-Sync Live Stream to Body HUD
                </label>
              </div>

              {/* Environment / Iframe Notice */}
              {(ble.envCheck.inIframe || !ble.envCheck.supported || ble.status === 'error') && (
                <div className="rounded-xl border border-amber-400/35 bg-amber-500/12 p-3.5 text-xs text-amber-100 space-y-2">
                  <div className="font-semibold text-amber-300">
                    {!ble.envCheck.supported
                      ? 'Web Bluetooth Requires Google Chrome or Microsoft Edge'
                      : 'Embedded Preview Frame Detected'}
                  </div>
                  <p className="text-amber-100/90 leading-relaxed">
                    {ble.envCheck.inIframe
                      ? 'Embedded iframes may block browser Bluetooth prompts. Open in a standalone Chrome/Edge tab or use Live GATT Loopback below.'
                      : ble.envCheck.reason || ble.statusMessage}
                  </p>
                  {typeof window !== 'undefined' && ble.envCheck.inIframe && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-white underline underline-offset-4"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open in Standalone Chrome/Edge Tab
                    </a>
                  )}
                </div>
              )}

              {/* Status Feedback Banner */}
              {ble.statusMessage && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-sm border ${
                    ble.status === 'error'
                      ? 'border-rose-400/40 bg-rose-500/14 text-rose-100'
                      : isBleStreaming
                        ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100'
                        : 'border-white/10 glass-3d-recessed text-zinc-200'
                  }`}
                >
                  {ble.statusMessage}
                </div>
              )}

              {/* Active Connected Device Telemetry Card */}
              {isBleStreaming && ble.deviceInfo && (
                <div className="rounded-2xl border border-emerald-600/35 bg-emerald-500/[0.08] p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                        <Radio className="h-4 w-4" />
                        <span>
                          {ble.status === 'simulated' ? 'Live GATT Loopback:' : 'Connected:'}{' '}
                          {ble.deviceInfo.name}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300 mt-1 flex flex-wrap items-center gap-2">
                        {ble.deviceInfo.manufacturer && (
                          <span>{ble.deviceInfo.manufacturer}</span>
                        )}
                        {ble.deviceInfo.batteryPct !== null &&
                          ble.deviceInfo.batteryPct !== undefined && (
                            <span className="inline-flex items-center gap-1 font-medium text-white">
                              <Battery className="h-3.5 w-3.5" /> {ble.deviceInfo.batteryPct}%
                            </span>
                          )}
                        {ble.snapshot.sensorContact &&
                          ble.snapshot.sensorContact !== 'not-supported' && (
                            <span
                              className={
                                ble.snapshot.sensorContact === 'detected'
                                  ? 'text-emerald-400 font-semibold'
                                  : 'text-amber-400 font-semibold'
                              }
                            >
                              · Contact:{' '}
                              {ble.snapshot.sensorContact === 'detected'
                                ? 'Skin Detected'
                                : 'Check Strap'}
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono text-zinc-400 tabular-nums">
                        {ble.snapshot.packetCount} GATT packets
                      </div>
                      <div className="text-xs text-zinc-300 mt-0.5">
                        {ble.deviceInfo.supportedServices.join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Live Decoded Vitals Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-xl glass-3d-recessed p-3">
                      <div className="text-xs sm:text-sm text-zinc-400">Live Heart Rate</div>
                      <div className="text-2xl sm:text-3xl font-bold tabular-nums text-white mt-0.5">
                        {ble.snapshot.bpm ?? '--'}{' '}
                        <span className="text-sm font-medium text-zinc-400">bpm</span>
                      </div>
                    </div>
                    <div className="rounded-xl glass-3d-recessed p-3">
                      <div className="text-xs sm:text-sm text-zinc-400">HRV (RMSSD)</div>
                      <div className="text-2xl sm:text-3xl font-bold tabular-nums text-white mt-0.5">
                        {ble.snapshot.hrvMs ?? '--'}{' '}
                        <span className="text-sm font-medium text-zinc-400">ms</span>
                      </div>
                    </div>
                    <div className="rounded-xl glass-3d-recessed p-3">
                      <div className="text-xs sm:text-sm text-zinc-400">SpO2 (0x2A5F)</div>
                      <div className="text-2xl sm:text-3xl font-bold tabular-nums text-white mt-0.5">
                        {ble.snapshot.spo2Pct ?? '--'}
                        <span className="text-sm font-medium text-zinc-400">%</span>
                      </div>
                    </div>
                    <div className="rounded-xl glass-3d-recessed p-3">
                      <div className="text-xs sm:text-sm text-zinc-400">Body Temp (0x2A1C)</div>
                      <div className="text-2xl sm:text-3xl font-bold tabular-nums text-white mt-0.5">
                        {ble.snapshot.bodyTempC !== undefined
                          ? `${ble.snapshot.bodyTempC.toFixed(1)}°C`
                          : '--'}
                      </div>
                    </div>
                  </div>

                  {/* Mini Live Pulse Sparkline */}
                  {bpmSeries.length > 1 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Live 0x2A37 Pulse Stream</span>
                        <span className="tabular-nums">
                          {minBpm}–{maxBpm} bpm window
                        </span>
                      </div>
                      <div className="flex items-end gap-1 h-10 glass-3d-recessed rounded-xl px-2.5 py-1.5">
                        {bpmSeries.map((val, idx) => {
                          const hPct = Math.max(
                            18,
                            Math.round(((val - minBpm) / bpmSpan) * 100)
                          );
                          return (
                            <div
                              key={idx}
                              style={{ height: `${hPct}%` }}
                              className={`flex-1 rounded-xs transition-all ${
                                idx === bpmSeries.length - 1 ? 'bg-white' : 'bg-white/30'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Built-In Binary GATT Packet Loopback Tester */}
              <div className="rounded-xl glass-3d-recessed p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      Test Bluetooth Binary GATT Decoder (No Strap Required)
                    </div>
                    <p className="text-xs text-zinc-400">
                      Generates real IEEE-11073 / SIG binary packets (0x2A37 HR + RR intervals, 0x2A5F SpO2, 0x2A1C Temp) through the live BLE parser.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ble.startSimulatedGattStream('normal')}
                    className="px-3.5 py-2 rounded-xl btn-mono-glass text-xs font-semibold cursor-pointer"
                  >
                    Stream Normal BLE GATT
                  </button>
                  <button
                    type="button"
                    onClick={() => ble.startSimulatedGattStream('drift')}
                    className="px-3.5 py-2 rounded-xl btn-mono-glass text-xs font-semibold cursor-pointer"
                  >
                    Stream Stress Drift BLE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode: Universal File Import + Device Stream Presets */}
        {mode === 'import' && (
          <div className="reveal-panel space-y-4">
            <div className="rounded-2xl glass-3d-sub p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-semibold text-white">
                  1-Click Wearable Device Streams
                </span>
                <span className="text-xs text-zinc-400">Test live baseline comparison</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WEARABLE_PRESETS.map((preset) => {
                  const selected = draftReading.deviceName === preset.deviceName;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setDraftReading({
                          ...preset.payload,
                          capturedAtISO: new Date().toISOString(),
                        });
                        setStatusMessage(`Loaded live stream from ${preset.deviceName}.`);
                      }}
                      className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                        selected
                          ? 'border-white bg-white text-zinc-950 shadow-sm'
                          : 'glass-3d-recessed text-zinc-200 hover:border-white/30'
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          selected ? 'text-zinc-950' : 'text-white'
                        }`}
                      >
                        {preset.deviceName}
                      </div>
                      <div
                        className={`text-xs mt-0.5 ${
                          selected ? 'text-zinc-600' : 'text-zinc-400'
                        }`}
                      >
                        {preset.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl glass-3d-sub p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-base font-semibold text-white">
                  Upload Export File (Apple Watch, Garmin, Fitbit, Oura, CSV/JSON/XML)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sample =
                      'HR: 81, SpO2: 94%, Temp: 37.8C, Glucose: 66, BP: 136/86, Sleep: 5.8, Water: 1850';
                    setPasteText(sample);
                    const parsed = parseWearableFileOrText(sample, 'Sample Wearable Export');
                    if (parsed) {
                      setDraftReading(parsed);
                      setStatusMessage(
                        'Parsed sample wearable export and compared against baseline.'
                      );
                    }
                  }}
                  className="text-xs font-semibold text-zinc-300 hover:text-white underline underline-offset-4 cursor-pointer"
                >
                  Try Sample Text
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 rounded-full btn-mono-primary font-semibold text-sm py-2.5 px-4 cursor-pointer transition-all">
                <FileUp className="h-4 w-4" />
                <span>Choose CSV / JSON / XML / TXT File</span>
                <input
                  type="file"
                  accept=".csv,.json,.xml,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='Or paste raw reading: "HR: 86, SpO2: 93%, Temp: 37.9C, Glucose: 64"'
                  className="flex-1 rounded-xl glass-3d-recessed px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/35"
                />
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-4 py-2 rounded-xl btn-mono-glass text-sm font-semibold cursor-pointer"
                >
                  Read
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode: Direct Reading Input */}
        {mode === 'manual' && (
          <div className="rounded-2xl glass-3d-sub p-4 space-y-3">
            <div className="text-base font-semibold text-white">
              Enter Current Wearable Vitals
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Resting HR (bpm)</span>
                <input
                  type="number"
                  value={draftReading.restingHrBpm ?? ''}
                  onChange={(e) => updateNumberField('restingHrBpm', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">SpO2 (%)</span>
                <input
                  type="number"
                  value={draftReading.spo2Pct ?? ''}
                  onChange={(e) => updateNumberField('spo2Pct', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Body Temp (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={draftReading.bodyTempC ?? ''}
                  onChange={(e) => updateNumberField('bodyTempC', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Blood Sugar (mg/dL)</span>
                <input
                  type="number"
                  value={draftReading.bloodGlucoseMgDl ?? ''}
                  onChange={(e) => updateNumberField('bloodGlucoseMgDl', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">BP Systolic</span>
                <input
                  type="number"
                  value={draftReading.bpSystolic ?? ''}
                  onChange={(e) => updateNumberField('bpSystolic', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">BP Diastolic</span>
                <input
                  type="number"
                  value={draftReading.bpDiastolic ?? ''}
                  onChange={(e) => updateNumberField('bpDiastolic', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">HRV (ms)</span>
                <input
                  type="number"
                  value={draftReading.hrvMs ?? ''}
                  onChange={(e) => updateNumberField('hrvMs', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Sleep (hrs)</span>
                <input
                  type="number"
                  step="0.1"
                  value={draftReading.sleepHours ?? ''}
                  onChange={(e) => updateNumberField('sleepHours', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Water Drunk (mL)</span>
                <input
                  type="number"
                  value={draftReading.fluidIntakeMl ?? ''}
                  onChange={(e) => updateNumberField('fluidIntakeMl', e.target.value)}
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
            </div>
          </div>
        )}

        {/* Mode: Customize Astronaut Personal Baseline */}
        {mode === 'baseline' && (
          <form
            onSubmit={handleSaveBaseline}
            className="rounded-2xl glass-3d-sub p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-white">
                Astronaut Personal Normal Ranges
              </div>
              {baselineSavedToast && (
                <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Baseline Saved
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Rest HR Min</span>
                <input
                  type="number"
                  value={editBaseline.restingHrRange[0]}
                  onChange={(e) =>
                    updateBaselineScalar(
                      (num, cur) => ({
                        ...cur,
                        restingHrRange: [num, cur.restingHrRange[1]],
                      }),
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Rest HR Max</span>
                <input
                  type="number"
                  value={editBaseline.restingHrRange[1]}
                  onChange={(e) =>
                    updateBaselineScalar(
                      (num, cur) => ({
                        ...cur,
                        restingHrRange: [cur.restingHrRange[0], num],
                      }),
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Min SpO2 (%)</span>
                <input
                  type="number"
                  value={editBaseline.spo2MinPct}
                  onChange={(e) =>
                    updateBaselineScalar((num, cur) => ({ ...cur, spo2MinPct: num }), e.target.value)
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Min HRV (ms)</span>
                <input
                  type="number"
                  value={editBaseline.hrvMinMs}
                  onChange={(e) =>
                    updateBaselineScalar((num, cur) => ({ ...cur, hrvMinMs: num }), e.target.value)
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Sleep Goal (hrs)</span>
                <input
                  type="number"
                  step="0.5"
                  value={editBaseline.sleepTargetHours}
                  onChange={(e) =>
                    updateBaselineScalar(
                      (num, cur) => ({ ...cur, sleepTargetHours: num }),
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
              <label className="space-y-1">
                <span className="text-zinc-300 font-medium">Fluid Goal (mL)</span>
                <input
                  type="number"
                  value={editBaseline.fluidTargetMl}
                  onChange={(e) =>
                    updateBaselineScalar(
                      (num, cur) => ({ ...cur, fluidTargetMl: num }),
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl glass-3d-recessed px-3 py-2 font-mono text-white focus:outline-none focus:border-white/35"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full btn-mono-primary font-semibold text-sm cursor-pointer"
              >
                Save My Personal Baseline
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditBaseline(DEFAULT_BASELINE);
                  onSaveBaseline(DEFAULT_BASELINE);
                  setBaselineSavedToast(true);
                  window.setTimeout(() => setBaselineSavedToast(false), 2500);
                }}
                className="px-4 py-2.5 rounded-full btn-mono-glass text-sm font-medium cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>
          </form>
        )}

        {statusMessage && (
          <div className="rounded-xl glass-3d-sub border-white/10 px-4 py-2.5 text-sm text-zinc-200">
            {statusMessage}
          </div>
        )}

        {/* INSTANT BASELINE COMPARISON RESULTS ("WHAT IS NORMAL vs NOT NORMAL") */}
        <section className="rounded-2xl glass-3d-sub p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Live Baseline Comparison · {comparison.deviceName}
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {comparison.summaryText}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold tabular-nums">
              <span className="text-emerald-400">● {comparison.normalCount} Normal</span>
              {comparison.borderlineCount > 0 && (
                <span className="text-amber-400">▲ {comparison.borderlineCount} Watch</span>
              )}
              {comparison.notNormalCount > 0 && (
                <span className="text-rose-400">✖ {comparison.notNormalCount} Not Normal</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {comparison.items.map((item) => {
              const style = VERDICT_STYLE[item.verdict];
              return (
                <div
                  key={item.key}
                  className={`rounded-xl glass-3d-recessed px-3.5 py-3 flex flex-wrap items-center justify-between gap-3 ${style.rowBorder}`}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-zinc-400">
                      Normal Baseline:{' '}
                      <span className="tabular-nums font-medium text-zinc-200">
                        {item.baselineDisplay}
                      </span>
                      {' · '}
                      <span className="text-zinc-300">{item.explanation}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-bold tabular-nums text-white">
                        {item.readingDisplay}
                      </div>
                      <div className="text-xs sm:text-sm tabular-nums text-zinc-400">{item.deltaDisplay}</div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Apply Bar */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full btn-mono-glass text-sm font-medium cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleApplyToHud}
            className="px-6 py-2.5 rounded-full btn-mono-primary font-semibold text-sm transition-all cursor-pointer"
          >
            Apply Wearable Readings to Body HUD
          </button>
        </div>
      </div>
    </div>
  );
};

