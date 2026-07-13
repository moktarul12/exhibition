import { Link } from 'react-router-dom';
import type { Exhibition } from '../types';
import { formatDateShort, formatINR, daysUntil, dayOfEvent } from '../api';
import { StatusBadge } from './ui';
import { MapPin, Users, ArrowRight, Calendar } from './icons';
import { useAuth } from '../auth';

export default function ExhibitionCard({ e }: { e: Exhibition }) {
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const day = e.status === 'live' ? dayOfEvent(e.start_date, e.end_date) : null;
  const startsIn = e.status === 'upcoming' ? daysUntil(e.start_date) : null;

  return (
    <Link to={`/exhibitions/${e.slug}`} className="group card flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className="relative h-44 overflow-hidden">
        <img src={e.banner} alt={e.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent" />
        <div className="absolute left-3 top-3"><StatusBadge status={e.status} size="sm" /></div>
        {e.status === 'live' && day && (
          <div className="absolute right-3 top-3 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">Day {day.current}/{day.total}</div>
        )}
        {startsIn != null && startsIn >= 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-bold text-amber-950">In {startsIn}d</div>
        )}
        <div className="absolute inset-x-3 bottom-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{e.industry}</div>
          <h3 className="line-clamp-1 font-display text-base font-bold text-white">{e.name}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-1.5 text-sm text-ink-500">
          <div className="flex items-center gap-1.5"><MapPin width={15} className="text-brand-500" /> <span className="line-clamp-1">{e.venue}, {e.city}</span></div>
          <div className="flex items-center gap-1.5"><Calendar width={15} className="text-brand-500" /> {formatDateShort(e.start_date)} – {formatDateShort(e.end_date)}</div>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-ink-50 p-2.5 text-center">
          <div><div className="text-sm font-bold text-ink-900">{e.total_stalls ?? 0}</div><div className="text-[10px] text-ink-400">Stalls</div></div>
          <div><div className="text-sm font-bold text-emerald-600">{e.available_stalls ?? 0}</div><div className="text-[10px] text-ink-400">Available</div></div>
          <div><div className="text-sm font-bold text-ink-900">{e.companies ?? 0}</div><div className="text-[10px] text-ink-400">Exhibitors</div></div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <div className="text-[11px] text-ink-400">From</div>
            <div className="font-display text-lg font-extrabold text-ink-900">{formatINR(e.price_from)}</div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5">
            {e.status === 'past' ? 'View report' : canBook ? 'Book stall' : 'View details'} <ArrowRight width={16} />
          </span>
        </div>

        {e.status === 'live' && (
          <div className="mt-3 flex items-center gap-1.5 border-t border-ink-100 pt-3 text-xs text-ink-400">
            <Users width={14} /> {e.visitors_today.toLocaleString('en-IN')} visitors today
          </div>
        )}
      </div>
    </Link>
  );
}
