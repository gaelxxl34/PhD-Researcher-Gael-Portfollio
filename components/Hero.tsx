import Image from 'next/image';
import { HERO_STATS, SITE } from '@/lib/data';

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-left">
        <span className="hero-tag">PhD Researcher · UT Dallas · Computer Science</span>
        <h1 className="hero-name">
          Gael
          <br />
          <em>Ongoriko</em>
        </h1>
        <p className="hero-title">Multi-Agent Systems & Intelligent Simulation</p>
        <p className="hero-desc">
          Building the next generation of intelligent multi-agent simulation systems.
          Exploring how autonomous agents perceive, decide, and collaborate in complex
          virtual environments, with real-world applications in smart cities, education,
          and healthcare.
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

      <div className="hero-right">
        <div className="hero-right-overlay" />
        <div className="hero-photo-wrapper">
          <Image
            src="/gael.jpg"
            alt={SITE.name}
            width={260}
            height={320}
            className="hero-photo"
            priority
          />
          <div className="hero-stats">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="stat-cell">
                <span className="stat-num">{s.num}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
