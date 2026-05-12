import { SITE } from '@/lib/data';

export default function Contact() {
  return (
    <section className="contact" id="contact">
      <span className="section-tag">Contact</span>
      <h2 className="contact-title">
        Let&apos;s Build
        <br />
        <em>Something Together</em>
      </h2>
      <p className="contact-sub">
        Open to research collaborations, internship opportunities, and conversations
        about multi-agent systems and intelligent simulation.
      </p>
      <div className="contact-links">
        <a
          href={`mailto:${SITE.email}?subject=Hello%20Gael`}
          className="contact-link"
        >
          Email
        </a>
        <a href={`tel:${SITE.phoneTel}`} className="contact-link">
          {SITE.phone}
        </a>
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
          Request CV
        </a>
      </div>
    </section>
  );
}
