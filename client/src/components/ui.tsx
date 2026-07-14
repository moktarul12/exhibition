import { ReactNode } from 'react';
import type { StallStatus } from '../types';

export function Logo({ light = false, withTagline = false }: { light?: boolean; withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center shadow-lift"
        style={{ backgroundImage: 'linear-gradient(135deg, #e0207a, #b21caf 50%, #7c3aed)', clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 20V8l8-4 8 4v12" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 20v-6h8v6M4 12h16" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.3rem] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink-900'}`}>
          Expo<span className="text-grad">Mela</span>
        </span>
        {withTagline && (
          <span className={`mt-1 text-[10px] font-semibold tracking-wide ${light ? 'text-white/50' : 'text-ink-400'}`}>Exhibit. Connect. Grow.</span>
        )}
      </span>
    </div>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: 'live' | 'upcoming' | 'past' | 'disabled'; size?: 'sm' | 'md' }) {
  const map = {
    live: { label: 'Live now', cls: 'bg-brand text-white', dot: true },
    upcoming: { label: 'Upcoming', cls: 'bg-amber-100 text-amber-800', dot: false },
    past: { label: 'Completed', cls: 'bg-ink-100 text-ink-500', dot: false },
    disabled: { label: 'Disabled', cls: 'bg-rose-100 text-rose-800', dot: false },
  }[status] || { label: String(status), cls: 'bg-ink-100 text-ink-500', dot: false };
  return (
    <span className={`pill ${map.cls} ${size === 'sm' ? 'text-[10px] px-2.5' : ''}`}>
      {map.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {map.label}
    </span>
  );
}

export const stallColors: Record<StallStatus, { bg: string; border: string; text: string; label: string; legend: string }> = {
  available: { bg: 'bg-emerald-50 hover:bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-800', label: 'Available', legend: 'bg-emerald-400' },
  reserved: { bg: 'bg-amber-50 hover:bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', label: 'Reserved', legend: 'bg-amber-400' },
  booked: { bg: 'bg-brand-50 hover:bg-brand-100', border: 'border-brand-200', text: 'text-brand-700', label: 'Booked', legend: 'bg-brand-500' },
  sponsor: { bg: 'bg-indigo-50 hover:bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800', label: 'Sponsor', legend: 'bg-indigo-400' },
  blocked: { bg: 'bg-ink-100 hover:bg-ink-200', border: 'border-ink-300', text: 'text-ink-400', label: 'Blocked', legend: 'bg-ink-400' },
};

export function Stat({ icon, label, value, accent }: { icon: ReactNode; label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent || 'bg-brand-50 text-brand-600'}`}>{icon}</div>
      <div className="min-w-0">
        <div className="font-display text-2xl font-extrabold text-ink-900">{value}</div>
        <div className="truncate text-xs font-medium text-ink-400">{label}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-ink-400">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">{children}</span>;
}

export function SectionHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-1.5 max-w-xl text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
