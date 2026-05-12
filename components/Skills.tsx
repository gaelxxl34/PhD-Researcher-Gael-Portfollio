import { SKILL_GROUPS } from '@/lib/data';

export default function Skills() {
  return (
    <section className="skills" id="skills">
      <span className="section-tag">Technical Skills</span>
      <div className="divider" />
      <h2 className="section-title">
        Tools & <em>Technologies</em>
      </h2>

      <div className="skills-grid">
        {SKILL_GROUPS.map((group) => (
          <div className="skill-group" key={group.title}>
            <p className="skill-group-title">{group.title}</p>
            <ul className="skill-list">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
