import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from '../components/ui';
import { Check } from '../components/icons';

const DEMO = [
  { role: 'Admin · Floor Plans', email: 'admin@expohub.com', password: 'admin123', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { role: 'Company · Book Stalls', email: 'exhibitor@expohub.com', password: 'demo123', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { role: 'Visitor · Discover', email: 'visitor@expohub.com', password: 'demo123', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-700 to-indigo-800 p-8 text-white md:flex">
          <Logo light />
          <div>
            <h2 className="text-2xl font-extrabold leading-snug">Welcome back to ExpoHub</h2>
            <p className="mt-2 text-brand-100">Book stalls, manage exhibitions and grow your business — all from one dashboard.</p>
            <ul className="mt-6 space-y-2 text-sm">
              {['Live floor-plan stall booking', 'Manage all your bookings', 'Organizer analytics dashboard'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check width={16} /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-brand-200">© {new Date().getFullYear()} ExpoHub</div>
        </div>

        <div className="p-8">
          <div className="md:hidden mb-4"><Logo /></div>
          <h1 className="text-xl font-bold text-slate-900">Sign in to your account</h1>
          <p className="mb-5 text-sm text-slate-500">Enter your credentials or use a demo login below.</p>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <form onSubmit={submit} className="space-y-4">
            <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" /></div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quick demo logins</div>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => quick(d)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${d.color}`}>
                  <span className="font-semibold">{d.role}</span>
                  <span className="text-xs opacity-80">{d.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">No account? <Link to="/register" className="font-semibold text-brand-600">Create one</Link></p>
        </div>
      </div>
    </div>
  );
}
