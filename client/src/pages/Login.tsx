import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from '../components/ui';
import { Check } from '../components/icons';

const DEMO = [
  { role: 'Organizer / Admin', hint: 'Floor plans & analytics', email: 'admin@expomela.com', password: 'admin123' },
  { role: 'Exhibitor / Company', hint: 'Book stalls', email: 'exhibitor@expomela.com', password: 'demo123' },
  { role: 'Visitor / Guest', hint: 'Discover expos', email: 'visitor@expomela.com', password: 'demo123' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const u = await login(email, password);
      navigate(u.role === 'admin' ? '/admin' : from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const quick = (d: typeof DEMO[number]) => { setEmail(d.email); setPassword(d.password); };

  return (
    <div className="container-px grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-4xl border border-ink-100 bg-white shadow-soft md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-9 text-white md:flex">
          <div className="mesh absolute inset-0 opacity-80" />
          <div className="relative"><div className="[&_span]:!text-white"><Logo light /></div></div>
          <div className="relative">
            <h2 className="font-display text-2xl font-extrabold leading-snug">Welcome back to Expo Mela</h2>
            <p className="mt-2 text-ink-300">Book stalls, manage exhibitions and grow your business — all from one dashboard.</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {['Live floor-plan stall booking', 'Manage all your bookings', 'Organizer analytics dashboard'].map((t) => (
                <li key={t} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white"><Check width={13} /></span> {t}</li>
              ))}
            </ul>
          </div>
          <div className="relative text-xs text-ink-400">© {new Date().getFullYear()} Expo Mela · India</div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="mb-4 md:hidden"><Logo /></div>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Sign in</h1>
          <p className="mb-6 text-sm text-ink-500">Enter your credentials or use a demo login.</p>

          {error && <div className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" /></div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <div className="mt-6">
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">Quick demo logins</div>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => quick(d)} className="flex w-full items-center justify-between rounded-2xl border border-ink-100 bg-white px-3.5 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50">
                  <span><span className="block text-sm font-semibold text-ink-900">{d.role}</span><span className="text-xs text-ink-400">{d.hint}</span></span>
                  <span className="text-xs font-medium text-ink-400">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">No account? <Link to="/register" className="link-brand">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
