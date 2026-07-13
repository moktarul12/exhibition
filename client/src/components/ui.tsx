import { ReactNode } from 'react';
import type { StallStatus } from '../types';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" className="shrink-0">
        <defs>
          <linearGradient id="logoGrad" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="0.45" stopColor="#e11d48" />
            <stop offset="1" stopColor="#a30d3a" />
          </linearGradient>
        </defs>
        <path d="M20 2.5 34.7 11v18L20 37.5 5.3 29V11L20 2.5Z" fill="url(#logoGrad)" />
        <path d="M15 13h11M15 13v14M15 20h9M15 27h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        ExpoHub
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: 'live' | 'upcoming' | 'past' }) {
  const map = {
    live: { label: 'LIVE', cls: 'bg-red-500 text-white', dot: true },
    upcoming: { label: 'UPCOMING', cls: 'bg-amber-100 text-amber-700', dot: false },
    past: { label: 'COMPLETED', cls: 'bg-slate-200 text-slate-600', dot: false },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${map.cls}`}>
      {map.dot && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {map.label}
    </span>
  );
}

export const stallColors: Record<StallStatus, { bg: string; border: string; text: string; label: string; legend: string }> = {
  available: { bg: 'bg-emerald-100 hover:bg-emerald-200', border: 'border-emerald-300', text: 'text-emerald-800', label: 'Available', legend: 'bg-emerald-400' },
  reserved: { bg: 'bg-amber-100 hover:bg-amber-200', border: 'border-amber-300', text: 'text-amber-800', label: 'Reserved', legend: 'bg-amber-400' },
  booked: { bg: 'bg-red-100 hover:bg-red-200', border: 'border-red-300', text: 'text-red-800', label: 'Booked', legend: 'bg-red-400' },
  sponsor: { bg: 'bg-indigo-100 hover:bg-indigo-200', border: 'border-indigo-300', text: 'text-indigo-800', label: 'Sponsor', legend: 'bg-indigo-400' },
  blocked: { bg: 'bg-slate-200 hover:bg-slate-300', border: 'border-slate-300', text: 'text-slate-500', label: 'Blocked', legend: 'bg-slate-400' },
};

export function Stat({ icon, label, value, accent }: { icon: ReactNode; label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent || 'bg-brand-50 text-brand-600'}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-slate-900">{value}</div>
        <div className="truncate text-xs font-medium text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">{children}</span>;
}
