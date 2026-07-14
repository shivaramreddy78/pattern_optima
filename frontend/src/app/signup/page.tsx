"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Building, Phone, Sparkles, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailError, setEmailError] = useState('');

  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, email: val }));
    if (val && !EMAIL_REGEX.test(val)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError('');
    }
  };

  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    // Enforce guard check: already authenticated users redirect to dashboard
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const pw = formData.password;
    setChecks({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw)
    });
  }, [formData.password]);

  const getStrength = () => {
    const totalChecks = Object.values(checks).filter(Boolean).length;
    if (totalChecks === 0) return { label: 'None', color: 'bg-slate-800', width: '0%' };
    if (totalChecks <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (totalChecks <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };
  const strength = getStrength();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(formData.email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    const isPasswordValid = checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special;
    if (!isPasswordValid) {
      setErrorMsg("Please meet all password requirements.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');



    const cleanPhone = formData.mobileNumber.replace(/[\s\-\(\)]/g, "");
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      setErrorMsg('Mobile number must be 10-15 digits long.');
      setLoading(false);
      return;
    }

    try {
      await signup(
        formData.fullName,
        formData.companyName,
        cleanPhone,
        formData.email,
        formData.password
      );

      setSuccessMsg('Account created successfully. Please sign in.');
      localStorage.setItem('po_first_login_flag', 'true');
      setTimeout(() => {
        router.push('/login?message=Account+created+successfully.+Please+sign+in.&type=success');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Registration failed. Please double-check details.');
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
          <h2 className="text-xl font-bold text-primaryText mt-3">Create your account</h2>
          <p className="text-xs text-mutedText">Join Pattern Optima to maximize fabric cutting yield.</p>
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

        <form onSubmit={handleSignup} className="flex flex-col gap-4 text-xs font-semibold">
          
          {/* Representative Name */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type="text" 
                placeholder="E. Shivaram Reddy" 
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full bg-background border border-themeBorder rounded-xl py-3 pl-10 pr-4 text-primaryText focus:border-electric outline-none transition-all font-normal"
              />
            </div>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Company Name</label>
            <div className="relative">
              <Building className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type="text" 
                placeholder="Reddy Apparel Labs" 
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="w-full bg-background border border-themeBorder rounded-xl py-3 pl-10 pr-4 text-primaryText focus:border-electric outline-none transition-all font-normal"
              />
            </div>
          </div>

          {/* Mobile number */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Mobile Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type="tel" 
                placeholder="+91 98765 43210" 
                value={formData.mobileNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                className="w-full bg-background border border-themeBorder rounded-xl py-3 pl-10 pr-4 text-primaryText focus:border-electric outline-none transition-all font-normal"
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Email Address</label>
            <div className="relative">
              <Mail className={`absolute left-3 top-3.5 h-4 w-4 ${emailError ? 'text-rose-500' : 'text-gray-500'}`} />
              <input 
                required
                type="email" 
                placeholder="architect@reddyapparel.com" 
                value={formData.email}
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
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
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
            {formData.password && (
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
          <div className="flex flex-col gap-1.5 text-left">
            <label className="font-semibold text-mutedText">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" />
              <input 
                required
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
            disabled={loading || !!emailError || !formData.email || !formData.password || !formData.confirmPassword || !formData.fullName || !formData.companyName || !formData.mobileNumber || !(checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special)}
            title={emailError ? "Please enter a valid email address." : 
                   !(checks.length && checks.uppercase && checks.lowercase && checks.number && checks.special) ? "Please meet password requirements." :
                   formData.password !== formData.confirmPassword ? "Passwords do not match." :
                   (!formData.email || !formData.password || !formData.fullName || !formData.companyName || !formData.mobileNumber) ? "Please fill all required fields." : ""}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-primaryText font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-98 mt-2"
          >
            {loading ? 'Registering details...' : 'Create free account'}
          </button>
        </form>

        <p className="text-[11px] text-center text-mutedText border-t border-themeBorder pt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-electric hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
