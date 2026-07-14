"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Toast, { ToastMessage } from '@/components/Toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val && !EMAIL_REGEX.test(val)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError('');
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check for redirect message and type on mount
  useEffect(() => {
    if (searchParams) {
      const message = searchParams.get('message');
      const type = searchParams.get('type') || 'info';
      if (message) {
        addToast(message, type as any);
        
        // Clean URL query parameters
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await login(email, password);
      localStorage.setItem('po_login_welcome_toast', 'true');
      // If remember me is checked, we could optionally set a flag, but AuthContext already handles token persistence in localStorage
      if (rememberMe) {
        localStorage.setItem('pattern_optima_remember', 'true');
      } else {
        localStorage.removeItem('pattern_optima_remember');
      }
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Incorrect email or password combination.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 flex flex-col gap-6 relative z-10 shadow-2xl border-themeBorder"
      >
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primaryText">
            <Sparkles className="h-5 w-5 text-cyanAccent" />
            PATTERN<span className="text-electric">OPTIMA</span>
          </Link>
          <h2 className="text-xl font-bold text-primaryText mt-3">Welcome back</h2>
          <p className="text-xs text-mutedText">Sign in to manage and run optimized nesting schedules.</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs font-semibold">
          
          {/* Email */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Email Address</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-3.5 h-4 w-4 ${emailError ? 'text-rose-500' : 'text-gray-500'}`} />
              <input 
                required
                type="email" 
                placeholder="architect@garments.com" 
                value={email}
                onChange={handleEmailChange}
                className={`w-full bg-background border ${emailError ? 'border-rose-500' : 'border-themeBorder'} rounded-xl py-3 pl-10 pr-10 text-primaryText focus:border-electric outline-none transition-all font-normal`}
              />
              <AnimatePresence>
                {emailError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-3 top-3.5">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {emailError && (
                <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-rose-500 text-[10px] font-bold mt-0.5">
                  {emailError}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type={showPassword ? "text" : "password"}
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-themeBorder rounded-xl py-3 pl-10 pr-10 text-primaryText focus:border-electric outline-none transition-all font-normal"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-primaryText transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between mt-1 text-mutedText select-none text-[10px]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-primaryText transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-themeBorder bg-background text-electric focus:ring-electric focus:ring-offset-0 focus:ring-0 h-3.5 w-3.5 accent-electric cursor-pointer font-normal"
              />
              <span>Remember Me</span>
            </label>
            <Link href="/auth/forgot-password" className="text-gray-500 hover:text-primaryText transition-colors">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit"
            disabled={loading || !!emailError || !email || !password}
            title={emailError || (!email || !password ? "Please fill in all required fields." : "")}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 text-primaryText font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-[11px] text-mutedText border-t border-themeBorder pt-4 flex flex-col gap-1 items-center justify-center">
          <span>Don't have an account?</span>
          <Link href="/signup" className="text-electric hover:underline font-bold">
            Create Account
          </Link>
        </div>
      </motion.div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden">
      {/* Dynamic Gradients */}
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      <div className="absolute inset-0 radial-glow-cyan pointer-events-none" />
      <div className="absolute inset-0 radial-glow-purple pointer-events-none" />
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />

      <Suspense fallback={
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 relative z-10 shadow-2xl border-themeBorder">
          <div className="h-8 w-8 border-t-2 border-r-2 border-electric rounded-full animate-spin" />
          <span className="text-xs text-mutedText">Initializing secure session...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
