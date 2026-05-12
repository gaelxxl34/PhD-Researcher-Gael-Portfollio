import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Research from '@/components/Research';
import Experience from '@/components/Experience';
import Awards from '@/components/Awards';
import Skills from '@/components/Skills';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <About />
      <Research />
      <Experience />
      <Awards />
      <Skills />
      <Contact />
      <Footer />
    </>
  );
}
