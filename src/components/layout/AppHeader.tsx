'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation, LogOut, User as UserIcon, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4 sm:max-w-2xl">
        {/* App Branding */}
        <Link href="/errands" className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Navigation className="h-4 w-4" />
          </div>
          <span>Waypoint</span>
        </Link>

        {/* Auth / Header Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground border">
                <UserIcon className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[120px] truncate">{user.email}</span>
              </div>

              {/* Logout Action Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="h-8 gap-1.5 rounded-full border-destructive/20 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="default" className="h-8 gap-1 rounded-full px-3 text-xs font-semibold">
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
