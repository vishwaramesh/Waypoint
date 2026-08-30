'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  demoLogin: (email: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  demoLogin: () => {},
});

const DEMO_USER_KEY = 'waypoint_demo_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase.auth.getSession();
          if (mounted) {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
          }
        } catch (err) {
          console.error('Error fetching session:', err);
          if (mounted) setLoading(false);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
          (_event, currentSession) => {
            if (mounted) {
              setSession(currentSession);
              setUser(currentSession?.user ?? null);
              setLoading(false);
            }
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } else {
        // Fallback for local demo mode before Supabase credentials are wired
        try {
          const storedUser = localStorage.getItem(DEMO_USER_KEY);
          if (storedUser && mounted) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed as User);
          }
        } catch (e) {
          // ignore localStorage error
        }
        if (mounted) setLoading(false);
      }
    }

    const cleanup = initAuth();

    return () => {
      mounted = false;
      cleanup.then((unsubscribe) => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
    };
  }, []);

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_USER_KEY);
    setUser(null);
    setSession(null);
  };

  const demoLogin = (email: string) => {
    const mockUser = {
      id: 'demo-user-id',
      email: email,
      app_metadata: {},
      user_metadata: { name: email.split('@')[0] },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(mockUser));
    setUser(mockUser);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
