'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Upload, LogOut, Copy, Check, ChevronDown } from 'lucide-react';
import MemberBadge from './MemberBadge';
import type { Profile } from '@/types';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prof) {
        setProfile(prof as Profile);

        if (prof.family_group_id) {
          const { data: group } = await supabase
            .from('family_groups')
            .select('invite_code')
            .eq('id', prof.family_group_id)
            .single();

          if (group) setInviteCode(group.invite_code);
        }
      }
    }

    loadProfile();
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  async function copyInviteCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Don't show navbar on landing/auth pages
  const isAuthPage = pathname === '/' || pathname?.startsWith('/auth');
  if (isAuthPage) return null;

  const navLinks = [
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/import', label: 'Import', icon: Upload },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/calendar" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Bermuda Calendar</span>
          </Link>

          {/* Nav Links */}
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

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Invite Code */}
            {inviteCode && (
              <button
                onClick={copyInviteCode}
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-600 hover:bg-gray-100 transition-colors"
                title="Copy invite code to share with family"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {inviteCode}
                  </>
                )}
              </button>
            )}

            {/* User Menu */}
            {profile && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-gray-100 transition-colors"
                >
                  <MemberBadge
                    name={profile.name || profile.email}
                    color={profile.color}
                    size="sm"
                    avatarUrl={profile.avatar_url ?? undefined}
                  />
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1 animate-fade-in">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile.name || 'Family Member'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                      </div>

                      {inviteCode && (
                        <div className="px-3 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Invite Code</p>
                          <button
                            onClick={copyInviteCode}
                            className="flex items-center gap-1.5 text-sm font-mono text-gray-700 hover:text-brand-600"
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {inviteCode}
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => { setMenuOpen(false); handleLogout(); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
