'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Upload, LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  async function handleLogout() {
    await fetch('/api/login', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link href="/calendar" className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">Bermuda Calendar</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLink('/calendar', 'Calendar', CalendarDays)}
          {navLink('/import', 'Import', Upload)}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </nav>
  );
}
