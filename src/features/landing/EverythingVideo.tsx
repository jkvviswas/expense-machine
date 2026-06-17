import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useScroll, useTransform, useSpring } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;
const eyebrow = 'font-mono text-[0.64rem] uppercase tracking-[0.22em] text-brass';

/**
 * "Everything in one place" — a calm, cinematic product reel. The video plays
 * the real screens (Dashboard → Import → Accounts → Transactions → Analytics →
 * Reports) crossfading slowly. It autoplays muted and loops once in view, and
 * pauses when scrolled away. A play/pause control lets the user take over; once
 * they do, scroll no longer auto-toggles it.
 */
export function EverythingVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(sectionRef, { margin: '-15% 0px' });
  const [playing, setPlaying] = useState(true);
  const userControlled = useRef(false);

  // Gentle parallax + settle on the frame.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const y = useSpring(useTransform(scrollYProgress, [0, 1], [40, -40]), {
    stiffness: 40,
    damping: 22,
  });

  // Auto play/pause with scroll — unless the user has taken manual control.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || userControlled.current) return;
    if (inView) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [inView]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    userControlled.current = true;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section className="border-t border-hairline py-24">
      <div ref={sectionRef} className="mx-auto max-w-content px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12% 0px' }}
          transition={{ duration: 1.1, ease: EASE }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className={`${eyebrow} mb-5`}>Everything, in one place</div>
          <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.7rem]">
            Your whole financial life,
            <br />
            on one ledger.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-relaxed text-muted">
            Import, accounts, transactions, analytics and reports — one reconciled
            system, moving as a single piece.
          </p>
        </motion.div>

        {/* Framed reel — floats with depth, plays in view */}
        <motion.div
          style={{ y }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 1.2, ease: EASE }}
          className="relative mx-auto mt-14 w-full max-w-5xl"
        >
          <div
            aria-hidden
            className="absolute -inset-x-6 -top-6 bottom-8 rounded-panel"
            style={{ background: 'var(--em-glow-brass)', filter: 'blur(44px)' }}
          />
          <div
            className="relative overflow-hidden rounded-panel border border-hairline-strong bg-surface"
            style={{ boxShadow: '0 60px 120px rgba(0,0,0,0.5), inset 0 0 0 1px var(--em-glow-brass)' }}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-loss/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-watch/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-gain/50" />
              <span className="ml-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
                Expense Machine · One reconciled ledger
              </span>
            </div>
            <video
              ref={videoRef}
              src="/video/everything-in-one-place.mp4"
              poster="/video/everything-poster.jpg"
              muted
              loop
              playsInline
              preload="metadata"
              className="block w-full"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.04) 0%, transparent 38%)' }}
            />
            {/* play / pause control — always visible, high contrast */}
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause demo' : 'Play demo'}
              className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-brass-deep text-void backdrop-blur-md transition-transform hover:scale-105"
              style={{
                background: 'var(--em-brass)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.5), 0 0 0 4px var(--em-glow-brass)',
              }}
            >
              {playing
                ? <Pause size={18} strokeWidth={2.4} fill="currentColor" />
                : <Play size={18} strokeWidth={2.4} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
