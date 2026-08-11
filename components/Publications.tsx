import { PUBLICATIONS } from '@/lib/data';

export default function Publications() {
  return (
    <section className="pubs" id="publications" data-scene data-bg="#eef6f0">
      <span className="section-tag">Publications</span>
      <div className="divider" />
      <h2 className="section-title">
        Publications & <em>writing</em>
      </h2>

      <div className="pub-list">
        {PUBLICATIONS.map((p) => (
          <article className="pub-item" key={p.title}>
            <span className="pub-status">{p.status}</span>
            <div className="pub-body">
              <h3 className="pub-title">{p.title}</h3>
              <p className="pub-venue">{p.venue}</p>
              <p className="pub-desc">{p.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
