import { Link } from 'react-router-dom';
import { Logo } from './ui';
import { Mail, MapPin, Phone, Instagram, Linkedin, Twitter } from './icons';

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink-950 text-ink-300">
      <div className="container-px grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="[&_span]:!text-white"><Logo light /></div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
            Bengaluru's smart platform to discover exhibitions, explore exhibitors and book stalls in real time — all in one place.
          </p>
          <div className="mt-5 flex gap-2.5">
            {[Instagram, Linkedin, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-ink-300 transition-colors hover:bg-brand hover:text-white"><Icon /></a>
            ))}
          </div>
        </div>
        <FooterCol title="Explore" items={[
          { label: 'Live exhibitions', to: '/exhibitions?status=live' },
          { label: 'Upcoming events', to: '/exhibitions?status=upcoming' },
          { label: 'Past exhibitions', to: '/exhibitions?status=past' },
          { label: 'All exhibitions', to: '/exhibitions' },
        ]} />
        <FooterCol title="Company" items={[
          { label: 'About ExpoHub', to: '/' },
          { label: 'For organizers', to: '/register' },
          { label: 'For exhibitors', to: '/register' },
          { label: 'Careers', to: '/' },
        ]} />
        <div>
          <h4 className="mb-4 text-sm font-bold text-white">Contact</h4>
          <ul className="space-y-3 text-sm text-ink-400">
            <li className="flex items-start gap-2.5"><MapPin width={17} className="mt-0.5 shrink-0 text-brand-400" /> BIEC & venues across Bengaluru</li>
            <li className="flex items-center gap-2.5"><Phone width={17} className="text-brand-400" /> +91 80 4000 0000</li>
            <li className="flex items-center gap-2.5"><Mail width={17} className="text-brand-400" /> hello@expohub.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} ExpoHub Exhibitions Pvt. Ltd. — demo exhibition & stall booking platform. Built with React + Turso.
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold text-white">{title}</h4>
      <ul className="space-y-2.5 text-sm text-ink-400">
        {items.map((it) => (
          <li key={it.label}><Link to={it.to} className="transition-colors hover:text-white">{it.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
