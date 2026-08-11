import { SITE } from '@/lib/data';
import AgentSimulation from '@/components/AgentSimulation';

export default function Contact() {
  return (
    <section className="contact" id="contact" data-scene data-bg="#f2efff">
      <div className="contact-sim" aria-hidden="true">
        <AgentSimulation variant="light" />
      </div>
      <div className="contact-shell">
        <div className="contact-head">
          <span className="section-tag">Contact</span>
          <h2 className="contact-title">
            Let&apos;s design the
            <br />
            <em>next intelligent system</em>
          </h2>
          <p className="contact-sub">
            I collaborate on multi-agent simulation research, AI systems engineering,
            and deployment-focused prototypes for high-impact environments.
          </p>
        </div>

        <div className="contact-main">
          <a
            href={`mailto:${SITE.email}?subject=Research%20Collaboration`}
            className="contact-primary"
          >
            Start a collaboration
          </a>
          <div className="contact-points" aria-label="Collaboration focus areas">
            <p>
              <strong>Focus:</strong> Multi-agent systems, simulation design, robust
              coordination
            </p>
            <p>
              <strong>Best for:</strong> Research partnerships, internships, technical
              advising
            </p>
          </div>
        </div>

        <div className="contact-meta" aria-label="Contact metadata">
          <div className="meta-card">
            <span className="meta-k">Primary email</span>
            <a href={`mailto:${SITE.email}?subject=Hello%20Gael`}>{SITE.email}</a>
          </div>
          <div className="meta-card">
            <span className="meta-k">Direct line</span>
            <a href={`tel:${SITE.phoneTel}`}>{SITE.phone}</a>
          </div>
          <div className="meta-card">
            <span className="meta-k">Based in</span>
            <p>Dallas, Texas · UTC-6 / UTC-5</p>
          </div>
        </div>

        <div className="contact-links">
          <a
            href={SITE.linkedin}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href={SITE.github}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href={`mailto:${SITE.email}?subject=CV%20Request`}
            className="contact-link"
          >
            Request my CV
          </a>
        </div>
      </div>
    </section>
  );
}
