import { RESEARCH_CARDS } from '@/lib/data';

export default function Research() {
  return (
    <section className="research" id="research">
      <span className="section-tag">Research</span>
      <div className="divider" />
      <h2 className="section-title">
        Current <em>Work</em>
      </h2>

      {RESEARCH_CARDS.map((card) => (
        <div className="research-card" key={card.num}>
          <span className="research-num">{card.num}</span>
          <div className="research-body">
            <h3 className="research-card-title">{card.title}</h3>
            <p className="research-card-desc">{card.desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
