'use client';

import { useEffect, useRef } from 'react';

type Agent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

type Pulse = {
  from: number;
  to: number;
  t: number;
};

const LINK_DIST = 110;
const AGENT_COUNT_DESKTOP = 70;
const AGENT_COUNT_MOBILE = 36;

/**
 * A live multi-agent flocking simulation: agents move with separation /
 * alignment / cohesion, link when near each other, and exchange golden
 * "communication pulses" along links. Visual storytelling for MAS research.
 */
export default function AgentSimulation({
  variant = 'dark',
}: {
  variant?: 'dark' | 'light';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    // cap devicePixelRatio harder on small viewports to keep mobile fill-rate low
    const smallViewport = window.innerWidth < 700;
    const dpr = Math.min(window.devicePixelRatio || 1, smallViewport ? 1.5 : 2);
    const agents: Agent[] = [];
    const pulses: Pulse[] = [];
    const mouse = { x: -9999, y: -9999 };

    const palette =
      variant === 'dark'
        ? {
            agent: 'rgba(70, 90, 112, 0.78)',
            agentCore: 'rgba(244, 242, 238, 0.95)',
            link: '82, 96, 109',
            pulse: 'rgba(168, 116, 58, 1)',
          }
        : {
            agent: 'rgba(49, 70, 93, 0.72)',
            agentCore: 'rgba(255, 255, 255, 0.95)',
            link: '36, 59, 83',
            pulse: 'rgba(168, 116, 58, 1)',
          };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width ?? window.innerWidth;
      height = rect?.height ?? window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      agents.length = 0;
      const count = width < 700 ? AGENT_COUNT_MOBILE : AGENT_COUNT_DESKTOP;
      for (let i = 0; i < count; i++) {
        agents.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 1.4 + Math.random() * 1.8,
        });
      }
    };

    const step = () => {
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        let sepX = 0;
        let sepY = 0;
        let aliX = 0;
        let aliY = 0;
        let cohX = 0;
        let cohY = 0;
        let n = 0;

        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;
          const b = agents[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST && d2 > 0.01) {
            const d = Math.sqrt(d2);
            sepX -= (dx / d) * (1 - d / LINK_DIST);
            sepY -= (dy / d) * (1 - d / LINK_DIST);
            aliX += b.vx;
            aliY += b.vy;
            cohX += b.x;
            cohY += b.y;
            n++;
          }
        }

        if (n > 0) {
          a.vx += sepX * 0.02 + (aliX / n - a.vx) * 0.01 + (cohX / n - a.x) * 0.0004;
          a.vy += sepY * 0.02 + (aliY / n - a.vy) * 0.01 + (cohY / n - a.y) * 0.0004;
        }

        // gentle mouse repulsion so visitors can "disturb" the swarm
        const mdx = a.x - mouse.x;
        const mdy = a.y - mouse.y;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < 120 * 120 && md2 > 0.01) {
          const md = Math.sqrt(md2);
          a.vx += (mdx / md) * 0.12;
          a.vy += (mdy / md) * 0.12;
        }

        const speed = Math.hypot(a.vx, a.vy);
        const max = 0.9;
        if (speed > max) {
          a.vx = (a.vx / speed) * max;
          a.vy = (a.vy / speed) * max;
        }

        a.x += a.vx;
        a.y += a.vy;

        if (a.x < -20) a.x = width + 20;
        if (a.x > width + 20) a.x = -20;
        if (a.y < -20) a.y = height + 20;
        if (a.y > height + 20) a.y = -20;
      }

      // spawn occasional communication pulses along existing links
      if (Math.random() < 0.12 && pulses.length < 14) {
        const i = Math.floor(Math.random() * agents.length);
        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;
          const dx = agents[j].x - agents[i].x;
          const dy = agents[j].y - agents[i].y;
          if (dx * dx + dy * dy < LINK_DIST * LINK_DIST) {
            pulses.push({ from: i, to: j, t: 0 });
            break;
          }
        }
      }
      for (let p = pulses.length - 1; p >= 0; p--) {
        pulses[p].t += 0.03;
        if (pulses[p].t >= 1) pulses.splice(p, 1);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // links
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const a = agents[i];
          const b = agents[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.5;
            ctx.strokeStyle = `rgba(${palette.link}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // communication pulses
      for (const p of pulses) {
        const a = agents[p.from];
        const b = agents[p.to];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        const fade = Math.sin(p.t * Math.PI);
        ctx.fillStyle = palette.pulse;
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.25;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // agents
      for (const a of agents) {
        ctx.fillStyle = palette.agent;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = palette.agentCore;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // on small viewports simulate at ~30fps instead of display refresh rate
    let skipFrame = false;
    const loop = () => {
      if (!running) return;
      raf = window.requestAnimationFrame(loop);
      if (smallViewport) {
        skipFrame = !skipFrame;
        if (skipFrame) return;
      }
      step();
      draw();
    };

    resize();
    seed();

    if (reduceMotion) {
      // static constellation for reduced-motion users
      step();
      draw();
    } else {
      loop();
    }

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onResize = () => {
      resize();
      seed();
      if (reduceMotion) {
        step();
        draw();
      }
    };

    // pause when offscreen to keep the page at 60fps
    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduceMotion) return;
        if (entry.isIntersecting && !running) {
          running = true;
          loop();
        } else if (!entry.isIntersecting && running) {
          running = false;
          window.cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      io.disconnect();
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="agent-canvas" aria-hidden="true" />;
}
