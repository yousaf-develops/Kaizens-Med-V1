import React, { useEffect, useRef, useState } from 'react';
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

const SPACESHIP_BG_URL = '/assets/aistudio/grey_spaceship_background_287c8ce6.jpg';

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
  SPACESHIP_BG_URL,
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
    shortStatus: 'Not Normal',
    dot: '#F87171',
  },
  'data-quality': {
    stroke: '#A1A1AA',
    text: '#A1A1AA',
    shortStatus: 'Update Needed',
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
 * Coordinates locked inside SVG viewBox="0 0 640 480" where the 1:1 avatar image
 * fills comfortably and prominently top-to-bottom with generous scale.
 */
const HOTSPOTS: HotspotSpec[] = [
  {
    id: 'vision-sans',
    label: 'Eyes & Brain',
    cx: 320,
    cy: 102,
    elbowX: 440,
    calloutX: 624,
    calloutY: 96,
    align: 'right',
    zoomOrigin: '50% 22%',
    zoomScale: 1.9,
  },
  {
    id: 'radiation',
    label: 'Radiation',
    cx: 290,
    cy: 242,
    elbowX: 195,
    calloutX: 16,
    calloutY: 200,
    align: 'left',
    zoomOrigin: '46% 51%',
    zoomScale: 1.85,
  },
  {
    id: 'cardio',
    label: 'Heart & Lungs',
    cx: 335,
    cy: 252,
    elbowX: 440,
    calloutX: 624,
    calloutY: 240,
    align: 'right',
    zoomOrigin: '52% 53%',
    zoomScale: 2.0,
  },
  {
    id: 'nutrition-hydration',
    label: 'Fluids & Nutrition',
    cx: 316,
    cy: 294,
    elbowX: 195,
    calloutX: 16,
    calloutY: 290,
    align: 'left',
    zoomOrigin: '49% 62%',
    zoomScale: 1.95,
  },
  {
    id: 'bone',
    label: 'Bone Density',
    cx: 320,
    cy: 328,
    elbowX: 440,
    calloutX: 624,
    calloutY: 340,
    align: 'right',
    zoomOrigin: '50% 68%',
    zoomScale: 1.95,
  },
  {
    id: 'muscle',
    label: 'Muscles',
    cx: 296,
    cy: 366,
    elbowX: 195,
    calloutX: 16,
    calloutY: 388,
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
  const landingGlowRef = useRef<HTMLDivElement | null>(null);
  const assets = AVATAR_ASSETS[gender];
  const activeSpot = HOTSPOTS.find((h) => h.id === selectedSystem) ?? HOTSPOTS[0];

  // Preload avatar, X-Ray, and spaceship corridor images so transitions are instant
  useEffect(() => {
    ALL_ASSET_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Subtle #024755 mouse-hover glow inside the avatar landing card (zero React re-renders)
  const handleLandingPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const glowEl = landingGlowRef.current;
    if (!glowEl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowEl.style.background = `radial-gradient(440px circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(2, 71, 85, 0.55) 0%, rgba(2, 71, 85, 0.22) 40%, rgba(0, 0, 0, 0) 74%)`;
  };

  const handleLandingPointerLeave = () => {
    const glowEl = landingGlowRef.current;
    if (!glowEl) return;
    glowEl.style.background =
      'radial-gradient(440px circle at 50% 50%, rgba(2, 71, 85, 0.42) 0%, rgba(2, 71, 85, 0.16) 42%, rgba(0, 0, 0, 0) 74%)';
  };

  // =========================================================================
  // INITIAL LANDING STATE (!isXrayMode): Gender Avatar Over Slightly Blurred Spaceship + Enlarged Name
  // =========================================================================
  if (!isXrayMode) {
    return (
      <div
        onPointerMove={handleLandingPointerMove}
        onPointerLeave={handleLandingPointerLeave}
        className="glass-3d relative flex flex-1 min-h-0 flex-col w-full items-center justify-between overflow-hidden rounded-3xl p-5 sm:p-7"
      >
        {/* Slightly Blurred Grey Spaceship Backdrop Behind Clear Avatar */}
        <img
          src={SPACESHIP_BG_URL}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center blur-[3.5px] scale-105 opacity-80 select-none"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70"
        />
        {/* Interactive Subtle #024755 Mouse-Hover Glow Layer */}
        <div
          ref={landingGlowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(440px circle at 50% 50%, rgba(2, 71, 85, 0.42) 0%, rgba(2, 71, 85, 0.16) 42%, rgba(0, 0, 0, 0) 74%)',
          }}
        />

        {/* Enlarged Astronaut Name Header */}
        <div className="relative z-10 w-full min-h-[48px] shrink-0 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            {astronautName}
          </h2>
          <span className="text-sm font-medium text-zinc-200/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
            Tap avatar to scan
          </span>
        </div>

        {/* Crisp Gender Avatar Overlaid Cleanly */}
        <button
          type="button"
          onClick={onActivateXray}
          aria-label={`Open body scan for ${astronautName}`}
          className="relative z-10 flex-1 min-h-0 w-full flex flex-col items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-2xl group"
        >
          <div className="relative h-full max-h-[460px] aspect-square flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.03]">
            <img
              src={assets.standard}
              alt={`${astronautName} avatar`}
              decoding="async"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.85)] select-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </button>

        <div className="relative z-10 w-full shrink-0 flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onActivateXray}
            className="btn-mono-primary px-6 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <ScanLine className="h-4 w-4" />
            <span>Open Body Scan</span>
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
      {/* Fixed-height minimalist top bar */}
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
            <span className="text-rose-400">✖ Not Normal</span>
          </div>
        )}
      </div>

      {/* Unified Scalable SVG Stage: Full Head-to-Toe Enlarged X-Ray + Callout Lines */}
      <div className="relative flex-1 min-h-[440px] sm:min-h-[500px] w-full flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 640 480"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-full select-none"
          role="img"
          aria-label="Full Body Scan"
        >
          <defs>
            <radialGradient id="xrayStudioAura" cx="50%" cy="48%" r="48%">
              <stop offset="0%" stopColor="#024755" stopOpacity="0.75" />
              <stop offset="55%" stopColor="#024755" stopOpacity="0.22" />
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
            <circle cx="320" cy="235" r="230" fill="url(#xrayStudioAura)" />

            <ellipse
              cx="320"
              cy="448"
              rx="135"
              ry="13"
              fill="none"
              stroke="#024755"
              strokeOpacity="0.85"
              strokeWidth="1.2"
            />
            <ellipse
              cx="320"
              cy="448"
              rx="92"
              ry="8"
              fill="none"
              stroke="#38BDF8"
              strokeOpacity="0.35"
              strokeWidth="1"
            />

            {speActive && (
              <circle
                cx="320"
                cy="235"
                r="220"
                fill="none"
                stroke="#F87171"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            )}

            {/* Substantially Enlarged X-Ray Body Image */}
            <image
              href={assets.xray}
              x="70"
              y="2"
              width="500"
              height="474"
              preserveAspectRatio="xMidYMid meet"
              onClick={onExitXray}
              className="xray-reveal-wipe cursor-pointer"
            />

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

                  <circle cx={spot.cx} cy={spot.cy} r="20" fill="transparent" />

                  <circle
                    cx={spot.cx}
                    cy={spot.cy}
                    r={isSelected || isHovered ? 6.5 : 5}
                    fill="#000000"
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
