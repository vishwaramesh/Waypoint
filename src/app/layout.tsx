import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ToastContainer } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Waypoint - Errand & Route Assistant',
  description: 'Mobile-first errand planner and navigation map assistant with live geofencing',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Waypoint',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-x-hidden">
      <body className={`${inter.className} flex h-full flex-col bg-background antialiased overflow-x-hidden max-w-full`}>
        <AuthProvider>
          {/* Top App Bar */}
          <AppHeader />

          {/* Main Content Area (Max width max-w-md / 390px phone friendly) */}
          <main className="mx-auto w-full max-w-md flex-1 px-3.5 pt-3 pb-20 sm:max-w-2xl overflow-x-hidden">
            {children}
          </main>

          {/* Toast Notification Container */}
          <ToastContainer />

          {/* Mobile Bottom Tab Bar */}
          <BottomTabBar />
        </AuthProvider>
      </body>
    </html>
  );
}
