import { AFFILIATIONS, RESEARCH_INTERESTS, SITE } from '@/lib/data';

const ROLE_PILLARS = [
  {
    role: 'Researcher',
    detail:
      'Designing large-scale multi-agent simulation systems with rigorous, measurable outcomes.',
  },
  {
    role: 'Builder',
    detail:
      'Shipping real products across education and AI, from virtual labs to autonomous planning tools.',
  },
  {
    role: 'Innovator',
    detail:
      'Turning research into impact through startup execution, cross-disciplinary collaboration, and deployment.',
  },
];

export default function About() {
  return (
    <section className="about" id="about" data-scene data-bg="#fdf1ea">
      <span className="section-tag">About</span>
      <div className="about-grid">
        <div className="about-text">
          <div className="divider" />
          <h2 className="section-title">
            Researcher,
            <br />
            Builder, <em>Innovator</em>
          </h2>
          <p>
            I am a PhD student in Computer Science at the University of Texas at Dallas,
            working under Dr. Rym Zalila-Wenkstern at the Multi-Agent and Visualization
            Systems Lab. My research focuses on designing and building large-scale
            multi-agent simulation systems.
          </p>
          <p>
            Before joining UTD, I founded Nyota Innovations, built AI-powered educational
            platforms used across East Africa, and won first place at the GAIME Startup
            Battlefield, a global AI competition. I bring an unusual combination of
            research depth and real-world engineering experience.
          </p>
          <p>
            My work sits at the intersection of intelligent systems, interactive
            computing, and real-world deployment, from disaster-response
            logistics to critical infrastructure coordination at scale.
          </p>
        </div>

        <div className="about-right">
          <div className="about-pillars" aria-label="Core identity">
            {ROLE_PILLARS.map((item, i) => (
              <article className="pillar-card" key={item.role}>
                <span className="pillar-index">0{i + 1}</span>
                <h3 className="pillar-title">{item.role}</h3>
                <p className="pillar-desc">{item.detail}</p>
              </article>
            ))}
          </div>
          <div className="research-focus">
            <p className="focus-label">Research Interests</p>
            <div className="focus-tags">
              {RESEARCH_INTERESTS.map((t) => (
                <span key={t.label} className={`tag${t.accent ? ' tag-accent' : ''}`}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <div className="research-focus">
            <p className="focus-label">Affiliation</p>
            <div className="focus-tags">
              {AFFILIATIONS.map((a) => (
                <span key={a} className="tag">
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div className="research-focus">
            <p className="focus-label">Advisor</p>
            <div className="focus-tags">
              <a
                href="https://scholar.google.com/citations?user=8K11tboAAAAJ&hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="tag tag-link"
              >
                Dr. Rym Zalila-Wenkstern
              </a>
            </div>
          </div>

          <div className="research-focus">
            <p className="focus-label">Contact</p>
            <p className="contact-line">
              <a
                href={`mailto:${SITE.email}?subject=Hello%20Gael`}
                className="underline-gold"
              >
                {SITE.email}
              </a>
            </p>
            <p className="contact-line">
              <a href={`tel:${SITE.phoneTel}`}>{SITE.phone}</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
