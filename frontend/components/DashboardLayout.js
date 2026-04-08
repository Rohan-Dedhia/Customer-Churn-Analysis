'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { TrendingDown, LayoutDashboard, Users, LogOut, Loader2 } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Analytics',  icon: LayoutDashboard },
  { href: '/customers', label: 'Customers',  icon: Users },
];

export default function DashboardLayout({ children }) {
  const [ready, setReady] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const pageTitle = pathname === '/dashboard' ? 'Analytics Overview'
    : pathname.startsWith('/customers') ? 'Customer Management'
    : 'Dashboard';

  if (!ready) {
    return (
      <div className="auth-page">
        <Loader2 size={36} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <TrendingDown size={18} color="white" />
          </div>
          <div>
            <div className="brand-text">Churn Analysis</div>
            <div className="brand-sub">Analytics Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Main Menu</span>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href || pathname.startsWith(href + '/') ? 'active' : ''}`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}>
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>

      {/* ---- Main ---- */}
      <div className="main-wrapper">
        <header className="topbar">
          <span className="topbar-title">{pageTitle}</span>
          <div className="topbar-right">
            <div className="avatar">A</div>
          </div>
        </header>

        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
