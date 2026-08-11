export const SITE = {
  name: 'Gael Ongoriko',
  fullName: 'Ongoriko Bindu Gael',
  initials: 'GB',
  title:
    'Ongoriko Bindu Gael | PhD Researcher in Multi-Agent Systems & AI Simulation, UT Dallas',
  shortTitle: 'Ongoriko Bindu Gael, PhD Researcher in Multi-Agent Systems & AI',
  description:
    'Ongoriko Bindu Gael is a PhD researcher in Computer Science at UT Dallas specializing in multi-agent simulation, autonomous systems, and intelligent agent coordination. GAIME AI Innovation Winner ($75K). Founder of Nyota Innovations.',
  shortDescription:
    'PhD researcher at UT Dallas. Multi-agent simulation, autonomous systems, and AI. GAIME AI Innovation Winner. Founder of Nyota Innovations.',
  keywords: [
    'Ongoriko Bindu Gael',
    'Gael Ongoriko',
    'PhD Computer Science UT Dallas',
    'multi-agent simulation',
    'multi-agent systems researcher',
    'autonomous agents',
    'intelligent simulation',
    'agent-based modeling',
    'interactive computing',
    'AI researcher Uganda',
    'MAVS Lab UTD',
    'Nyota Innovations',
    'VR AI education',
    'smart cities simulation',
    'reinforcement learning',
    'distributed agent systems',
    'PhD student UT Dallas',
    'GAIME winner',
    'AI innovation Africa',
    'East Africa technology',
    'agent coordination',
    'virtual reality researcher',
    'machine learning researcher',
    'AI simulation PhD',
    'computer science researcher Texas',
  ],
  // Canonical production URL, used for OG/Twitter previews & sitemap
  url: 'https://www.gaelongoriko.com',
  email: 'Ongoriko.Gael@UTDallas.edu',
  phone: '+1 (940) 500-3523',
  phoneTel: '+19405003523',
  linkedin: 'https://www.linkedin.com/in/gael-ongoriko-8a8846251/',
  github: 'https://github.com/gaelxxl34',
  // TODO: replace with the real Google Scholar profile URL once the profile is live
  scholar: 'https://scholar.google.com/citations?user=PLACEHOLDER',
  ogImage: '/gael.jpg',
  themeColor: '#1a3a2a',
};


export const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#research', label: 'Research' },
  { href: '#publications', label: 'Publications' },
  { href: '#experience', label: 'Experience' },
  { href: '#awards', label: 'Awards' },
  { href: '#contact', label: 'Contact' },
];

export const HERO_STATS = [
  { num: '1000s', label: 'Agents per simulation' },
  { num: '400+', label: 'Students mentored' },
  { num: '15+', label: 'Projects built' },
  { num: '6', label: 'Awards & honors' },
];

export const RESEARCH_INTERESTS = [
  { label: 'Multi-Agent Simulation', accent: true },
  { label: 'Autonomous Systems', accent: true },
  { label: 'Reinforcement Learning' },
  { label: 'Agent-Based Modeling' },
  { label: 'Critical Infrastructure AI' },
  { label: 'Interactive Computing' },
  { label: 'AI in Education' },
  { label: 'Virtual Reality' },
];

export const AFFILIATIONS = [
  'UT Dallas, PhD CS',
  'MAVS Lab',
  'Interactive Computing Track',
];

export type ResearchLink = {
  label: 'Repo' | 'Demo' | 'Paper';
  href: string;
};

export type ResearchCard = {
  num: string;
  title: string;
  desc: string;
  /** Public artifacts for this line of work; the link row is hidden when empty. */
  links: ResearchLink[];
};

export const RESEARCH_CARDS: ResearchCard[] = [
  {
    num: '01',
    title: 'Large-Scale Multi-Agent Simulation Systems',
    desc: "Designing simulation architectures capable of running thousands of concurrent autonomous agents in real-time environments. Investigating coordination protocols, emergent behavior patterns, and scalable communication frameworks for virtual agent populations. Advised by Dr. Rym Zalila-Wenkstern at the MAVS Lab, UT Dallas.",
    // TODO: add { label: 'Repo' | 'Demo' | 'Paper', href } entries when public artifacts ship
    links: [],
  },
  {
    num: '02',
    title: 'Agent Decision-Making in Dynamic Environments',
    desc: 'Exploring how agents perceive, reason, and adapt in environments that change in real time. This research examines planning algorithms, reinforcement learning strategies, and knowledge representation frameworks that enable agents to make robust decisions under uncertainty.',
    // TODO: add { label: 'Repo' | 'Demo' | 'Paper', href } entries when public artifacts ship
    links: [],
  },
  {
    num: '03',
    title: 'Applications: Emergency Response & Infrastructure Resilience',
    desc: 'Applying multi-agent systems to high-impact, time-critical domains: emergency dispatch coordination, hospital intake balancing, outage recovery logistics, and distributed resource allocation under uncertainty. The same agentic coordination principles scale to transportation, but the broader goal is resilient, real-time decision support for complex systems.',
    // TODO: add { label: 'Repo' | 'Demo' | 'Paper', href } entries when public artifacts ship
    links: [],
  },
];

