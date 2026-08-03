const ITEMS = [
  'Multi-Agent Systems',
  'Intelligent Simulation',
  'Smart Cities',
  'Autonomous Agents',
  'GAIME Winner \u2014 $75K',
  'VR Education',
  'Reinforcement Learning',
];

export default function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((group) => (
          <div className="marquee-group" key={group}>
            {ITEMS.map((item) => (
              <span key={item}>
                {item}
                <i className="marquee-dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
