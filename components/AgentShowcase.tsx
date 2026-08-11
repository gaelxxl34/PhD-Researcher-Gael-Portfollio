 'use client';

import { createElement, useEffect, useState } from 'react';

const SUPPORT_AGENT = {
  label: 'Support Agent',
  src: '/models/robot-expressive.glb',
  orbit: '-12deg 78deg 124%',
  target: 'auto auto auto',
  exposure: '0.98',
  shadow: '0.6',
  scale: '0.88 0.88 0.88',
} as const;

const SUPPORT_ANIMATIONS = ['Idle', 'Walking', 'Running', 'Dance'] as const;

const STAGE_SHOTS = [
  {
    animation: 'Idle',
    orbit: '-28deg 72deg 118%',
    target: 'auto auto auto',
    fov: 'auto',
    exposure: '0.92',
    shadow: '0.6',
    tone: 'scan',
  },
  {
    animation: 'Walking',
    orbit: '-8deg 78deg 108%',
    target: 'auto auto auto',
    fov: 'auto',
    exposure: '1.0',
    shadow: '0.8',
    tone: 'decision',
  },
  {
    animation: 'Running',
    orbit: '14deg 82deg 100%',
    target: 'auto auto auto',
    fov: 'auto',
    exposure: '1.06',
    shadow: '1.0',
    tone: 'action',
  },
  {
    animation: 'Dance',
    orbit: '38deg 76deg 128%',
    target: 'auto auto auto',
    fov: 'auto',
    exposure: '1.02',
    shadow: '0.88',
    tone: 'cooperate',
  },
] as const;

const CAPTIONS = [
  {
    title: (
      <>
        First, my agents <em>perceive</em>
      </>
    ),
    desc: 'Every agent first reads the environment: constraints, hazards, and state transitions that shape what actions are possible.',
  },
  {
    title: (
      <>
        Then they <em>decide</em>
      </>
    ),
    desc: 'Weighing options under uncertainty, each agent plans the best action — no central controller required.',
  },
  {
    title: (
      <>
        They <em>act</em> autonomously
      </>
    ),
    desc: 'Decisions become movement. Thousands of agents execute simultaneously in real-time simulation.',
  },
  {
    title: (
      <>
        And <em>cooperate</em> at scale
      </>
    ),
    desc: 'Thousands of agents synchronize intent, share local state, and coordinate in real time — reliability emerges from cooperation under pressure.',
  },
];

export default function AgentShowcase() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const section = document.getElementById('showcase');
    if (!section) return;

    const model = section.querySelector<HTMLElement>('model-viewer.showcase-model');
    const supportModel = section.querySelector<HTMLElement>('model-viewer.support-model');
    if (!model || !supportModel) return;

    const applyStage = () => {
      const stage = parseInt(section.dataset.stage ?? '0', 10);
      const shot = STAGE_SHOTS[stage] ?? STAGE_SHOTS[0];
      const supportAnim = SUPPORT_ANIMATIONS[stage] ?? SUPPORT_ANIMATIONS[0];

      model.setAttribute('animation-name', shot.animation);
      model.setAttribute('camera-orbit', shot.orbit);
      model.setAttribute('camera-target', shot.target);
      model.setAttribute('field-of-view', shot.fov);
      model.setAttribute('exposure', shot.exposure);
      model.setAttribute('shadow-intensity', shot.shadow);
      supportModel.setAttribute('animation-name', supportAnim);

      section.setAttribute('data-shot', shot.tone);
    };

    applyStage();
    const observer = new MutationObserver(applyStage);
    observer.observe(section, { attributes: true, attributeFilter: ['data-stage'] });
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <section
      className="showcase"
      id="showcase"
      data-scene
      data-bg="#eef1fb"
      data-stages="4"
    >
      <div className="showcase-sticky">
        <div className="showcase-head">
          <span className="section-tag">Watch it work — keep scrolling</span>
        </div>

        <div className="showcase-captions">
          {CAPTIONS.map((cap, i) => (
            <div className={`cap cap-${i}`} key={i}>
              <h3>{cap.title}</h3>
              <p>{cap.desc}</p>
            </div>
          ))}
        </div>

        <div className="showcase-stage" aria-hidden="true">
          <div className="env-skybox" />
          <div className="env-terrain" />
          <div className="env-zones">
            <i className="env-zone z1" />
            <i className="env-zone z2" />
            <i className="env-zone z3" />
          </div>
          <div className="env-corridor" />
          <div className="stage-orbit-lines" />
          <div className="stage-scan-beam" />
          <div className="stage-light stage-light-warm" />
          <div className="stage-light stage-light-cool" />
          <div className="stage-grid" />
          <div className="stage-ground" />

          <div className="radar r1" />
          <div className="radar r2" />
          <div className="radar r3" />

          <div className="branch b1" />
          <div className="branch b2" />
          <div className="branch b3" />

          <div className="speedline s1" />
          <div className="speedline s2" />
          <div className="speedline s3" />

          <div className="support-rig" aria-hidden="true">
            {mounted ? (
              createElement('model-viewer', {
                className: 'support-model',
                src: SUPPORT_AGENT.src,
                alt: `${SUPPORT_AGENT.label} robot`,
                autoplay: true,
                'camera-controls': false,
                'interaction-prompt': 'none',
                'shadow-intensity': SUPPORT_AGENT.shadow,
                'camera-target': SUPPORT_AGENT.target,
                'camera-orbit': SUPPORT_AGENT.orbit,
                'animation-name': SUPPORT_ANIMATIONS[0],
                scale: SUPPORT_AGENT.scale,
                exposure: SUPPORT_AGENT.exposure,
                'environment-image': 'neutral',
                'animation-crossfade-duration': '250',
              } as any)
            ) : (
              <div className="support-model" aria-hidden="true" />
            )}
          </div>
          <div className="sync-link" />

          <div className="robot-rig">
            {mounted ? (
              createElement('model-viewer', {
                className: 'showcase-model',
                src: '/models/robot-expressive.glb',
                alt: 'Animated 3D robot',
                autoplay: true,
                'camera-controls': true,
                'interaction-prompt': 'none',
                'shadow-intensity': '0.9',
                exposure: '1.05',
                'environment-image': 'neutral',
                'animation-name': 'Idle',
                'animation-crossfade-duration': '350',
                'interpolation-decay': '160',
              } as any)
            ) : (
              <div className="showcase-model" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="stage-dots" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}
