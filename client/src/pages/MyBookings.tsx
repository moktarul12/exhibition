import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatINR } from '../api';
import type { Booking } from '../types';
import { Spinner } from '../components/ui';
import { useAuth } from '../auth';
import { Ticket, MapPin, Calendar, Check, Clock, ArrowRight } from '../components/icons';

export default function MyBookings() {
  const { user } = useAuth();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/bookings/mine').then((r) => setList(r.data)).finally(() => setLoading(false)); }, []);

  const total = list.reduce((s, b) => s + b.amount, 0);
  const paid = list.filter((b) => b.payment_status === 'paid').length;

  if (loading) return <Spinner label="Loading your bookings…" />;

  return (
    <div className="container-px py-8">
      <div className="mb-6 flex items-center gap-3">
        <img src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}`} className="h-12 w-12 rounded-full" alt="" />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Hi, {user?.name}</h1>
          <p className="text-sm text-slate-500">Here are all your stall bookings.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="card p-4"><div className="text-2xl font-extrabold text-slate-900">{list.length}</div><div className="text-xs text-slate-500">Total Bookings</div></div>
        <div className="card p-4"><div className="text-2xl font-extrabold text-emerald-600">{paid}</div><div className="text-xs text-slate-500">Paid</div></div>
        <div className="card p-4"><div className="text-2xl font-extrabold text-brand-700">{formatINR(total)}</div><div className="text-xs text-slate-500">Total Value</div></div>
      </div>

      {list.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <Ticket width={44} className="mb-3 text-slate-300" />
          <p className="text-slate-600">You haven't booked any stalls yet.</p>
          <Link to="/exhibitions?status=live" className="btn-primary mt-4">Browse exhibitions <ArrowRight width={16} /></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <div key={b.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img src={b.exhibition_banner} alt="" className="h-24 w-full rounded-xl object-cover sm:h-20 sm:w-32" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/exhibitions/${b.slug}`} className="font-bold text-slate-900 hover:text-brand-600">{b.exhibition_name}</Link>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${b.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.payment_status === 'paid' ? <Check width={12} /> : <Clock width={12} />}{b.payment_status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><MapPin width={14} /> {b.venue}, {b.city}</span>
                  <span className="flex items-center gap-1"><Calendar width={14} /> {formatDate(b.start_date)}</span>
                </div>
                <div className="mt-1.5 text-xs text-slate-400">Ref: <b className="text-slate-600">{b.reference}</b> · {b.hall_name} · Stall <b className="text-brand-600">{b.stall_code}</b> · {b.company_name}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-slate-900">{formatINR(b.amount)}</div>
                <div className="text-xs text-slate-400">{b.payment_mode}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