export type Publication = {
  status: string;
  title: string;
  venue: string;
  desc: string;
};

export const PUBLICATIONS: Publication[] = [
  // TODO: replace this placeholder with the real paper title, target venue, and summary
  {
    status: 'In preparation',
    title: 'First paper on large-scale multi-agent simulation — title forthcoming',
    venue: 'Target venue to be announced',
    desc: 'The first publication from my PhD work at the MAVS Lab; details will appear here as the work matures.',
  },
];

export const EXPERIENCE = [
  {
    date: 'Spring 2026 – Present',
    role: 'PhD Researcher, Multi-Agent Systems',
    org: 'University of Texas at Dallas · MAVS Lab',
    desc: 'Conducting research on large-scale multi-agent simulation under Dr. Rym Zalila-Wenkstern. Building simulation frameworks for intelligent agent coordination in complex environments.',
  },
  {
    date: '2024 – Present',
    role: 'CEO & Founder',
    org: 'Nyota Innovations · Kampala, Uganda',
    desc: 'Founded and lead a technology company building AI-powered and VR-based educational platforms. Flagship product: Intelligent Virtual Labs, delivering immersive STEM education to schools without physical laboratories. Also developed Nyota Fusion AI, an AI-powered CRM platform.',
  },
  {
    date: '2024 – 2025',
    role: 'Full-Stack AI Engineer',
    org: 'International University of East Africa',
    desc: 'Built an AI-powered Smart Task Manager that autonomously manages semester calendars, tracks performance, and generates departmental reports. Integrated NLP and machine learning to optimize academic administration workflows.',
  },
  {
    date: '2022 – 2024',
    role: 'Freelance AI & VR Developer',
    org: 'BORA · Uganda',
    desc: 'Built a VR Immune Response Simulator for medical education, an AI-powered physics density lab, and a solar system VR exploration application. Deployed across educational institutions to enhance science teaching.',
  },
];

export type Award = {
  name: string;
  desc: string;
  /** Prize money, shown as the card's big number. */
  amount?: string;
  /** Short highlight for non-monetary awards; used when there is no amount. */
  label?: string;
};

export const AWARDS: Award[] = [
  {
    amount: '$75,000',
    name: 'GAIME Startup Battlefield Winner 2025',
    desc: 'Won first place in a global AI startup competition for innovation in AI-powered educational technology.',
  },
  {
    amount: '$10,000',
    name: 'AI Innovation Award',
    desc: 'Won for outstanding contributions to AI technology in education across East Africa.',
  },
  {
    amount: '$1,500',
    name: 'First in Legal Technology, Uganda',
    desc: 'Won the first-ever legal technology award in Uganda for the LegalFinder app.',
  },
  {
    amount: '$600',
    name: 'Google Developer Student Club Demo Days',
    desc: 'Won at Innovation Village, Kampala with the TasteTrail application.',
  },
  {
    label: 'Pioneer award',
    name: 'VR Technology Pioneer Award',
    desc: 'Won for pioneering VR applications in education and professional training.',
  },
  {
    label: 'Top of class · 4.5/5 GPA',
    name: 'BSc Computer Science',
    desc: 'Graduated top of class from the International University of East Africa.',
  },
];

export const SKILL_GROUPS = [
  {
    title: 'Core research stack',
    items: [
      'Python',
      'PyTorch',
      'Reinforcement learning (Gymnasium, Stable-Baselines3)',
      'MASON / NetLogo',
      'SUMO / CARLA',
      'Java',
      'C / C++',
      'LaTeX',
    ],
  },
  {
    title: 'Engineering & deployment',
    items: [
      'TypeScript / React / Next.js',
      'FastAPI',
      'Node.js',
      'Docker / Kubernetes',
      'AWS / Google Cloud',
      'Unity',
      'Git / GitHub Actions',
      'Linux / Bash',
    ],
  },
];

export const SKILLS_NOTE =
  'Plus working experience across 30+ more languages, frameworks, and tools.';
