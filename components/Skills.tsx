import { SKILL_GROUPS, SKILLS_NOTE } from '@/lib/data';

export default function Skills() {
  return (
    <section className="skills" id="skills" data-scene data-bg="#eff2f7">
      <span className="section-tag">Technical skills</span>
      <div className="divider" />
      <h2 className="section-title">
        Tools & <em>technologies</em>
      </h2>

      <div className="skills-grid skills-grid-tiered">
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
      <p className="skills-note">{SKILLS_NOTE}</p>
    </section>
  );
}
