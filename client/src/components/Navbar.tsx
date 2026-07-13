import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useCity } from '../city';
import { Logo } from './ui';
import { Bell, Dashboard, LogOut, Menu, Ticket, X, ChevronDown, Building, Grid, MapPin, Check } from './icons';

const NAV = [
  { to: '/', label: 'Home', match: (p: string) => p === '/' },
  { to: '/exhibitions', label: 'Exhibitions', match: (p: string) => p.startsWith('/exhibitions') },
  { to: '/exhibitions', label: 'Venues', match: () => false },
  { to: '/exhibitions', label: 'Floor Plan', match: () => false },
  { to: '/#pricing', label: 'Pricing', match: () => false },
];

const RESOURCES = [
  { to: '#', label: 'Blog' },
  { to: '#', label: 'Help Center' },
  { to: '#', label: 'Guides' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setUserMenu(false); };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-xl">
      <div className="container-px flex h-[72px] items-center justify-between gap-4">
        <Link to="/" className="shrink-0"><Logo withTagline /></Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((l) => {
            const active = l.match(location.pathname);
            return (
              <Link key={l.label} to={l.to}
                className={`relative rounded-lg px-3.5 py-2 text-[15px] font-semibold transition-colors ${active ? 'text-brand-600' : 'text-ink-600 hover:text-ink-900'}`}>
                {l.label}
                {active && <span className="absolute inset-x-3.5 -bottom-[22px] h-[3px] rounded-full bg-grad" />}
              </Link>
            );
          })}
          <div className="relative" onMouseEnter={() => setResOpen(true)} onMouseLeave={() => setResOpen(false)}>
            <button className="flex items-center gap-1 rounded-lg px-3.5 py-2 text-[15px] font-semibold text-ink-600 hover:text-ink-900">
              Resources <ChevronDown width={15} className="text-ink-400" />
            </button>
            {resOpen && (
              <div className="absolute left-0 top-full w-44 overflow-hidden rounded-2xl border border-ink-100 bg-white py-1 shadow-soft">
                {RESOURCES.map((r) => (
                  <a key={r.label} href={r.to} className="block px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50">{r.label}</a>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2.5">
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
                        <MenuItem to="/admin/floor-plan" icon={<Grid width={18} />} onClick={() => setUserMenu(false)}>Floor plans</MenuItem>
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
          <button className="rounded-full p-2.5 text-ink-600 hover:bg-ink-50 lg:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-ink-100 bg-white px-4 py-3 lg:hidden">
          {NAV.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">{l.label}</Link>
          ))}
          {RESOURCES.map((r) => (
            <a key={r.label} href={r.to} onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50">{r.label}</a>
          ))}
          {!user && (
            <div className="mt-2 flex gap-2 border-t border-ink-100 pt-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-outline flex-1">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1">Sign Up</Link>
            </div>
          )}
        </nav>
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
