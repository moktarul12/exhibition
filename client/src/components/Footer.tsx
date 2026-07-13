import { Link } from 'react-router-dom';
import { Logo } from './ui';
import { Mail, MapPin, Phone, Facebook, Instagram, Linkedin, Twitter, Youtube } from './icons';

const COLS = [
  {
    title: 'Platform',
    items: [
      { label: 'Exhibitions', to: '/exhibitions' },
      { label: 'Venues', to: '/exhibitions' },
      { label: 'Floor Plan', to: '/exhibitions' },
      { label: 'Pricing', to: '#' },
      { label: 'List Your Event', to: '/register' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Blog', to: '#' },
      { label: 'Help Center', to: '#' },
      { label: 'Guides', to: '#' },
      { label: 'Terms & Conditions', to: '#' },
      { label: 'Privacy Policy', to: '#' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About Us', to: '#' },
      { label: 'Careers', to: '#' },
      { label: 'Media Kit', to: '#' },
      { label: 'Contact Us', to: '#' },
    ],
  },
];

const SOCIALS = [Facebook, Linkedin, Twitter, Instagram, Youtube];

export default function Footer() {
  return (
    <footer className="mt-20 text-ink-300" style={{ backgroundColor: '#141230' }}>
      <div className="container-px grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr]">
        <div>
          <div className="[&_span]:!text-white"><Logo light withTagline /></div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
            India's most trusted platform for discovering exhibitions, booking stalls and growing your business.
          </p>
          <div className="mt-5 flex gap-2.5">
            {SOCIALS.map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-ink-300 transition-colors hover:bg-grad hover:text-white"><Icon /></a>
            ))}
          </div>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-sm font-bold text-white">{col.title}</h4>
            <ul className="space-y-2.5 text-sm text-ink-400">
              {col.items.map((it) => (
                <li key={it.label}>
                  <Link to={it.to} className="transition-colors hover:text-white">{it.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h4 className="mb-4 text-sm font-bold text-white">Contact Us</h4>
          <ul className="space-y-3 text-sm text-ink-400">
            <li className="flex items-center gap-2.5"><Mail width={17} className="shrink-0 text-brand-400" /> hello@expomela.com</li>
            <li className="flex items-center gap-2.5"><Phone width={17} className="shrink-0 text-brand-400" /> +91 98765 43210</li>
            <li className="flex items-center gap-2.5"><MapPin width={17} className="shrink-0 text-brand-400" /> Bangalore, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Expo Mela. All rights reserved.
      </div>
    </footer>
  );
}
