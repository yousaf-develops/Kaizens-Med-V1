import React, { useId, useState } from 'react';
import { Heart } from 'lucide-react';
import { AlertSeverity } from '../types/telemetry';

interface BarMetric {
  label: string;
  valuePct: number;
  displayValue: string;
  severity: AlertSeverity;
}

export const AdherenceBarCluster: React.FC<{ items: BarMetric[] }> = ({ items }) => {
  const colorFor = (sev: AlertSeverity) => {
    if (sev === 'urgent') return 'bg-rose-400';
    if (sev === 'caution') return 'bg-amber-400';
    if (sev === 'data-quality') return 'bg-zinc-400';
    return 'bg-emerald-400';
  };

  const textColorFor = (sev: AlertSeverity) => {
    if (sev === 'urgent') return 'text-rose-400';
    if (sev === 'caution') return 'text-amber-400';
    if (sev === 'data-quality') return 'text-zinc-400';
    return 'text-emerald-400';
  };

  return (
    <div className="space-y-3.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className="text-zinc-200 font-medium truncate pr-2">{item.label}</span>
            <span className={`tabular-nums font-bold shrink-0 ${textColorFor(item.severity)}`}>
              {item.displayValue}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${colorFor(item.severity)}`}
              style={{ width: `${Math.max(4, Math.min(100, item.valuePct))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CardiacWaveformCard: React.FC<{
  restingHr: number;
  submaxHr: number;
  baselineSubmaxHr: number;
  vo2Pct: number;
  bpText: string;
  onInspect?: () => void;
}> = ({ restingHr, submaxHr, baselineSubmaxHr, vo2Pct, bpText, onInspect }) => {
  const delta = submaxHr - baselineSubmaxHr;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="glass-3d-recessed flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <div className="text-3xl font-bold tabular-nums text-white leading-none">
              {vo2Pct.toFixed(0)}
              <span className="ml-0.5 text-base font-medium text-zinc-400">%</span>
            </div>
            <div className="text-sm text-zinc-400 mt-1">Fitness Score</div>
          </div>
        </div>
        <div className="text-right tabular-nums text-sm">
          <div className="text-zinc-200 font-semibold">Rest {restingHr} bpm</div>
          <div className={delta >= 8 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
            Workout {delta >= 0 ? `+${delta}` : delta} bpm
          </div>
        </div>
      </div>

      <svg viewBox="0 0 260 40" className="h-11 w-full" aria-hidden="true">
        <line x1="0" y1="24" x2="260" y2="24" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
        <polyline
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          points="0,24 18,24 24,20 30,24 36,24 40,28 45,5 50,35 55,24 64,24 70,19 78,24 102,24 108,20 114,24 120,24 124,28 129,5 134,35 139,24 148,24 154,19 162,24 186,24 192,20 198,24 204,24 208,28 213,5 218,35 223,24 232,24 238,19 246,24 260,24"
        />
      </svg>

      <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-sm text-zinc-300">
        <span className="tabular-nums font-semibold text-white">BP: {bpText} mmHg</span>
        {onInspect ? (
          <button
            type="button"
            onClick={onInspect}
            className="text-white hover:text-zinc-300 font-semibold cursor-pointer"
          >
            Inspect →
          </button>
        ) : (
          <span className="text-white font-medium">Inspect →</span>
        )}
      </div>
    </div>
  );
};

export const BiomarkerHelixWave: React.FC<{
  cumulativeMsv: number;
  careerLimitMsv: number;
  dailyDoseMsv: number;
  status: 'measured' | 'modeled' | 'stale';
}> = ({ cumulativeMsv, careerLimitMsv, dailyDoseMsv, status }) => {
  const pointsA: string[] = [];
  const pointsB: string[] = [];
  const rungs: { x: number; y1: number; y2: number }[] = [];

  for (let i = 0; i <= 28; i++) {
    const x = 8 + i * 8.6;
    const phase = i * 0.45;
    const y1 = 24 + Math.sin(phase) * 13;
    const y2 = 24 - Math.sin(phase) * 13;
    pointsA.push(`${x.toFixed(1)},${y1.toFixed(1)}`);
    pointsB.push(`${x.toFixed(1)},${y2.toFixed(1)}`);
    if (i % 2 === 0) {
      rungs.push({ x, y1, y2 });
    }
  }

  return (
    <div className="space-y-2.5">
      <svg viewBox="0 0 256 48" className="h-11 w-full" aria-hidden="true">
        {rungs.map((r, idx) => (
          <line key={idx} x1={r.x} y1={r.y1} x2={r.x} y2={r.y2} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        ))}
        <polyline fill="none" stroke="#FFFFFF" strokeWidth="1.8" points={pointsA.join(' ')} />
        <polyline
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.3"
          strokeOpacity="0.85"
          points={pointsB.join(' ')}
        />
      </svg>
      <div className="flex items-center justify-between text-sm tabular-nums text-zinc-300">
        <span>
          Today: <strong className="text-white">{dailyDoseMsv.toFixed(2)} mSv</strong>
        </span>
        <span>
          Career: <strong className="text-white">{cumulativeMsv.toFixed(1)}</strong> / {careerLimitMsv} mSv
        </span>
      </div>
      <div className="text-sm font-semibold">
        {status === 'stale' ? (
          <span className="text-amber-400">◌ Sensor Stale</span>
        ) : (
          <span className="text-emerald-400">● Live Sensor</span>
        )}
      </div>
    </div>
  );
};

export interface AreaSeriesPoint {
  label: string;
  primary: number;
  secondary?: number;
}

const CHART_STATUS_HEX: Record<AlertSeverity, string> = {
  nominal: '#34D399',
  caution: '#FBBF24',
  urgent: '#F87171',
  'data-quality': '#A1A1AA',
};

const CHART_STATUS_TEXT: Record<AlertSeverity, string> = {
  nominal: 'text-emerald-400',
  caution: 'text-amber-400',
  urgent: 'text-rose-400',
  'data-quality': 'text-zinc-400',
};

export const LongitudinalAreaChart: React.FC<{
  data: AreaSeriesPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  unit: string;
  thresholdValue?: number;
  thresholdLabel?: string;
  height?: number;
  status?: AlertSeverity;
}> = ({
  data,
  primaryLabel,
  secondaryLabel,
  unit,
  thresholdValue,
  thresholdLabel,
  height = 128,
  status = 'nominal',
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradId = useId();
  if (data.length === 0) return null;

  const w = 320;
  const h = height;
  const padX = 10;
  const padY = 14;

  const allVals = data.flatMap((d) =>
    d.secondary !== undefined ? [d.primary, d.secondary] : [d.primary]
  );
  if (thresholdValue !== undefined) allVals.push(thresholdValue);

  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const span = Math.max(1, rawMax - rawMin);
  const minVal = rawMin - span * 0.15;
  const maxVal = rawMax + span * 0.15;

  const xFor = (i: number) =>
    data.length === 1 ? w / 2 : padX + (i / (data.length - 1)) * (w - padX * 2);
  const yFor = (val: number) => h - padY - ((val - minVal) / (maxVal - minVal)) * (h - padY * 2);

  const primaryCoords = data.map((d, i) => ({ x: xFor(i), y: yFor(d.primary), d }));
  const primaryPath = primaryCoords.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${padX},${h - padY} ${primaryPath} ${xFor(data.length - 1).toFixed(1)},${
    h - padY
  }`;

  const secondaryPath =
    secondaryLabel && data[0].secondary !== undefined
      ? data
          .map((d, i) => `${xFor(i).toFixed(1)},${yFor(d.secondary as number).toFixed(1)}`)
          .join(' ')
      : null;

  const thresholdY = thresholdValue !== undefined ? yFor(thresholdValue) : null;
  const activePoint =
    hoverIdx !== null ? primaryCoords[hoverIdx] : primaryCoords[primaryCoords.length - 1];

  const firstVal = data[0].primary;
  const lastVal = data[data.length - 1].primary;
  const trendDelta = lastVal - firstVal;
  const statusHex = CHART_STATUS_HEX[status];
  const statusTextCls = CHART_STATUS_TEXT[status];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm tabular-nums">
        <span className="text-zinc-300 truncate">
          {activePoint.d.label}:{' '}
          <strong className={`text-base ${statusTextCls}`}>
            {activePoint.d.primary.toFixed(1)} {unit}
          </strong>
          {secondaryLabel && activePoint.d.secondary !== undefined && (
            <span className="ml-2 text-zinc-400">
              · {secondaryLabel}: {activePoint.d.secondary.toFixed(1)}
            </span>
          )}
        </span>
        <span className="text-xs text-zinc-400 font-medium shrink-0">
          {primaryLabel}{' '}
          <span className="text-zinc-300 font-semibold">
            ({trendDelta >= 0 ? `+${trendDelta.toFixed(1)}` : trendDelta.toFixed(1)})
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full cursor-crosshair overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={statusHex} stopOpacity="0.28" />
            <stop offset="100%" stopColor={statusHex} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="rgba(255,255,255,0.10)" strokeWidth="0.7" />

        {thresholdY !== null && (
          <g>
            <line
              x1={padX}
              y1={thresholdY}
              x2={w - padX}
              y2={thresholdY}
              stroke="#FBBF24"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              strokeOpacity="0.85"
            />
            {thresholdLabel && (
              <text
                x={w - padX}
                y={thresholdY - 3}
                textAnchor="end"
                fill="#FBBF24"
                fontSize="10.5"
                fontWeight="700"
                fontFamily="'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
              >
                {thresholdLabel}
              </text>
            )}
          </g>
        )}

        <polygon points={areaPath} fill={`url(#${gradId})`} />
        <polyline fill="none" stroke={statusHex} strokeWidth="2.1" points={primaryPath} />

        {secondaryPath && (
          <polyline
            fill="none"
            stroke="#94A3B8"
            strokeOpacity="0.85"
            strokeWidth="1.4"
            strokeDasharray="3 2"
            points={secondaryPath}
          />
        )}

        <line
          x1={activePoint.x}
          y1={padY}
          x2={activePoint.x}
          y2={h - padY}
          stroke={statusHex}
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r="4"
          fill={statusHex}
          stroke="#090B0F"
          strokeWidth="1.6"
        />

        {primaryCoords.map((p, idx) => (
          <rect
            key={idx}
            x={p.x - w / data.length / 2}
            y={0}
            width={w / data.length}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(idx)}
          />
        ))}
      </svg>
    </div>
  );
};

interface RingMetric {
  label: string;
  pct: number;
  floorPct: number;
  sublabel: string;
  onClick?: () => void;
}

export const ReadinessRingCluster: React.FC<{ rings: RingMetric[] }> = ({ rings }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-3 gap-2">
      {rings.map((ring) => {
        const clamped = Math.max(0, Math.min(100, ring.pct));
        const offset = circumference - (clamped / 100) * circumference;
        const belowFloor = ring.pct < ring.floorPct;
        const nearFloor = !belowFloor && ring.pct - ring.floorPct <= 2.5;
        const strokeColor = belowFloor ? '#F87171' : nearFloor ? '#FBBF24' : '#34D399';

        return (
          <button
            key={ring.label}
            type="button"
            onClick={ring.onClick}
            className="flex flex-col items-center text-center rounded-xl p-2 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="relative h-18 w-18">
              <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="5.2" />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums text-white">
                {ring.pct.toFixed(0)}%
              </div>
            </div>
            <div className="mt-2 text-sm sm:text-base font-semibold text-white leading-tight">{ring.label}</div>
            <div className="text-xs sm:text-sm tabular-nums text-zinc-400">{ring.sublabel}</div>
          </button>
        );
      })}
    </div>
  );
};

export interface MatrixRow {
  label: string;
  cells: ('ok' | 'warn' | 'miss')[];
}

export const ComplianceMatrixGrid: React.FC<{ rows: MatrixRow[]; sols: number[] }> = ({
  rows,
  sols,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs sm:text-sm tabular-nums text-zinc-400 font-medium">
        <span>7-SOL LOG</span>
        <span>
          SOL {sols[0]}–{sols[sols.length - 1]}
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-2">
            <span className="w-28 truncate text-sm font-medium text-zinc-200">{row.label}</span>
            <div className="flex items-center gap-1.5">
              {row.cells.map((cell, idx) => (
                <span
                  key={idx}
                  title={`Sol ${sols[idx] ?? ''}: ${cell.toUpperCase()}`}
                  className={`h-3.5 w-3.5 rounded-full ${
                    cell === 'ok'
                      ? 'bg-emerald-400'
                      : cell === 'warn'
                        ? 'bg-amber-400'
                        : 'bg-white/15 border border-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
