import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR, formatDate } from '../api';
import { Spinner, Stat } from '../components/ui';
import { useAuth } from '../auth';
import { Ticket, Mail, Building, ArrowRight, Grid } from '../components/icons';

interface InboxMsg {
  id: number;
  from_name: string;
  from_email: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  company_name: string;
  exhibition_name?: string;
  exhibition_slug?: string;
}

export default function CompanyDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [messages, setMessages] = useState<InboxMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/bookings/mine'),
      api.get('/messages/inbox').catch(() => ({ data: [] })),
    ]).then(([b, m]) => {
      setBookings(b.data);
      setMessages(m.data);
    }).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: number) => {
    await api.patch(`/messages/${id}/read`);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)));
  };

  if (loading) return <Spinner label="Loading company workspace…" />;

  const unread = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="container-px py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Company Workspace</h1>
        <p className="text-sm text-slate-500">Welcome, {user?.name}. Manage stall bookings and visitor enquiries.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Ticket width={20} />} label="My Bookings" value={bookings.length} />
        <Stat icon={<Mail width={20} />} label="Unread Enquiries" value={unread} accent="bg-amber-50 text-amber-600" />
        <Stat icon={<Building width={20} />} label="Total Messages" value={messages.length} accent="bg-indigo-50 text-indigo-600" />
        <Link to="/exhibitions?status=live" className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-soft">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Grid width={20} /></div>
          <div><div className="text-sm font-bold text-slate-900">Book a Stall</div><div className="text-xs text-slate-500">Find live exhibitions</div></div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">My Stall Bookings</h3>
            <Link to="/my-bookings" className="text-xs font-semibold text-brand-600">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No bookings yet. <Link to="/exhibitions?status=live" className="font-semibold text-brand-600">Book a stall →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 5).map((b) => (
                <Link key={b.id} to={`/exhibitions/${b.slug}#floor-plan`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <img src={b.exhibition_banner} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{b.exhibition_name}</div>
                    <div className="text-xs text-slate-500">{b.hall_name} · Stall {b.stall_code}</div>
                  </div>
                  <div className="text-right text-sm font-bold text-slate-900">{formatINR(b.amount)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Visitor Enquiries</h3>
          </div>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No messages yet. Enquiries from visitors will appear here.</div>
          ) : (
            <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {messages.map((m) => (
                <button key={m.id} onClick={() => markRead(m.id)} className="block w-full px-5 py-3 text-left hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{m.subject}</span>
                        {m.status === 'unread' && <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">New</span>}
                      </div>
                      <div className="text-xs text-slate-500">From {m.from_name} · {m.from_email}</div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{m.body}</p>
                    </div>
                    <a href={`mailto:${m.from_email}?subject=Re: ${m.subject}`} onClick={(e) => e.stopPropagation()} className="btn-outline shrink-0 px-2 py-1 text-xs">
                      Reply <ArrowRight width={12} />
                    </a>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">{formatDate(m.created_at)}{m.exhibition_name ? ` · ${m.exhibition_name}` : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
