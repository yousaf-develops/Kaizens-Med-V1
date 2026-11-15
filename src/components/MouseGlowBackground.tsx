import React, { useEffect, useRef } from 'react';

/**
 * Smooth, minimal cursor-tracking ambient glow strictly anchored on hex #024755 (rgb(2, 71, 85)).
 * Uses GPU-composited radial gradient + requestAnimationFrame damping for silky motion with zero re-renders.
 */
export const MouseGlowBackground: React.FC = () => {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = layerRef.current;
    if (!el || typeof window === 'undefined') return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applyGradient = (x: number, y: number, intensity = 1) => {
      const core = (0.95 * intensity).toFixed(3);
      const mid = (0.58 * intensity).toFixed(3);
      const outer = (0.22 * intensity).toFixed(3);
      el.style.background = [
        `radial-gradient(520px circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(2, 71, 85, ${core}) 0%, rgba(2, 71, 85, ${mid}) 34%, rgba(2, 71, 85, ${outer}) 64%, rgba(2, 71, 85, 0) 88%)`,
        `radial-gradient(240px circle at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(14, 116, 138, ${(0.34 * intensity).toFixed(3)}) 0%, rgba(2, 71, 85, 0) 75%)`,
      ].join(', ');
    };

    let targetX = window.innerWidth * 0.52;
    let targetY = window.innerHeight * 0.44;
    let currentX = targetX;
    let currentY = targetY;
    let targetIntensity = 0.9;
    let currentIntensity = 0.9;

    applyGradient(currentX, currentY, currentIntensity);

    if (prefersReducedMotion) return;

    let rafId = 0;

    const tick = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const di = targetIntensity - currentIntensity;

      currentX += dx * 0.11;
      currentY += dy * 0.11;
      currentIntensity += di * 0.08;

      applyGradient(currentX, currentY, currentIntensity);

      if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2 || Math.abs(di) > 0.005) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const scheduleTick = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      targetIntensity = 1;
      scheduleTick();
    };

    const onPointerLeave = () => {
      targetIntensity = 0.72;
      scheduleTick();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
};
