import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { Logo } from './ui';
import { Bell, Dashboard, LogOut, Menu, Ticket, X, ChevronDown, Building, Grid } from './icons';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  // Role-aware navigation for the 3 views
  const links = !user
    ? [
        { to: '/', label: 'Home' },
        { to: '/exhibitions', label: 'Discover' },
        { to: '/exhibitions?status=live', label: 'Live Now' },
        { to: '/exhibitions?status=upcoming', label: 'Upcoming' },
        { to: '/exhibitions?status=past', label: 'Past' },
      ]
    : user.role === 'admin'
      ? [
          { to: '/admin', label: 'Dashboard' },
          { to: '/admin/floor-plan', label: 'Floor Plans' },
          { to: '/exhibitions', label: 'Exhibitions' },
          { to: '/company-dashboard', label: 'Messages' },
        ]
      : user.role === 'exhibitor'
        ? [
            { to: '/', label: 'Book Stalls' },
            { to: '/exhibitions?status=live', label: 'Live Expos' },
            { to: '/company-dashboard', label: 'My Company' },
            { to: '/my-bookings', label: 'My Bookings' },
          ]
        : [
            { to: '/exhibitions', label: 'Discover' },
            { to: '/exhibitions?status=live', label: 'Live Now' },
            { to: '/exhibitions?status=upcoming', label: 'Upcoming' },
            { to: '/my-bookings', label: 'My Visits' },
          ];

  const currentUrl = location.pathname + location.search;
  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : currentUrl === to || location.pathname === to);

  const handleLogout = () => { logout(); navigate('/'); setUserMenu(false); };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-px flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((l) => {
              const active = isActive(l.to);
              return (
                <Link key={l.label} to={l.to}
                  className={`relative py-1 text-[15px] transition-colors ${active ? 'font-semibold' : 'font-medium text-slate-700 hover:text-[#a30d3a]'}`}
                  style={active ? { color: 'var(--brand)' } : undefined}>
                  {l.label}
                  {active && <span className="absolute -bottom-[22px] left-0 right-0 h-[3px] rounded-full" style={{ backgroundColor: 'var(--brand)' }} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button className="relative hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block">
                <Bell width={20} />
                <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: 'var(--brand)' }}>3</span>
              </button>
              <div className="relative">
                <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 hover:bg-slate-50">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`} alt="" className="h-8 w-8 rounded-full" />
                  <span className="hidden text-sm font-semibold text-slate-800 sm:block">{user.name.split(' ')[0]}</span>
                  <ChevronDown width={16} className="hidden text-slate-400 sm:block" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft" onMouseLeave={() => setUserMenu(false)}>
                    <div className="border-b border-slate-100 px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                      <div className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700">{user.role}</div>
                    </div>
                    {user.role === 'visitor' && <Link to="/exhibitions" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Grid width={18} /> Discover Expos</Link>}
                    <Link to="/my-bookings" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Ticket width={18} /> My Bookings</Link>
                    {(user.role === 'exhibitor' || user.role === 'admin') && (
                      <Link to="/company-dashboard" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Building width={18} /> Company Workspace</Link>
                    )}
                    {user.role === 'admin' && (
                      <>
                        <Link to="/admin" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Dashboard width={18} /> Admin Dashboard</Link>
                        <Link to="/admin/floor-plan" onClick={() => setUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><Grid width={18} /> Floor Plans</Link>
                      </>
                    )}
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut width={18} /> Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </>
          )}
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-slate-100 bg-white px-4 py-2 lg:hidden">
          {links.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-50 ${isActive(l.to) ? 'text-brand-600' : 'text-slate-700'}`}>{l.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
