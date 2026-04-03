'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Mail, ArrowRight, Users, Plus, LogIn } from 'lucide-react';

type Step = 'email' | 'check-email' | 'family-setup';

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyAction, setFamilyAction] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep('check-email');
    }
  }

  async function handleFamilySetup(e: React.FormEvent) {
    e.preventDefault();
    setFamilyLoading(true);
    setFamilyError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (familyAction === 'create') {
        // Create a new family group
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .insert({ name: familyName })
          .select()
          .single();

        if (groupError) throw groupError;

        // Update profile with family group
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ family_group_id: group.id })
          .eq('id', user.id);

        if (profileError) throw profileError;
      } else {
        // Join an existing family group by invite code
        const { data: group, error: groupError } = await supabase
          .from('family_groups')
          .select()
          .eq('invite_code', inviteCode.trim().toUpperCase())
          .single();

        if (groupError || !group) {
          throw new Error('Invalid invite code. Please check and try again.');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ family_group_id: group.id })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Redirect to calendar
      window.location.href = '/calendar';
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : 'Something went wrong');
      setFamilyLoading(false);
    }
  }

  if (step === 'check-email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
          </p>
          <p className="text-sm text-gray-500">
            Didn&apos;t receive it?{' '}
            <button
              onClick={() => setStep('email')}
              className="text-brand-600 hover:underline font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (step === 'family-setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Set up your family</h2>
            <p className="text-gray-600 text-sm mt-1">Create a new group or join an existing one</p>
          </div>

          <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
            <button
              type="button"
              onClick={() => setFamilyAction('create')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                familyAction === 'create'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="h-4 w-4" />
              Create Group
            </button>
            <button
              type="button"
              onClick={() => setFamilyAction('join')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
                familyAction === 'join'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Join Group
            </button>
          </div>

          <form onSubmit={handleFamilySetup} className="space-y-4">
            {familyAction === 'create' ? (
              <div>
                <label className="label">Family Group Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={e => setFamilyName(e.target.value)}
                  placeholder="The Smith Family"
                  className="input-field"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="label">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="input-field font-mono tracking-widest uppercase"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask a family member for their 8-character invite code
                </p>
              </div>
            )}

            {familyError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {familyError}
              </div>
            )}

            <button
              type="submit"
              disabled={familyLoading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {familyLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Setting up...
                </span>
              ) : (
                <>
                  {familyAction === 'create' ? 'Create Family Group' : 'Join Family Group'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Bermuda Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-1 text-sm">Sign in with your email to continue</p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending link...
              </span>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Magic Link
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          We&apos;ll send you a secure link to sign in — no password needed.
        </p>
      </div>
    </div>
  );
}
