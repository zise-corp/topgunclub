'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function TacticalCursor() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -200, y: -200 });
  const ring    = useRef({ x: -200, y: -200 });
  const raf     = useRef<number>(0);
  const [state, setState] = useState<'default' | 'hover' | 'click'>('default');
  const [inNav, setInNav] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      document.documentElement.style.cursor = '';
      setEnabled(false);
      return;
    }
    // don't render/activate on touch devices (no mouse cursor)
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setEnabled(true);

    document.documentElement.style.cursor = 'none';

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };

      const t = e.target as HTMLElement;
      // Zones that use the native cursor and hide the crosshair: the navbar and
      // any modal marked with data-native-cursor (avoids double cursor + lag).
      const nativeZone = !!t.closest('.nav, [data-native-cursor]');
      setInNav(nativeZone);
      if (nativeZone) {
        document.documentElement.style.cursor = 'auto';
        setState('default');
        return;
      }
      document.documentElement.style.cursor = 'none';
      const isClickable = t.closest('a, button, [role="button"], input, select, textarea, label');
      setState(isClickable ? 'hover' : 'default');
    };

    const onDown = () => setState('click');
    const onUp   = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const isClickable = t.closest('a, button, [role="button"], input, select, textarea, label');
      setState(isClickable ? 'hover' : 'default');
    };

    const onLeave = () => {
      pos.current  = { x: -200, y: -200 };
      ring.current = { x: -200, y: -200 };
    };

    const loop = () => {
      const dot  = dotRef.current;
      const ringEl = ringRef.current;
      if (dot && ringEl) {
        dot.style.transform  = `translate(${pos.current.x}px,${pos.current.y}px) translate(-50%,-50%)`;
        ring.current.x += (pos.current.x - ring.current.x) * 0.35;
        ring.current.y += (pos.current.y - ring.current.y) * 0.35;
        ringEl.style.transform = `translate(${ring.current.x}px,${ring.current.y}px) translate(-50%,-50%)`;
      }
      raf.current = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup',   onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(loop);

    return () => {
      document.documentElement.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup',   onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, [isAdmin]);

  // On touch devices nothing is rendered, so the crosshair can't get stuck at 0,0
  if (!enabled) return null;

  const isHover = state === 'hover';
  const isClick = state === 'click';

  const ringSize = isClick ? 24 : isHover ? 34 : 30;
  const ringOpacity = isHover ? 1 : 0.55;
  const dotSize = isClick ? 3 : isHover ? 5 : 4;

  return (
    <>
      {/* Dot central */}
      <div ref={dotRef} aria-hidden style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99999,
        pointerEvents: 'none',
        display: inNav ? 'none' : 'block',
        width: dotSize, height: dotSize,
        borderRadius: '50%',
        background: isHover ? '#fff' : '#C99E66',
        boxShadow: isHover ? '0 0 6px 2px rgba(255,255,255,.4)' : '0 0 4px 1px rgba(201,158,102,.6)',
        transition: 'width .15s ease, height .15s ease, background .2s ease, box-shadow .2s ease',
        willChange: 'transform',
      }} />

      {/* Mira táctica */}
      <div ref={ringRef} aria-hidden style={{
        position: 'fixed', top: 0, left: 0, zIndex: 99998,
        pointerEvents: 'none',
        display: inNav ? 'none' : 'block',
        width: ringSize, height: ringSize,
        transition: 'width .25s cubic-bezier(.34,1.56,.64,1), height .25s cubic-bezier(.34,1.56,.64,1), opacity .2s ease',
        opacity: ringOpacity,
        willChange: 'transform',
      }}>
        {/* Círculo */}
        <svg width={ringSize} height={ringSize} viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0 }}>
          <circle
            cx="22" cy="22" r="18"
            fill="none"
            stroke={isHover ? '#fff' : '#C99E66'}
            strokeWidth={isHover ? 1.2 : 1}
            strokeDasharray={isClick ? '4 4' : 'none'}
            style={{ transition: 'stroke .2s ease, stroke-width .2s ease' }}
          />
        </svg>

        {/* Líneas de mira — N S E O con gap central */}
        {[
          { x1: 22, y1: 2,  x2: 22, y2: 10 },  // top
          { x1: 22, y1: 34, x2: 22, y2: 42 },  // bottom
          { x1: 2,  y1: 22, x2: 10, y2: 22 },  // left
          { x1: 34, y1: 22, x2: 42, y2: 22 },  // right
        ].map((l, i) => (
          <svg key={i} width={ringSize} height={ringSize} viewBox="0 0 44 44"
            style={{ position: 'absolute', inset: 0 }}>
            <line
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={isHover ? '#fff' : '#C99E66'}
              strokeWidth={isHover ? 1.5 : 1}
              style={{ transition: 'stroke .2s ease' }}
            />
          </svg>
        ))}
      </div>
    </>
  );
}
