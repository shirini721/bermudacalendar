'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Upload, LogOut } from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/' || pathname?.startsWith('/auth')) return null;

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/auth/login');
    router.refresh();
  }

  const navLinks = [
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/import', label: 'Import', icon: Upload },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link href="/calendar" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Bermuda Calendar</span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
