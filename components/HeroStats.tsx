'use client';

import { useEffect, useRef } from 'react';
import { HERO_STATS } from '@/lib/data';

/** Animates numeric stats counting up when they enter the viewport. */
export default function HeroStats() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const cells = Array.from(root.querySelectorAll<HTMLElement>('.stat-num'));

    const animate = (el: HTMLElement) => {
      const raw = el.dataset.value ?? '';
      const match = raw.match(/^(\D*)(\d+)(.*)$/);
      if (!match) return;
      const [, prefix, numStr, suffix] = match;
      const target = parseInt(numStr, 10);
      const dur = 1400;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target as HTMLElement);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    cells.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, []);

  return (
    <div className="hero-stats" ref={ref}>
      {HERO_STATS.map((s) => (
        <div key={s.label} className="stat-cell">
          <span className="stat-num" data-value={s.num}>
            {s.num}
          </span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
