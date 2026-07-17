"use client";

import * as React from "react";
import { animate, useInView } from "framer-motion";

type Props = {
  /** Target number to count up to. */
  to: number;
  /** Duration of the count-up in milliseconds. */
  duration?: number;
  /** Delay before starting, in milliseconds. */
  delay?: number;
  /** Render function that receives the current (possibly fractional) value. */
  children: (value: number) => React.ReactNode;
};

/**
 * Counts up from 0 to `to` when the element scrolls into view.
 * Returns a render-prop so the parent can format (Persian digits, "+", etc).
 *
 * Robustness notes:
 * - Uses `amount: 0.1` (10% visible) so the count starts as soon as the
 *   stat peeks into view, with less scroll required than the old 0.2.
 *   Combined with RevealOnScroll's positive bottom margin in
 *   reveal-on-scroll.tsx, the whole section feels more responsive.
 * - Has a fallback timer (1.5s) that force-starts the animation if the
 *   IntersectionObserver never fires — fixes the mobile bug where the
 *   stat would stay at "0" because the observer missed the element.
 * - `startedRef` prevents double-starting if both triggers fire.
 */
export function CountUp({ to, duration = 2600, delay = 200, children }: Props) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });
  const [value, setValue] = React.useState(0);
  const startedRef = React.useRef(false);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);

  const start = React.useCallback(
    (startDelay: number) => {
      if (startedRef.current) return;
      startedRef.current = true;
      const controls = animate(0, to, {
        duration: duration / 1000,
        delay: startDelay / 1000,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => setValue(v),
      });
      controlsRef.current = controls;
    },
    [to, duration],
  );

  // Primary trigger: IntersectionObserver fires when 20% visible.
  React.useEffect(() => {
    if (!inView) return;
    start(delay);
  }, [inView, start, delay]);

  // Cleanup on unmount.
  React.useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  // Fallback: if observer hasn't fired after 1.5s, force-start.
  // (Fixes mobile bug where stat stays at 0.)
  React.useEffect(() => {
    if (startedRef.current) return;
    const timer = window.setTimeout(() => {
      start(0);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [start]);

  return <span ref={ref}>{children(value)}</span>;
}

/** Convert a number to Persian digits. */
export function toPersianDigits(n: number | string): string {
  const map = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/[0-9]/g, (d) => map[Number(d)]);
}
