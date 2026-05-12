import { EXPERIENCE } from '@/lib/data';

export default function Experience() {
  return (
    <section className="experience" id="experience">
      <span className="section-tag">Experience</span>
      <div className="divider divider-light" />
      <h2 className="section-title">
        Professional <em>Journey</em>
      </h2>

      <div className="exp-timeline">
        {EXPERIENCE.map((item) => (
          <div className="exp-item" key={`${item.role}-${item.date}`}>
            <p className="exp-date">{item.date}</p>
            <h3 className="exp-role">{item.role}</h3>
            <p className="exp-org">{item.org}</p>
            <p className="exp-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
