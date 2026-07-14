"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Lock, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength visual checks
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    });
  }, [password]);

  const getStrength = () => {
    const totalChecks = Object.values(checks).filter(Boolean).length;
    if (totalChecks === 0) return { label: 'None', color: 'bg-slate-800', width: '0%' };
    if (totalChecks <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (totalChecks <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };
  const strength = getStrength();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!token) {
      setErrorMsg('Missing or invalid password reset token.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }

    const isPasswordValid = checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
    if (!isPasswordValid) {
      setErrorMsg('Password does not meet strength requirements.');
      setLoading(false);
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccessMsg('Your password has been successfully updated! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Reset token is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <h2 className="text-xl font-bold text-primaryText mt-3">Choose a new password</h2>
        <p className="text-xs text-mutedText">Set a secure password for your nesting account.</p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {!token ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 leading-relaxed text-xs text-center">
          Invalid request. A password reset token is required. Please check your reset link or request a new reset token.
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-xs">
          
          {/* New Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-mutedText">New Password</label>
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

            {/* Visual indicators strength */}
            {password && (
              <div className="flex flex-col gap-2 mt-2 bg-secondaryBg/50 p-3 rounded-xl border border-themeBorder">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider">Password Strength</span>
                  <span className={`text-[10px] font-bold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-[9px] text-gray-500 font-semibold">
                  <span className={checks.length ? 'text-emerald-400' : 'text-gray-600'}>✓ Min 8 chars</span>
                  <span className={checks.uppercase ? 'text-emerald-400' : 'text-gray-600'}>✓ Uppercase</span>
                  <span className={checks.lowercase ? 'text-emerald-400' : 'text-gray-600'}>✓ Lowercase</span>
                  <span className={checks.number ? 'text-emerald-400' : 'text-gray-600'}>✓ Number</span>
                  <span className={checks.special ? 'text-emerald-400' : 'text-gray-600'}>✓ Special char</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-mutedText">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-themeBorder rounded-xl py-3 pl-10 pr-10 text-primaryText focus:border-electric outline-none transition-all font-normal"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3.5 text-gray-500 hover:text-primaryText transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !password || !confirmPassword || !(checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special)}
            title={!(checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special) ? "Please meet password requirements." : 
                   password !== confirmPassword ? "Passwords do not match." : ""}
            className="w-full py-3 px-4 bg-electric hover:bg-blue-700 disabled:opacity-50 text-primaryText font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98"
          >
            {loading ? 'Updating credentials...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="flex items-center justify-center border-t border-themeBorder pt-4">
        <Link href="/login" className="text-xs text-mutedText hover:text-primaryText transition-colors flex items-center gap-1.5 font-semibold font-normal">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden">
      {/* Gradients */}
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      <div className="absolute inset-0 radial-glow-cyan pointer-events-none" />
      <div className="absolute inset-0 radial-glow-purple pointer-events-none" />
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />
      
      <Suspense fallback={
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 relative z-10 shadow-2xl border-themeBorder">
          <div className="h-8 w-8 border-t-2 border-r-2 border-electric rounded-full animate-spin" />
          <span className="text-xs text-mutedText">Loading form parameters...</span>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
