'use client';

import { useEffect, useState } from 'react';
import { NAV_LINKS, SITE } from '@/lib/data';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.replace('#', ''));
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleLinkClick = () => setOpen(false);

  return (
    <>
      <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
        <a href="#home" className="nav-logo" aria-label={`${SITE.name} home`}>
          <span className="nav-logo-mark">{SITE.initials}</span>
          <span className="nav-logo-name">{SITE.name}</span>
        </a>

        <ul className="nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={active === l.href ? 'is-active' : ''}
                onClick={handleLinkClick}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a href="#contact" className="nav-cta" onClick={handleLinkClick}>
          Get in Touch
        </a>
      </nav>

      <button
        type="button"
        className={`nav-toggle${open ? ' is-open' : ''}${scrolled ? ' is-scrolled-pos' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        id="mobile-menu"
        className={`mobile-menu${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <ul>
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={active === l.href ? 'is-active' : ''}
                onClick={handleLinkClick}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#contact" className="mobile-menu-cta" onClick={handleLinkClick}>
          Get in Touch
        </a>
      </div>
    </>
  );
}
