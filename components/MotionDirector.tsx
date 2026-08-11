'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR =
  '.section-tag, .divider, .section-title, .about-text p, .about-pillars, .pillar-card, .research-focus, .research-card, .pub-item, .exp-timeline, .exp-item, .award-card, .skill-group, .skills-note, .contact-title, .contact-sub, .contact-link, .footer-name, .footer-note, .hero-sub, .hero-cta, .hero-tag, .hero-product, .sim-caption, .hero-stats, .showcase-stage';

export default function MotionDirector() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. split display text into per-letter spans for kinetic rise
    document.querySelectorAll<HTMLElement>('.split-letters').forEach((el) => {
      if (el.dataset.split) return;
      el.dataset.split = '1';
      const text = el.textContent ?? '';
      el.setAttribute('aria-label', text);
      el.textContent = '';
      Array.from(text).forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.style.setProperty('--letter-i', String(i));
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.setAttribute('aria-hidden', 'true');
        el.appendChild(span);
      });
    });

    // 2. reveal choreography (position-based, checked in the scroll loop)
    const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    targets.forEach((el, index) => {
      el.classList.add('reveal-item');
      el.style.setProperty('--reveal-delay', `${Math.min(index * 40, 480)}ms`);
    });

    const pending = new Set(targets);
    if (reduceMotion) {
      root.classList.add('motion-reduced');
      targets.forEach((el) => el.classList.add('is-visible'));
      pending.clear();
    }

    const revealCheck = () => {
      if (pending.size === 0) return;
      const vh = window.innerHeight;
      pending.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.9 && rect.bottom > -40) {
          el.classList.add('is-visible');
          pending.delete(el);
        }
      });
    };

    // 3. scroll engine: global progress, per-scene progress, background morph
    const scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    let frame = 0;

    const update = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      root.style.setProperty('--scroll-progress', (window.scrollY / max).toFixed(4));

      const mid = window.innerHeight / 2;
      for (const scene of scenes) {
        const rect = scene.getBoundingClientRect();
        const progress = Math.min(
          1,
          Math.max(0, (window.innerHeight - rect.top) / (rect.height + window.innerHeight))
        );
        scene.style.setProperty('--scene-progress', progress.toFixed(3));

        // scrubbed stage scenes (sticky showcase): 0..1 across the pinned span
        if (scene.dataset.stages) {
          const total = parseInt(scene.dataset.stages, 10) || 1;
          const span = Math.max(1, rect.height - window.innerHeight);
          const scrub = Math.min(1, Math.max(0, -rect.top / span));
          scene.style.setProperty('--scrub', scrub.toFixed(3));

          // Quantize scrub into fixed stage buckets and step through stages one-by-one,
          // even during momentum scroll, to preserve cinematic progression.
          const epsilon = 0.0001;
          let targetStage = Math.min(
            total - 1,
            Math.floor(Math.min(1, scrub + epsilon) * total)
          );

          // Tune the 4-stage showcase thresholds for mobile momentum scroll so
          // each stage gets a readable window during the sticky run.
          if (total === 4) {
            if (scrub < 0.22) targetStage = 0;
            else if (scrub < 0.47) targetStage = 1;
            else if (scrub < 0.74) targetStage = 2;
            else targetStage = 3;
          }
          const currentStage = parseInt(scene.dataset.stage ?? '0', 10) || 0;
          let nextStage = targetStage;
          if (targetStage > currentStage + 1) nextStage = currentStage + 1;
          if (targetStage < currentStage - 1) nextStage = currentStage - 1;
          const stage = String(nextStage);
          if (scene.dataset.stage !== stage) scene.dataset.stage = stage;
        }

        if (rect.top <= mid && rect.bottom > mid && scene.dataset.bg) {
          root.style.backgroundColor = scene.dataset.bg;
        }
      }
      revealCheck();
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    // re-check after fonts/images settle layout
    const settleTimer = window.setTimeout(update, 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // 4. cursor glow (fine pointers only)
    const onMove = (e: MouseEvent) => {
      root.style.setProperty('--cursor-x', `${e.clientX}px`);
      root.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!reduceMotion && finePointer) {
      window.addEventListener('mousemove', onMove, { passive: true });
    }

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('mousemove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
