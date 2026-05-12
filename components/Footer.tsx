import { SITE } from '@/lib/data';

export default function Footer() {
  return (
    <footer>
      <span className="footer-name">{SITE.name}</span>
      <span className="footer-note">PhD Researcher · UT Dallas · Spring 2026–Present</span>
    </footer>
  );
}
