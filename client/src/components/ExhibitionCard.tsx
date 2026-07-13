import { Link } from 'react-router-dom';
import type { Exhibition } from '../types';
import { formatDateShort, formatINR, daysUntil, dayOfEvent } from '../api';
import { StatusBadge } from './ui';
import { MapPin, Users, Grid, ArrowRight } from './icons';
import { useAuth } from '../auth';

export default function ExhibitionCard({ e }: { e: Exhibition }) {
  const { user } = useAuth();
  const canBook = user?.role === 'exhibitor' || user?.role === 'admin';
  const day = e.status === 'live' ? dayOfEvent(e.start_date, e.end_date) : null;
  const startsIn = e.status === 'upcoming' ? daysUntil(e.start_date) : null;

  return (
    <div className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-soft">
      <div className="relative h-40 overflow-hidden">
        <img src={e.banner} alt={e.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3"><StatusBadge status={e.status} /></div>
        {e.status === 'live' && day && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">Day {day.current} of {day.total}</div>
        )}
        {startsIn != null && startsIn >= 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">Starts in {startsIn} days</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex flex-wrap gap-1">{e.tags?.slice(0, 2).map((t) => <span key={t} className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">{t}</span>)}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>{e.industry}</div>
        <h3 className="line-clamp-1 text-base font-bold text-slate-900">{e.name}</h3>
        <div className="mt-1.5 space-y-1 text-sm text-slate-500">
          <div className="flex items-center gap-1.5"><MapPin width={15} /> {e.venue}, {e.city}</div>
          <div className="flex items-center gap-1.5"><Grid width={15} /> {formatDateShort(e.start_date)} – {formatDateShort(e.end_date)}</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
          <div><div className="text-sm font-bold text-slate-900">{e.total_stalls ?? 0}</div><div className="text-[10px] text-slate-500">Stalls</div></div>
          <div><div className="text-sm font-bold text-emerald-600">{e.available_stalls ?? 0}</div><div className="text-[10px] text-slate-500">Available</div></div>
          <div><div className="text-sm font-bold text-slate-900">{e.companies ?? 0}</div><div className="text-[10px] text-slate-500">Exhibitors</div></div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-xs text-slate-400">From </span>
            <span className="font-bold text-slate-900">{formatINR(e.price_from)}</span>
          </div>
          {e.status === 'live' && <div className="flex items-center gap-1 text-xs font-medium text-slate-500"><Users width={14} /> {e.visitors_today.toLocaleString('en-IN')} today</div>}
        </div>

        <div className="mt-3 flex gap-2">
          <Link to={`/exhibitions/${e.slug}`} className={`btn-outline ${canBook && e.status !== 'past' ? 'flex-1' : 'w-full'}`}>View Details</Link>
          {canBook && e.status !== 'past' && (
            <Link to={`/exhibitions/${e.slug}#floor-plan`} className="btn-primary flex-1">Book Stall <ArrowRight width={16} /></Link>
          )}
          {canBook && e.status === 'past' && (
            <Link to={`/exhibitions/${e.slug}`} className="btn-primary flex-1">View Report</Link>
          )}
        </div>
      </div>
    </div>
  );
}
