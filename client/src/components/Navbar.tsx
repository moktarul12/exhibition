import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCity } from '../city';
import { api } from '../api';
import { Logo } from './ui';
import { Bell, Dashboard, LogOut, Menu, Ticket, X, ChevronDown, Building, Grid, MapPin, Check, Search, Calendar } from './icons';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [industry, setIndustry] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);

  useEffect(() => {
    api.get('/exhibitions/meta/filters')
      .then((r) => setIndustries(r.data?.industries || []))
      .catch(() => setIndustries([]));
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setUserMenu(false); };

  const doSearch = () => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (date) p.set('date', date);
    if (industry) p.set('industry', industry);
    navigate(`/exhibitions?${p.toString()}`);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur-xl">
      <div className="container-px flex h-[72px] items-center gap-3 lg:gap-4">
        <Link to="/" className="shrink-0"><Logo withTagline /></Link>

        {/* Top search: keyword · date · industries */}
        <div className="hidden min-w-0 flex-1 items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50/60 p-1.5 md:flex">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
            <Search width={16} className="shrink-0 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="Search exhibitions…"
              className="w-full min-w-0 bg-transparent text-sm text-ink-800 outline-none placeholder:text-ink-400"
            />
          </label>
          <label className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm lg:flex">
            <Calendar width={15} className="shrink-0 text-ink-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[9.5rem] bg-transparent text-sm text-ink-700 outline-none"
            />
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="hidden max-w-[11rem] rounded-full bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm outline-none lg:block"
          >
            <option value="">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <button onClick={doSearch} className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm">Search</button>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <CitySelector />
          {user ? (
            <>
              <button className="relative hidden rounded-full p-2.5 text-ink-500 hover:bg-ink-50 sm:block">
                <Bell width={19} />
                <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-white">3</span>
              </button>
              <div className="relative">
                <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-1 pr-2.5 shadow-sm hover:bg-ink-50">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=d6206e&color=fff`} alt="" className="h-8 w-8 rounded-full" />
                  <span className="hidden text-sm font-semibold text-ink-800 sm:block">{user.name.split(' ')[0]}</span>
                  <ChevronDown width={16} className="hidden text-ink-400 sm:block" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft" onMouseLeave={() => setUserMenu(false)}>
                    <div className="border-b border-ink-100 px-4 py-3.5">
                      <div className="text-sm font-semibold text-ink-900">{user.name}</div>
                      <div className="text-xs text-ink-400">{user.email}</div>
                      <div className="mt-1.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">{user.role}</div>
                    </div>
                    {user.role === 'visitor' && <MenuItem to="/exhibitions" icon={<Grid width={18} />} onClick={() => setUserMenu(false)}>Discover expos</MenuItem>}
                    <MenuItem to="/my-bookings" icon={<Ticket width={18} />} onClick={() => setUserMenu(false)}>My bookings</MenuItem>
                    {(user.role === 'exhibitor' || user.role === 'admin') && (
                      <MenuItem to="/company-dashboard" icon={<Building width={18} />} onClick={() => setUserMenu(false)}>Company workspace</MenuItem>
                    )}
                    {user.role === 'admin' && (
                      <>
                        <MenuItem to="/admin" icon={<Dashboard width={18} />} onClick={() => setUserMenu(false)}>Admin dashboard</MenuItem>
                        <MenuItem to="/admin/discover" icon={<Search width={18} />} onClick={() => setUserMenu(false)}>Discover events (AI)</MenuItem>
                        <MenuItem to="/admin/events/new" icon={<Ticket width={18} />} onClick={() => setUserMenu(false)}>Create event</MenuItem>
                        <MenuItem to="/admin/floor-plan" icon={<Grid width={18} />} onClick={() => setUserMenu(false)}>Edit floor plan</MenuItem>
                      </>
                    )}
                    <button onClick={handleLogout} className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50"><LogOut width={18} /> Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 py-2 text-[15px] font-semibold text-ink-700 hover:text-ink-900 sm:inline-flex">Login</Link>
              <Link to="/register" className="btn-primary">Sign Up</Link>
            </>
          )}
          <button className="rounded-full p-2.5 text-ink-600 hover:bg-ink-50 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5">
              <Search width={16} className="text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Search exhibitions…" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5">
              <Calendar width={16} className="text-ink-400" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
            </label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none">
              <option value="">All industries</option>
              {industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <button onClick={doSearch} className="btn-primary w-full">Search</button>
          </div>
          {!user && (
            <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline flex-1">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function MenuItem({ to, icon, children, onClick }: { to: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink-700 hover:bg-ink-50">{icon} {children}</Link>
  );
}

function CitySelector() {
  const { city, cities, setCity, detect, detecting } = useCity();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-2 pl-3 pr-2.5 text-sm font-semibold text-ink-800 shadow-sm hover:border-brand-300 hover:bg-brand-50/40">
        <MapPin width={16} className="text-brand-600" />
        <span className="hidden max-w-[90px] truncate sm:block">{detecting ? 'Detecting…' : city}</span>
        <ChevronDown width={15} className="text-ink-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft" onMouseLeave={() => setOpen(false)}>
          <div className="border-b border-ink-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-400">Select your city</div>
          <div className="max-h-72 overflow-y-auto py-1">
            {cities.map((c) => (
              <button key={c} onClick={() => { setCity(c); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-ink-50 ${c === city ? 'font-semibold text-brand-700' : 'text-ink-700'}`}>
                {c}{c === city && <Check width={16} />}
              </button>
            ))}
          </div>
          <button onClick={() => { detect(); setOpen(false); }} className="flex w-full items-center gap-2 border-t border-ink-100 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-50">
            <MapPin width={16} /> Detect my location
          </button>
        </div>
      )}
    </div>
  );
}
