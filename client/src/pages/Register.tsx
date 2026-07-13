import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from '../components/ui';

const ROLES = [
  { key: 'visitor', label: 'Visitor', desc: 'Explore & attend exhibitions' },
  { key: 'exhibitor', label: 'Exhibitor', desc: 'Book stalls & showcase products' },
  { key: 'admin', label: 'Organizer', desc: 'Manage exhibitions & analytics' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'exhibitor' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const u = await register(form);
      navigate(u.role === 'admin' ? '/admin' : '/', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="container-px grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <div className="w-full max-w-md rounded-4xl border border-ink-100 bg-white p-8 shadow-soft lg:p-10">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-ink-900">Create your account</h1>
        <p className="mb-6 text-sm text-ink-500">Join ExpoHub in seconds.</p>

        {error && <div className="mb-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div><label className="label">Full name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div>
            <label className="label">I am a…</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button type="button" key={r.key} onClick={() => setForm({ ...form, role: r.key })}
                  className={`rounded-2xl border p-3 text-center text-xs transition-colors ${form.role === r.key ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-brand-200'}`}>
                  <div className="font-bold">{r.label}</div>
                  <div className="mt-0.5 text-[10px] leading-tight opacity-80">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">Already have an account? <Link to="/login" className="link-brand">Sign in</Link></p>
      </div>
    </div>
  );
}
