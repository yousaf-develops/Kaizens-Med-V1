import React, { useEffect, useState } from 'react';
import { ScanLine, User, ZoomOut } from 'lucide-react';
import { AlertSeverity, AstronautGender, SystemId } from '../types/telemetry';

interface AnatomicalHudSvgProps {
  gender: AstronautGender;
  astronautName: string;
  selectedSystem: SystemId;
  isXrayMode: boolean;
  onActivateXray: () => void;
  onExitXray: () => void;
  isZoomed: boolean;
  onSelectPart: (id: SystemId) => void;
  onResetZoom: () => void;
  systemSeverities: Record<SystemId, AlertSeverity>;
  systemMetrics: Record<SystemId, string>;
  speActive: boolean;
}

const AVATAR_ASSETS: Record<AstronautGender, { standard: string; xray: string }> = {
  male: {
    standard: '/assets/aistudio/Avatar_male_178eaa5e.png',
    xray: '/assets/aistudio/X_Ray_male_4ea8b0b9.png',
  },
  female: {
    standard: '/assets/aistudio/avatar_female_27b5e242.png',
    xray: '/assets/aistudio/X_Ray_female_f078ce5d.webp',
  },
};

const ALL_ASSET_URLS = [
  AVATAR_ASSETS.male.standard,
  AVATAR_ASSETS.male.xray,
  AVATAR_ASSETS.female.standard,
  AVATAR_ASSETS.female.xray,
];

const SEVERITY_COLORS: Record<
  AlertSeverity,
  { stroke: string; text: string; shortStatus: string; dot: string }
> = {
  nominal: {
    stroke: '#34D399',
    text: '#34D399',
    shortStatus: 'Normal',
    dot: '#34D399',
  },
  caution: {
    stroke: '#FBBF24',
    text: '#FBBF24',
    shortStatus: 'Watch',
    dot: '#FBBF24',
  },
  urgent: {
    stroke: '#F87171',
    text: '#F87171',
    shortStatus: 'Alert',
    dot: '#F87171',
  },
  'data-quality': {
    stroke: '#A1A1AA',
    text: '#A1A1AA',
    shortStatus: 'Stale',
    dot: '#A1A1AA',
  },
};

interface HotspotSpec {
  id: SystemId;
  label: string;
  cx: number;
  cy: number;
  elbowX: number;
  calloutX: number;
  calloutY: number;
  align: 'left' | 'right';
  zoomOrigin: string;
  zoomScale: number;
}

/**
 * Coordinates locked inside SVG viewBox="0 0 600 440" where the 1:1 avatar image
 * fills (x: 125..475, y: 39..389). Ensures full head-to-toe visibility with zero cropping.
 */
const HOTSPOTS: HotspotSpec[] = [
  {
    id: 'vision-sans',
    label: 'Eyes & Brain',
    cx: 300,
    cy: 95,
    elbowX: 416,
    calloutX: 584,
    calloutY: 92,
    align: 'right',
    zoomOrigin: '50% 22%',
    zoomScale: 1.9,
  },
  {
    id: 'radiation',
    label: 'Radiation',
    cx: 274,
    cy: 226,
    elbowX: 184,
    calloutX: 16,
    calloutY: 188,
    align: 'left',
    zoomOrigin: '46% 51%',
    zoomScale: 1.85,
  },
  {
    id: 'cardio',
    label: 'Heart & Lungs',
    cx: 314,
    cy: 235,
    elbowX: 416,
    calloutX: 584,
    calloutY: 226,
    align: 'right',
    zoomOrigin: '52% 53%',
    zoomScale: 2.0,
  },
  {
    id: 'nutrition-hydration',
    label: 'Hydration',
    cx: 296,
    cy: 272,
    elbowX: 184,
    calloutX: 16,
    calloutY: 272,
    align: 'left',
    zoomOrigin: '49% 62%',
    zoomScale: 1.95,
  },
  {
    id: 'bone',
    label: 'Hips & Spine',
    cx: 300,
    cy: 301,
    elbowX: 416,
    calloutX: 584,
    calloutY: 316,
    align: 'right',
    zoomOrigin: '50% 68%',
    zoomScale: 1.95,
  },
  {
    id: 'muscle',
    label: 'Muscles',
    cx: 279,
    cy: 334,
    elbowX: 184,
    calloutX: 16,
    calloutY: 356,
    align: 'left',
    zoomOrigin: '46% 76%',
    zoomScale: 1.9,
  },
];

