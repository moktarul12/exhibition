import { Logo } from './ui';
import { Mail, MapPin, Phone } from './icons';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-px grid gap-8 py-12 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            India's smart platform to discover exhibitions, book stalls in real time, and grow your business — all in one place.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Explore</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>Live Exhibitions</li><li>Upcoming Events</li><li>Past Exhibitions</li><li>Floor Plans</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Company</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li>About ExpoHub</li><li>For Organizers</li><li>For Exhibitors</li><li>Careers</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Contact</h4>
          <ul className="space-y-2.5 text-sm text-slate-500">
            <li className="flex items-center gap-2"><MapPin width={16} /> BIEC & venues across Bengaluru</li>
            <li className="flex items-center gap-2"><Phone width={16} /> +91 11 4000 0000</li>
            <li className="flex items-center gap-2"><Mail width={16} /> hello@expohub.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ExpoHub Exhibitions Pvt. Ltd. — A demo exhibition & stall booking platform. Built with React + Turso.
      </div>
    </footer>
  );
}
