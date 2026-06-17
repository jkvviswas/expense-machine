import { useEffect, useRef, useState } from 'react';
import { Money } from '../../import/components/Money';
import { prefersReducedMotion } from '../../motion/primitives';

/**
 * Animates a money figure counting up to its final value, then renders the
 * EXACT target through the existing <Money> component. Uses anime.js for the
 * numeric tween (its sweet spot), dynamically imported so it stays out of the
 * critical entry chunk. The settled value is unchanged from `amount` — this is
 * presentation only and never alters the figure.
 */
export function CountUpMoney({
  amount,
  colorize = false,
  className = '',
  duration = 1100,
  decimalStyle,
}: {
  amount: number;
  colorize?: boolean;
  className?: string;
  duration?: number;
  decimalStyle?: 'superscript' | 'inline';
}) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? amount : 0);
  const settled = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(amount);
      return;
    }
    settled.current = false;
    let cancelled = false;
    let pause: (() => void) | null = null;

    import('animejs').then(({ default: anime }) => {
      if (cancelled) return;
      const obj = { v: 0 };
      const anim = anime({
        targets: obj,
        v: amount,
        duration,
        easing: 'cubicBezier(0.22, 1, 0.36, 1)',
        update: () => {
          if (!settled.current) setDisplay(Math.round(obj.v));
        },
        complete: () => {
          settled.current = true;
          setDisplay(amount); // ensure exact final value
        },
      });
      pause = () => anim.pause();
    });

    return () => {
      cancelled = true;
      pause?.();
    };
  }, [amount, duration]);

  return <Money amount={display} colorize={colorize} className={className} decimalStyle={decimalStyle} />;
}
