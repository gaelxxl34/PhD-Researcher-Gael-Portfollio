import { AWARDS } from '@/lib/data';

export default function Awards() {
  return (
    <section className="awards" id="awards">
      <span className="section-tag">Awards & Recognition</span>
      <div className="divider" />
      <h2 className="section-title">
        Recognized <em>Excellence</em>
      </h2>

      <div className="awards-grid">
        {AWARDS.map((a) => (
          <div className="award-card" key={a.name}>
            <span className="award-amount">{a.amount}</span>
            <p className="award-name">{a.name}</p>
            <p className="award-desc">{a.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
