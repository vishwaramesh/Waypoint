'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navigation, Mail, Lock, AlertCircle, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, demoLogin } = useAuth();

  const redirectTo = searchParams.get('redirectTo') || '/errands';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Field-level inline errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (user) {
      router.replace(redirectTo);
    }
  }, [user, router, redirectTo]);

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');

    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter a password.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match. Please try again.');
      isValid = false;
    }

    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setFormError('');
    setSuccessMessage('');

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('user already registered') || msg.includes('email already in use') || msg.includes('already exists')) {
            setEmailError('An account with this email already exists. Please log in instead.');
          } else if (msg.includes('password should be at least 6 characters') || msg.includes('weak password')) {
            setPasswordError('Password is too weak. Please use at least 6 characters.');
          } else {
            setFormError(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          // Immediately signed in
          router.replace(redirectTo);
        } else {
          // Confirmation email sent
          setSuccessMessage('Account created! Please check your email to confirm your subscription before logging in.');
          setLoading(false);
        }
      } catch (err: any) {
        setFormError(err.message || 'An unexpected error occurred during registration.');
        setLoading(false);
      }
    } else {
      // Demo signup fallback
      setTimeout(() => {
        demoLogin(email.trim());
        setLoading(false);
        router.replace(redirectTo);
      }, 600);
    }
  };

  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center py-6 px-2">
      <div className="w-full max-w-sm space-y-4">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Navigation className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Account</h1>
          <p className="text-xs text-muted-foreground">
            Sign up for Waypoint to start planning errands and routes
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-border shadow-md">
          <form onSubmit={handleSignup}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Sign Up</CardTitle>
              <CardDescription className="text-xs">
                Create a new Supabase Auth account with your email.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* General Form Error Banner */}
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1">
                <Label htmlFor="signup-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    error={Boolean(emailError)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    error={Boolean(passwordError)}
                    className="pl-9"
                    autoComplete="new-password"
                  />
                </div>
                {passwordError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    error={Boolean(confirmPasswordError)}
                    className="pl-9"
                    autoComplete="new-password"
                  />
                </div>
                {confirmPasswordError && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {confirmPasswordError}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full h-10 font-semibold gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

function SignupFormFallback() {
  return (
    <div className="flex min-h-[85vh] flex-col items-center justify-center py-6 px-2">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFormFallback />}>
      <SignupForm />
    </Suspense>
  );
}
