import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Research from '@/components/Research';
import Experience from '@/components/Experience';
import Awards from '@/components/Awards';
import Skills from '@/components/Skills';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import MotionDirector from '@/components/MotionDirector';
import Marquee from '@/components/Marquee';
import AgentShowcase from '@/components/AgentShowcase';

export default function Home() {
  return (
    <main className="site-shell">
      <MotionDirector />
      <div className="scroll-progress" aria-hidden="true" />
      <div className="cursor-glow" aria-hidden="true" />
      <div className="ambient-layer ambient-one" aria-hidden="true" />
      <div className="ambient-layer ambient-two" aria-hidden="true" />
      <div className="grain-layer" aria-hidden="true" />
      <Nav />
      <Hero />
      <Marquee />
      <AgentShowcase />
      <About />
      <Research />
      <Experience />
      <Awards />
      <Skills />
      <Contact />
      <Footer />
    </main>
  );
}
