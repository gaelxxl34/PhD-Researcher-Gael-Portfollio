'use client';

import { useEffect, useRef } from 'react';
import { Simulation, TICK_DT, type StateWeights } from '@/lib/sim';
import { computeCamera, render, type Camera } from '@/lib/sim/render';

/**
 * Live multi-agent simulation stage for the showcase section.
 *
 * One simulation runs continuously; scroll progress through the pinned
 * section morphs a weight vector over the four narrative states
 * (perceive → decide → act → cooperate). The sim ticks at a fixed 30 Hz
 * decoupled from rAF rendering; rendering pauses when the canvas is
 * off-screen or the tab is hidden; sustained frame-budget overruns degrade
 * agent count stepwise ("mode: eco" in the HUD).
 *
 * prefers-reduced-motion: the live loop is replaced by four static frames
 * generated from the same simulation, crossfaded on state change only.
 */

const DESKTOP_MAX = 1200;
const MOBILE_MAX = 250;
const MOBILE_BP = 768;
/** caption/stage boundaries — must match MotionDirector's stage thresholds */
const BOUNDS = [0.22, 0.47, 0.74];
const BLEND = 0.05;

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function weightsFromScrub(scrub: number): StateWeights {
  const s0 = smooth((scrub - (BOUNDS[0] - BLEND)) / (2 * BLEND));
  const s1 = smooth((scrub - (BOUNDS[1] - BLEND)) / (2 * BLEND));
  const s2 = smooth((scrub - (BOUNDS[2] - BLEND)) / (2 * BLEND));
  return {
    perceive: 1 - s0,
    decide: s0 - s1,
    act: s1 - s2,
    cooperate: s2,
  };
}

const STAGE_WEIGHTS: StateWeights[] = [
  { perceive: 1, decide: 0, act: 0, cooperate: 0 },
  { perceive: 0, decide: 1, act: 0, cooperate: 0 },
  { perceive: 0, decide: 0, act: 1, cooperate: 0 },
  { perceive: 0, decide: 0, act: 0, cooperate: 1 },
];

