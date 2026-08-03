import Image from 'next/image';
import { SITE } from '@/lib/data';
import AgentSimulation from '@/components/AgentSimulation';
import HeroStats from '@/components/HeroStats';

export default function Hero() {
  return (
    <section className="hero" id="home" data-scene data-bg="#f6f5fb">
      <AgentSimulation variant="light" />
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-tag">PhD Researcher · UT Dallas · Multi-Agent Systems</p>
          <h1 className="hero-name">
            <span className="line split-letters">Gael</span>
            <span className="line line-accent split-letters">Ongoriko</span>
          </h1>
          <p className="hero-sub">
            I build worlds where <em>thousands of AI agents</em> perceive, decide, and
            cooperate — from emergency response orchestration to
            mission-critical infrastructure recovery after outages.
          </p>
          <div className="hero-cta">
            <a href="#research" className="btn-primary">
              View Research
            </a>
            <a href="#contact" className="btn-outline">
              Get in Touch
            </a>
          </div>
        </div>

        <div className="hero-product">
          <div className="hero-photo-card">
            <Image src="/gael.jpg" alt={SITE.name} width={360} height={443} priority />
          </div>
          <span className="chip chip-1">
            <i /> GAIME Winner — $75K
          </span>
          <span className="chip chip-2">
            <i /> PhD @ UT Dallas
          </span>
          <span className="chip chip-3">
            <i /> 400+ Students Mentored
          </span>
        </div>
      </div>

      <div className="hero-foot">
        <p className="sim-caption">
          <span className="sim-dot" /> Live multi-agent simulation — my research, running
          in your browser
        </p>
        <HeroStats />
      </div>
    </section>
  );
}
