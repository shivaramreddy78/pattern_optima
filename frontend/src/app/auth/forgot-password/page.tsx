"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mockResetUrl, setMockResetUrl] = useState('');
  const [emailError, setEmailError] = useState('');

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setMockResetUrl('');

    try {
      const res = await forgotPassword(email);
      setSuccessMsg('Reset token successfully generated!');
      if (res.reset_url) {
        setMockResetUrl(res.reset_url);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'No user registered with this email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-6 overflow-hidden">
      {/* Gradients */}
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      <div className="absolute inset-0 radial-glow-cyan pointer-events-none" />
      <div className="absolute inset-0 radial-glow-purple pointer-events-none" />
      <div className="absolute inset-0 mesh-grid opacity-20 pointer-events-none" />

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
          <h2 className="text-xl font-bold text-primaryText mt-3">Reset your password</h2>
          <p className="text-xs text-mutedText">Enter your email and we'll dispatch a secure reset token link.</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {!mockResetUrl ? (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
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

            <button 
              type="submit"
              disabled={loading || !!emailError || !email}
              title={emailError || (!email ? "Please enter your email address." : "")}
              className="w-full py-3 px-4 bg-electric hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-primaryText font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              {loading ? 'Validating email...' : 'Send reset link'}
            </button>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-4 text-xs"
          >
            <div className="p-4 rounded-xl bg-cyanAccent/10 border border-cyanAccent/20 text-cyan-200 leading-relaxed text-[11px] text-left">
              <p className="font-bold text-primaryText mb-1">Developer Testing Helper Alert:</p>
              An in-memory password reset token has been registered in the FastAPI server. Click the link below to change your credentials instantly:
            </div>
            
            <Link 
              href={mockResetUrl}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 text-primaryText font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              Go to Reset Form
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}

        <div className="flex items-center justify-center border-t border-themeBorder pt-4">
          <Link href="/login" className="text-xs text-mutedText hover:text-primaryText transition-colors flex items-center gap-1.5 font-semibold font-normal">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