export default function AgentCity() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const hud = hudRef.current;
    if (!wrap || !canvas || !hud) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mobile = window.innerWidth < MOBILE_BP;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // verification hook: ?noeco disables the degradation watchdog so headless
    // (software-rendered) screenshot runs show the true populations
    const ecoDisabled = new URLSearchParams(window.location.search).has('noeco');
    const section = (canvas.closest('[data-scene]') as HTMLElement | null) ?? wrap;

    const sim = new Simulation({
      seed: 20260811,
      maxAgents: mobile ? MOBILE_MAX : DESKTOP_MAX,
    });

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let destroyed = false;
    let camera: Camera = { cx: 0, cy: 0, scale: 1 };
    let rippleT = -1;
    let lastHud = 0;
    let lastFrame = -1;
    // frame-budget watchdog for eco mode (consecutive over-budget frames only —
    // rAF gaps from tab throttling or GC pauses must not trigger degradation)
    let overCount = 0;
    let ecoStep = 0;
    const perfBuf: number[] = [];
    // exposed for the Playwright performance harness
    (window as unknown as { __simPerf?: number[] }).__simPerf = perfBuf;
    (window as unknown as { __sim?: Simulation }).__sim = sim;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    const scrub = () => {
      const rect = section.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      return Math.min(1, Math.max(0, -rect.top / span));
    };

    const updateHud = (now: number) => {
      if (now - lastHud < 250) return;
      lastHud = now;
      const m = sim.metrics();
      const wt = sim.weights;
      const compact = w < 480;
      const parts = [`agents ${m.agents.toLocaleString('en-US')}`];
      if (!compact) parts.push(`v ${m.avgSpeedMs.toFixed(1)} m/s`);
      parts.push(`${m.ticksPerSec} ticks/s`);
      if (sim.closure >= 0) {
        parts.push(`reroutes ${m.reroutes}`);
        parts.push(
          `congestion ${m.congestionTrend === 'falling' ? '↓' : m.congestionTrend === 'rising' ? '↑' : '·'}${compact ? '' : ` ${m.congestionTrend}`}`
        );
      } else if (wt.act > 0.4 && !compact) {
        parts.push(`congestion ${Math.min(100, Math.round(m.congestion * 100))}%`);
      }
      if (m.eco) parts.push('mode eco');
      hud.textContent = parts.join(' · ');
    };

    // ------------------------------------------------------------------
    // reduced motion: four static frames from the same simulation
    // ------------------------------------------------------------------
    if (reduceMotion) {
      resize();
      const frames: HTMLCanvasElement[] = [];
      const buildFrames = () => {
        frames.length = 0;
        const s = new Simulation({ seed: 20260811, maxAgents: mobile ? MOBILE_MAX : 700 });
        const runs = [8, 7, 10, 3.4]; // seconds simulated per state
        for (let st = 0; st < 4; st++) {
          s.setWeights(STAGE_WEIGHTS[st]);
          for (let i = 0; i < runs[st] * 30; i++) s.tick(TICK_DT);
          const frame = document.createElement('canvas');
          frame.width = canvas.width;
          frame.height = canvas.height;
          const fctx = frame.getContext('2d')!;
          fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          render(fctx, s, {
            w,
            h,
            weights: STAGE_WEIGHTS[st],
            alpha: 1,
            mobile,
            rippleT: -1,
          });
          frames.push(frame);
        }
        const m = s.metrics();
        hud.textContent = `static preview  ·  agents ${m.agents.toLocaleString('en-US')}  ·  reduced motion`;
      };
      buildFrames();

      let current = -1;
      let fadeRaf = 0;
      const show = (stage: number) => {
        if (stage === current || !frames[stage]) return;
        const prev = current;
        current = stage;
        cancelAnimationFrame(fadeRaf);
        if (prev < 0) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(frames[stage], 0, 0);
          return;
        }
        // single short crossfade, then still — no autonomous motion
        const t0 = performance.now();
        const fade = (now: number) => {
          const t = Math.min(1, (now - t0) / 320);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.drawImage(frames[prev], 0, 0);
          ctx.globalAlpha = t;
          ctx.drawImage(frames[stage], 0, 0);
          ctx.globalAlpha = 1;
          if (t < 1) fadeRaf = requestAnimationFrame(fade);
        };
        fadeRaf = requestAnimationFrame(fade);
      };

      const stageNow = () => parseInt(section.dataset.stage ?? '0', 10) || 0;
      show(stageNow());
      const mo = new MutationObserver(() => show(stageNow()));
      mo.observe(section, { attributes: true, attributeFilter: ['data-stage'] });
      const onResize = () => {
        resize();
        buildFrames();
        const c = current;
        current = -1;
        show(c < 0 ? 0 : c);
      };
      window.addEventListener('resize', onResize);
      return () => {
        mo.disconnect();
        cancelAnimationFrame(fadeRaf);
        window.removeEventListener('resize', onResize);
      };
    }

    // ------------------------------------------------------------------
    // live loop
    // ------------------------------------------------------------------
    const loop = (now: number) => {
      if (destroyed) return;
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;

      // frame time watchdog (render + sim cost as experienced by rAF cadence)
      if (lastFrame >= 0) {
        const ft = now - lastFrame;
        if (ft < 60) {
          if (perfBuf.length > 600) perfBuf.shift();
          perfBuf.push(ft);
          if (ft > 17.5) overCount++;
          else if (ft < 15) overCount = 0;
          // ~2s of consecutive over-budget frames at 60 Hz
          if (overCount >= 110 && ecoStep < 3 && !ecoDisabled) {
            ecoStep++;
            overCount = 0;
            const next = Math.max(
              mobile ? 100 : 300,
              Math.round(sim.getMaxAgents() * 0.7)
            );
            sim.setMaxAgents(next, true);
          }
        }
      }
      lastFrame = now;

      sim.setWeights(weightsFromScrub(scrub()));
      const alpha = sim.update(now);
      if (rippleT >= 0) {
        rippleT += 1 / 55;
        if (rippleT > 1) rippleT = -1;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      camera = render(ctx, sim, {
        w,
        h,
        weights: sim.weights,
        alpha,
        mobile,
        rippleT,
      });
      updateHud(now);
    };

    resize();
    raf = requestAnimationFrame(loop);

    // pause when off-screen / tab hidden
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) lastFrame = -1;
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    const onVis = () => {
      lastFrame = -1;
    };
    document.addEventListener('visibilitychange', onVis);

    // pointer disturbance: the cursor is a soft-avoid zone in the world
    const toWorld = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      return {
        x: (sx - w / 2) / camera.scale + camera.cx,
        y: (sy - h / 2) / camera.scale + camera.cy,
      };
    };
    let touchClear = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const p = toWorld(e);
      sim.setPointer(p.x, p.y, true);
    };
    const onLeave = () => sim.setPointer(0, 0, false);
    const onDown = (e: PointerEvent) => {
      const p = toWorld(e);
      sim.setPointer(p.x, p.y, true);
      rippleT = 0;
      if (e.pointerType === 'touch') {
        window.clearTimeout(touchClear);
        touchClear = window.setTimeout(() => sim.setPointer(0, 0, false), 1500);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      window.clearTimeout(touchClear);
    };
  }, []);

  return (
    <div className="sim-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="sim-canvas"
        role="img"
        aria-label="Live multi-agent simulation: up to 1,200 autonomous agents navigate a procedurally generated street grid. As you scroll, the same simulation shifts emphasis — agents sense their surroundings, weigh alternative routes, move at scale, and share information to reroute around a street closure with no central controller."
      />
      <div className="sim-hud" ref={hudRef} aria-hidden="true" />
      <div className="sim-steps" aria-hidden="true">
        <span className="ss-0">01 perceive</span>
        <span className="ss-1">02 decide</span>
        <span className="ss-2">03 act</span>
        <span className="ss-3">04 cooperate</span>
      </div>
    </div>
  );
}
