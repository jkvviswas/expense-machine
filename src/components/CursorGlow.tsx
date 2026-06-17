import { useEffect, useRef, useState } from 'react';
import { useResolvedTheme } from '../features/theme/store';

/**
 * Replaces the system cursor with a small round dot over the landing page, plus
 * a soft champagne halo that trails behind it ("Lumos" wand-light). The default
 * arrow is hidden (cursor: none on the landing root); this dot tracks the
 * pointer tightly while the halo lags gently. Disabled on touch / reduced-motion
 * (where the system cursor stays).
 */
export function CursorGlow() {
  const haloRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const halo = useRef({ x: -100, y: -100 });
  const dot = useRef({ x: -100, y: -100 });
  const raf = useRef(0);
  const [enabled, setEnabled] = useState(false);
  const resolved = useResolvedTheme();

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    setEnabled(true);
    // Hide the system cursor across the landing page.
    document.body.classList.add('em-cursor-none');

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    const onDown = () => dotRef.current?.classList.add('em-dot-press');
    const onUp = () => dotRef.current?.classList.remove('em-dot-press');
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    const loop = () => {
      // Dot tracks tightly (it IS the cursor); halo lags for the trailing light.
      dot.current.x += (target.current.x - dot.current.x) * 0.32;
      dot.current.y += (target.current.y - dot.current.y) * 0.32;
      halo.current.x += (target.current.x - halo.current.x) * 0.1;
      halo.current.y += (target.current.y - halo.current.y) * 0.1;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${dot.current.x - 5}px, ${dot.current.y - 5}px, 0)`;
      }
      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${halo.current.x - 220}px, ${halo.current.y - 220}px, 0)`;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);

    return () => {
      document.body.classList.remove('em-cursor-none');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!enabled) return null;

  const dark = resolved === 'dark';
  return (
    <>
      {/* soft trailing halo */}
      <div
        ref={haloRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-[440px] w-[440px] will-change-transform"
        style={{
          background: 'radial-gradient(circle, var(--em-glow-focal) 0%, transparent 60%)',
          opacity: dark ? 0.5 : 0.6,
          mixBlendMode: dark ? 'screen' : 'multiply',
        }}
      />
      {/* the round dot — the cursor itself */}
      <div
        ref={dotRef}
        aria-hidden
        className="em-cursor-dot pointer-events-none fixed left-0 top-0 z-[61] h-2.5 w-2.5 rounded-full will-change-transform"
        style={{
          background: 'var(--em-brass)',
          boxShadow: '0 0 10px var(--em-brass), 0 0 4px rgba(234,200,112,0.9)',
        }}
      />
    </>
  );
}
