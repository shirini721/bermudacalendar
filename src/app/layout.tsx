import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Bermuda Family Calendar',
  description: 'Keep your family organized and connected with shared calendars, event tracking, and instant notifications.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
