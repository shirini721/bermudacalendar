import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Calendar, Users, Bell, Upload, Shield, Smartphone } from 'lucide-react';

export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/calendar');
  }

  const features = [
    {
      icon: Calendar,
      title: 'Shared Family Calendar',
      description: 'View all family events in one place with month, week, day, and list views.',
    },
    {
      icon: Users,
      title: 'Color-Coded Members',
      description: 'Each family member gets their own color so you can see at a glance who has what.',
    },
    {
      icon: Bell,
      title: 'Email Notifications',
      description: 'Automatic email alerts when events are created, updated, or deleted.',
    },
    {
      icon: Upload,
      title: 'Spreadsheet Import',
      description: 'Import events in bulk from Excel or CSV files with drag-and-drop.',
    },
    {
      icon: Shield,
      title: 'Private & Secure',
      description: 'Your family data is private. Only invited family members can see your calendar.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Access your calendar from any device, anywhere.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
            <Calendar className="h-4 w-4" />
            Family organization made simple
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Keep your family
            <span className="text-brand-600 block">in sync</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Bermuda Family Calendar is the easiest way to organize your family&apos;s busy schedule.
            Share events, assign activities to family members, and never miss a beat.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="btn-primary text-base px-8 py-3 shadow-lg shadow-brand-200"
            >
              <Calendar className="h-5 w-5" />
              Get Started Free
            </Link>
            <Link
              href="/auth/login"
              className="btn-secondary text-base px-8 py-3"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Calendar Preview */}
        <div className="mt-16 relative">
          <div className="card overflow-hidden shadow-2xl mx-auto max-w-4xl">
            <div className="bg-brand-600 px-6 py-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-white text-sm font-medium">Bermuda Family Calendar</span>
            </div>
            <div className="p-6 bg-white">
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-xs font-semibold text-gray-500 py-2">{day}</div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i - 4;
                  const events: Record<number, { label: string; color: string }[]> = {
                    3: [{ label: 'Soccer Practice', color: '#10b981' }],
                    8: [{ label: "Emma's Birthday", color: '#ec4899' }],
                    12: [{ label: 'Doctor Appt', color: '#ef4444' }],
                    15: [{ label: 'School Play', color: '#6366f1' }],
                    20: [{ label: 'Family Vacation', color: '#f59e0b' }],
                    21: [{ label: 'Family Vacation', color: '#f59e0b' }],
                    22: [{ label: 'Family Vacation', color: '#f59e0b' }],
                  };
                  return (
                    <div
                      key={i}
                      className={`min-h-[60px] rounded-lg p-1 text-xs ${
                        day === 3 ? 'bg-brand-50 ring-1 ring-brand-200' : ''
                      } ${day <= 0 || day > 30 ? 'opacity-30' : ''}`}
                    >
                      {day > 0 && day <= 30 && (
                        <>
                          <span className={`font-medium ${day === 3 ? 'text-brand-600' : 'text-gray-700'}`}>
                            {day}
                          </span>
                          {events[day]?.map((ev, ei) => (
                            <div
                              key={ei}
                              className="mt-0.5 rounded px-1 py-0.5 text-white text-[10px] truncate"
                              style={{ backgroundColor: ev.color }}
                            >
                              {ev.label}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything your family needs</h2>
            <p className="text-gray-600 mt-2">Powerful features built for busy families</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get organized?</h2>
          <p className="text-brand-100 mb-8 text-lg">
            Join thousands of families using Bermuda Calendar to stay connected.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-base font-semibold text-brand-600 hover:bg-brand-50 transition-colors shadow-lg"
          >
            <Calendar className="h-5 w-5" />
            Start for Free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Bermuda Family Calendar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
