import { SITE } from '@/lib/data';
import AgentSimulation from '@/components/AgentSimulation';

export default function Contact() {
  return (
    <section className="contact" id="contact" data-scene data-bg="#f2efff">
      <div className="contact-sim" aria-hidden="true">
        <AgentSimulation variant="light" />
      </div>
      <div className="contact-inner">
        <span className="section-tag">Contact</span>
        <div className="divider" />
        <h2 className="contact-title">
          Let&apos;s design the
          <br />
          <em>next intelligent system</em>
        </h2>
        <p className="contact-sub">
          I collaborate on multi-agent simulation research, AI systems engineering,
          and deployment-focused prototypes — open to research partnerships,
          internships, and technical advising.
        </p>

        <a
          className="contact-email"
          href={`mailto:${SITE.email}?subject=Research%20Collaboration`}
        >
          {/* break opportunity after the @ so narrow screens wrap cleanly */}
          {SITE.email.split('@')[0]}@<wbr />
          {SITE.email.split('@')[1]}
        </a>
        <p className="contact-where">Dallas, Texas · UTC−6 · MAVS Lab, UT Dallas</p>

        <div className="contact-links">
          <a
            href={SITE.linkedin}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn ↗
          </a>
          <a
            href={SITE.github}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          {/* TODO: SITE.scholar is a placeholder URL — update lib/data.ts when the profile exists */}
          <a
            href={SITE.scholar}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Scholar ↗
          </a>
          <a href={`mailto:${SITE.email}?subject=CV%20Request`} className="contact-link">
            Request my CV
          </a>
        </div>
      </div>
    </section>
  );
}