export const AnatomicalHudSvg: React.FC<AnatomicalHudSvgProps> = ({
  gender,
  astronautName,
  selectedSystem,
  isXrayMode,
  onActivateXray,
  onExitXray,
  isZoomed,
  onSelectPart,
  onResetZoom,
  systemSeverities,
  systemMetrics,
  speActive,
}) => {
  const [hoveredPart, setHoveredPart] = useState<SystemId | null>(null);
  const assets = AVATAR_ASSETS[gender];
  const activeSpot = HOTSPOTS.find((h) => h.id === selectedSystem) ?? HOTSPOTS[0];

  // Eagerly preload all avatar & X-Ray images into browser cache so switching is 0ms instant
  useEffect(() => {
    ALL_ASSET_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // =========================================================================
  // INITIAL LANDING STATE (!isXrayMode): Pure Gender Avatar, Zero Parameters
  // =========================================================================
  if (!isXrayMode) {
    return (
      <div className="glass-3d relative flex flex-1 min-h-0 flex-col w-full items-center justify-between overflow-hidden rounded-3xl p-5 sm:p-7">
        <div className="w-full h-7 shrink-0 flex items-center justify-between text-sm text-zinc-400">
          <span className="font-semibold text-white">{astronautName}</span>
          <span>Tap avatar to scan</span>
        </div>

        <button
          type="button"
          onClick={onActivateXray}
          aria-label={`Scan ${astronautName} X-Ray`}
          className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-2xl"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-72 h-72 rounded-full blur-3xl opacity-55"
            style={{
              background:
                'radial-gradient(circle, rgba(2, 71, 85, 0.85) 0%, rgba(2, 71, 85, 0.22) 52%, rgba(0, 0, 0, 0) 76%)',
            }}
          />

          <div className="relative h-full max-h-[380px] aspect-square flex items-center justify-center">
            <img
              src={assets.standard}
              alt={`${astronautName} avatar`}
              decoding="async"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,0.55)] select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </button>

        <div className="w-full shrink-0 flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onActivateXray}
            className="btn-mono-primary px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <ScanLine className="h-4 w-4" />
            <span>Open X-Ray Scan</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // X-RAY REVEAL + PARAMETER CALLOUT LINES MODE (isXrayMode === true)
  // =========================================================================
  return (
    <div className="glass-3d-recessed relative flex flex-1 min-h-0 flex-col w-full items-center justify-between overflow-hidden rounded-2xl p-3 sm:p-4">
      {/* Fixed-height minimalist top bar (never changes height on hover) */}
      <div className="w-full h-9 shrink-0 flex items-center justify-between gap-2 z-10">
        <button
          type="button"
          onClick={onExitXray}
          className="btn-mono-glass flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white cursor-pointer whitespace-nowrap"
        >
          <User className="h-3.5 w-3.5 text-zinc-300" />
          Avatar
        </button>

        {isZoomed ? (
          <button
            type="button"
            onClick={onResetZoom}
            className="btn-mono-primary flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
          >
            <ZoomOut className="h-3.5 w-3.5" />
            Full Body
          </button>
        ) : (
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-emerald-400">● Normal</span>
            <span className="text-amber-400">▲ Watch</span>
            <span className="text-rose-400">✖ Alert</span>
          </div>
        )}
      </div>

      {/* Unified Scalable SVG Stage: Full Head-to-Toe X-Ray + Callout Lines (Zero Cropping, Zero Vibration) */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 600 440"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-full select-none"
          role="img"
          aria-label="X-Ray Anatomical Scan"
        >
          <defs>
            <radialGradient id="xrayStudioAura" cx="50%" cy="48%" r="48%">
              <stop offset="0%" stopColor="#024755" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#024755" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#024755" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g
            style={{
              transformOrigin: activeSpot.zoomOrigin,
              transform: isZoomed ? `scale(${activeSpot.zoomScale})` : 'scale(1)',
              transition: 'transform 340ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Subtle #024755 backdrop aura */}
            <circle cx="300" cy="216" r="195" fill="url(#xrayStudioAura)" />

            {/* Calibration pedestal below boots */}
            <ellipse
              cx="300"
              cy="402"
              rx="108"
              ry="11"
              fill="none"
              stroke="#024755"
              strokeOpacity="0.85"
              strokeWidth="1.2"
            />
            <ellipse
              cx="300"
              cy="402"
              rx="74"
              ry="7"
              fill="none"
              stroke="#38BDF8"
              strokeOpacity="0.35"
              strokeWidth="1"
            />

            {/* SPE Active Shielding Ring */}
            {speActive && (
              <circle
                cx="300"
                cy="214"
                r="182"
                fill="none"
                stroke="#F87171"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            )}

            {/* Full Uncropped X-Ray Image Inside Unified SVG Coordinate Box */}
            <image
              href={assets.xray}
              x="125"
              y="18"
              width="350"
              height="392"
              preserveAspectRatio="xMidYMid meet"
              onClick={onExitXray}
              className="xray-reveal-wipe cursor-pointer"
            />

            {/* Parameter Callout Lines & Organ Target Nodes */}
            {HOTSPOTS.map((spot, idx) => {
              const sev = systemSeverities[spot.id];
              const palette = SEVERITY_COLORS[sev];
              const isSelected = selectedSystem === spot.id;
              const isHovered = hoveredPart === spot.id;
              const isUrgent = sev === 'urgent';
              const metric = systemMetrics[spot.id] ?? '';

              return (
                <g
                  key={spot.id}
                  onClick={() => onSelectPart(spot.id)}
                  onMouseEnter={() => setHoveredPart(spot.id)}
                  onMouseLeave={() => setHoveredPart(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectPart(spot.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Inspect ${spot.label}: ${metric}`}
                  className="cursor-pointer focus:outline-none"
                >
                  {!isZoomed && (
                    <>
                      <polyline
                        points={`${spot.cx},${spot.cy} ${spot.elbowX},${spot.calloutY} ${spot.calloutX},${spot.calloutY}`}
                        fill="none"
                        stroke={palette.stroke}
                        strokeOpacity={isSelected || isHovered || isUrgent ? 0.96 : 0.65}
                        strokeWidth={isSelected || isHovered || isUrgent ? 1.85 : 1.25}
                        style={{ animationDelay: `${80 + idx * 35}ms` }}
                        className="callout-line-draw"
                      />
                      <text
                        x={spot.calloutX}
                        y={spot.calloutY - 6}
                        textAnchor={spot.align === 'left' ? 'start' : 'end'}
                        fill={isSelected || isHovered ? '#FFFFFF' : '#E4E4E7'}
                        fontSize="13.5"
                        fontFamily="'SF Pro Text', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
                        fontWeight={isSelected ? '700' : '600'}
                      >
                        {spot.label}
                      </text>
                      <text
                        x={spot.calloutX}
                        y={spot.calloutY + 13}
                        textAnchor={spot.align === 'left' ? 'start' : 'end'}
                        fill={palette.text}
                        fontSize="11.5"
                        fontFamily="'SF Pro Text', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif"
                        fontWeight="700"
                      >
                        {metric ? `${metric} · ${palette.shortStatus}` : palette.shortStatus}
                      </text>
                    </>
                  )}

                  {isUrgent && (
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r="13"
                      fill="none"
                      stroke="#F87171"
                      strokeWidth="1.6"
                      className="red-organ-pulse"
                    />
                  )}

                  {(isSelected || isHovered) && (
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={isZoomed ? 10 : 12}
                      fill="none"
                      stroke={palette.stroke}
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Fixed invisible hit target (never shifts coordinates) */}
                  <circle cx={spot.cx} cy={spot.cy} r="20" fill="transparent" />

                  <circle
                    cx={spot.cx}
                    cy={spot.cy}
                    r={isSelected || isHovered ? 6.5 : 5}
                    fill="#090B0F"
                    stroke={palette.stroke}
                    strokeWidth={isUrgent ? '2.4' : '2'}
                  />
                  <circle cx={spot.cx} cy={spot.cy} r="2.6" fill={palette.dot} />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
