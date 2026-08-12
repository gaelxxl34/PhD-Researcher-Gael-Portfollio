import AgentCity from '@/components/AgentCity';

// TODO(gael): robots available for 404/easter egg — /public/models/robot-expressive.glb,
// /public/vendor/model-viewer.min.js and /public/images/city-street.jpg are no longer
// referenced by this section but were intentionally left on disk.

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

/**
 * "Watch it work" — a scroll-scrubbed, genuinely live multi-agent simulation.
 * The captions scroll through four states while the pinned canvas morphs the
 * same running simulation between them (see components/AgentCity.tsx and
 * lib/sim/). MotionDirector drives `data-stage` on the section; the canvas
 * reads its own continuous scroll progress for smooth state blending.
 */
export default function AgentShowcase() {
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
              <h2>{cap.title}</h2>
              <p>{cap.desc}</p>
            </div>
          ))}
        </div>

        <div className="showcase-stage">
          <AgentCity />
        </div>
      </div>
    </section>
  );
}
