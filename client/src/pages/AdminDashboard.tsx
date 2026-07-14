import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDate } from '../api';
import type { Exhibition } from '../types';
import { Stat, Spinner, StatusBadge } from '../components/ui';
import { stallColors } from '../components/ui';
import { Ticket, Building, Grid, Rupee, Calendar, Users } from '../components/icons';
import { useAuth } from '../auth';

interface Dashboard {
  totals: { exhibitions: number; live: number; upcoming: number; past: number; bookings: number; companies: number; availableStalls: number; revenue: number };
  topExhibitions: { name: string; bookings: number; revenue: number }[];
  recentBookings: { reference: string; company_name: string; amount: number; payment_status: string; created_at: string; exhibition_name: string; stall_code: string }[];
  bookingsByStatus: { status: string; n: number }[];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [exhibitions, setExhibitions] = useState<(Exhibition & { bookings: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/dashboard'), api.get('/admin/exhibitions')])
      .then(([d, e]) => { setData(d.data); setExhibitions(e.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Spinner label="Loading dashboard…" />;

  const totalStalls = data.bookingsByStatus.reduce((s, x) => s + x.n, 0);
  const maxBookings = Math.max(...data.topExhibitions.map((t) => t.bookings), 1);

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Organizer Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {user?.name}. Here's how your exhibitions are performing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/events/new" className="btn-outline">Create event</Link>
          <Link to="/admin/floor-plan" className="btn-primary">Edit floor plans</Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Ticket width={20} />} label="Total Exhibitions" value={data.totals.exhibitions} />
        <Stat icon={<Grid width={20} />} label="Total Bookings" value={data.totals.bookings} accent="bg-indigo-50 text-indigo-600" />
        <Stat icon={<Rupee width={20} />} label="Total Revenue" value={formatINR(data.totals.revenue)} accent="bg-emerald-50 text-emerald-600" />
        <Stat icon={<Building width={20} />} label="Available Stalls" value={data.totals.availableStalls} accent="bg-amber-50 text-amber-600" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4"><div className="text-xl font-bold text-red-600">{data.totals.live}</div><div className="text-xs text-slate-500">Live Now</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-amber-600">{data.totals.upcoming}</div><div className="text-xs text-slate-500">Upcoming</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-slate-500">{data.totals.past}</div><div className="text-xs text-slate-500">Completed</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-slate-900">{data.totals.companies}</div><div className="text-xs text-slate-500">Companies</div></div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Top exhibitions */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Top Exhibitions by Bookings</h3>
          <div className="space-y-3">
            {data.topExhibitions.map((t) => (
              <div key={t.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{t.name}</span>
                  <span className="text-slate-500">{t.bookings} bookings · {formatINR(t.revenue || 0)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${(t.bookings / maxBookings) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stall status donut-ish */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Stall Status (all halls)</h3>
          <div className="space-y-2.5">
            {data.bookingsByStatus.map((s) => {
              const c = stallColors[s.status as keyof typeof stallColors];
              const pct = ((s.n / totalStalls) * 100).toFixed(0);
              return (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 capitalize text-slate-600"><span className={`h-2.5 w-2.5 rounded ${c?.legend}`} /> {c?.label || s.status}</span>
                    <span className="text-slate-400">{s.n} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${c?.legend}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h3 className="text-sm font-bold text-slate-900">Recent Bookings</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Exhibition</th><th className="px-5 py-3">Stall</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentBookings.map((b) => (
                <tr key={b.reference} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{b.reference}</td>
                  <td className="px-5 py-3 text-slate-700">{b.company_name}</td>
                  <td className="px-5 py-3 text-slate-600">{b.exhibition_name}</td>
                  <td className="px-5 py-3 font-medium">{b.stall_code}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{formatINR(b.amount)}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${b.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{b.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exhibitions management */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-sm font-bold text-slate-900">Manage Exhibitions</h3>
          <Link to="/admin/events/new" className="text-sm font-semibold text-brand-700 hover:underline">+ Create event</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Exhibition</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Stalls</th><th className="px-5 py-3">Bookings</th><th className="px-5 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exhibitions.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <img src={e.banner} alt="" className="h-9 w-14 rounded object-cover" />
                      <div><div className="font-semibold text-slate-800">{e.name}</div><div className="text-xs text-slate-400">{e.city}</div></div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(e.start_date)}</td>
                  <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-5 py-3 text-slate-600">{e.available_stalls}/{e.total_stalls}</td>
                  <td className="px-5 py-3 font-semibold">{(e as any).bookings}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/events/${e.slug}/edit`} className="text-xs font-semibold text-brand-700 hover:underline">Edit event</Link>
                      <Link to={`/admin/floor-plan?slug=${encodeURIComponent(e.slug)}`} className="text-xs font-semibold text-ink-600 hover:underline">Edit floor plan</Link>
                      <Link to={`/exhibitions/${e.slug}`} className="text-xs font-semibold text-ink-500 hover:underline">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
