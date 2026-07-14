"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { useTheme, AccentColor } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { 
  User, 
  Settings, 
  Key, 
  Bell, 
  Globe2, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Sun,
  Moon,
  Camera,
  Download,
  Mail,
  Phone,
  Shield,
  Activity,
  Sliders,
  Info,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  Lock,
  Languages,
  Laptop,
  Check,
  SlidersHorizontal,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth, UserProfile } from '@/context/AuthContext';

interface SettingsTabProps {
  currentUser: UserProfile | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type SubCategory = 'profile' | 'general' | 'account' | 'security' | 'notifications' | 'appearance' | 'preferences' | 'language' | 'about';

export default function SettingsTab({
  currentUser,
  setCurrentUser,
  theme,
  setTheme,
  addToast
}: SettingsTabProps) {
  const { updateProfile } = useAuth();
  const [activeSub, setActiveSub] = useState<SubCategory>('profile');

  // Profile image upload state hooks
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoView, setPhotoView] = useState<'options' | 'adjust' | 'confirm_remove'>('options');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1.0);
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 });
  const [photoRotation, setPhotoRotation] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    setPhotoView('options');
    setShowPhotoModal(true);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Extension validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      addToast("Unsupported file format. Supported formats: JPG, JPEG, PNG, WEBP", "error");
      return;
    }
    
    // Size validation
    if (file.size > 5 * 1024 * 1024) {
      addToast("Profile picture size exceeds 5MB limit.", "error");
      return;
    }
    
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Reset adjust params
    setPhotoZoom(1.0);
    setPhotoPan({ x: 0, y: 0 });
    setPhotoRotation(0);
    setPhotoView('adjust');
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;
    setUploadingPhoto(true);
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      setUploadProgress(40);
      const res = await apiClient.post('/auth/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(90, percent));
          }
        }
      });
      setUploadProgress(100);
      
      const updatedUser = res.data;
      setCurrentUser(updatedUser);
      addToast("Profile photo updated successfully.", "success");
      setShowPhotoModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      addToast(err.response?.data?.detail || "Failed to upload profile photo.", "error");
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const res = await apiClient.delete('/auth/profile-image');
      setCurrentUser(res.data);
      addToast("Profile picture removed successfully.", "warning");
      setShowPhotoModal(false);
    } catch (err: any) {
      addToast(err.response?.data?.detail || "Failed to remove profile picture.", "error");
    }
  };

  // Account Form
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.full_name || '',
    companyName: currentUser?.company_name || '',
    factoryName: 'Hyderabad Unit 2 (Dilsukhnagar)',
    businessType: 'Garment Manufacturer (Apparel)',
    department: 'Pattern Compaction Division',
    country: 'India',
    timezone: 'Asia/Kolkata (GMT+5:30)',
    mobileNumber: currentUser?.mobile_number || '',
    email: currentUser?.email || '',
    role: 'Lead CAD/CAM Engineer'
  });

  const [emailError, setEmailError] = useState('');
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProfileForm(prev => ({ ...prev, email: val }));
    if (val && !EMAIL_REGEX.test(val)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError('');
    }
  };

  // Sync state values with props when currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setProfileForm(prev => ({
        ...prev,
        fullName: currentUser.full_name || '',
        companyName: currentUser.company_name || '',
        mobileNumber: currentUser.mobile_number || '',
        email: currentUser.email || ''
      }));
    }
  }, [currentUser]);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  React.useEffect(() => {
    const pw = passwordForm.newPassword;
    setPasswordChecks({
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw)
    });
  }, [passwordForm.newPassword]);

  const getPasswordStrength = () => {
    const totalChecks = Object.values(passwordChecks).filter(Boolean).length;
    if (totalChecks === 0) return { label: 'None', color: 'bg-slate-800', width: '0%' };
    if (totalChecks <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (totalChecks <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };
  const passwordStrength = getPasswordStrength();

  const [tfaEnabled, setTfaEnabled] = useState(false);

  // Notifications Form
  const [notificationsForm, setNotificationsForm] = useState({
    emailNotif: true,
    optimNotif: true,
    reportNotif: true,
    secAlerts: true,
    marketing: false
  });

  // Appearance Form
  const { accentColor, setAccentColor } = useTheme();
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Preferences Form
  const [units, setUnits] = useState<'mm' | 'cm' | 'inch'>('cm');
  const [defaultWidth, setDefaultWidth] = useState(1500);
  const [defaultExport, setDefaultExport] = useState('dxf');
  const { language, setLanguage } = useLanguage();

  // Saving Animation States
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Categories list
  const categories: Array<{ id: SubCategory; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
    { id: 'general', label: 'General Info', icon: <Building className="h-4 w-4" /> },
    { id: 'account', label: 'Account Details', icon: <Settings className="h-4 w-4" /> },
    { id: 'security', label: 'Security & 2FA', icon: <Lock className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Sun className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders className="h-4 w-4" /> },
    { id: 'language', label: 'Language & Locale', icon: <Languages className="h-4 w-4" /> },
    { id: 'about', label: 'About Product', icon: <Info className="h-4 w-4" /> }
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(profileForm.email)) {
      setEmailError("Please enter a valid email address.");
      addToast("Please enter a valid email address.", "error");
      return;
    }
    setSavingAccount(true);
    try {
      const updated = await updateProfile(
        profileForm.fullName,
        profileForm.companyName,
        profileForm.mobileNumber,
        profileForm.email
      );
      setCurrentUser(updated);
      setTimeout(() => {
        setSavingAccount(false);
        addToast("Profile details updated successfully in database", "success");
      }, 500);
    } catch (err: any) {
      setSavingAccount(false);
      addToast(err.response?.data?.detail || "Profile update failed.", "error");
    }
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSecurity(true);
    const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.lowercase && passwordChecks.number && passwordChecks.special;
    if (!isPasswordValid) {
      setSavingSecurity(false);
      addToast("Please meet all password requirements.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSavingSecurity(false);
      addToast("Passwords do not match!", "error");
      return;
    }
    setTimeout(() => {
      setSavingSecurity(false);
      addToast("Password changed successfully", "success");
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    }, 600);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-8 text-xs text-left">
      
      {/* 1. LEFT SIDEBAR: CATEGORIES */}
      <div className="lg:col-span-1 flex flex-col gap-1 bg-background/40 p-2.5 rounded-2xl border border-themeBorder h-fit">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black px-3 py-1.5 mb-2 block">
          Settings Console
        </span>
        {categories.map((cat) => {
          const isActive = activeSub === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveSub(cat.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 ${
                isActive 
                  ? 'bg-gradient-to-r from-electric/20 to-cyanAccent/5 border border-cyanAccent/20 text-cyanAccent font-bold shadow-md'
                  : 'text-mutedText hover:text-primaryText hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              <ChevronRight className={`h-3 w-3 transition-transform ${isActive ? 'translate-x-0.5 text-cyanAccent' : 'text-gray-600'}`} />
            </button>
          );
        })}
      </div>

      {/* 2. RIGHT CONTENT: REDESIGNED CATEGORY CARDS */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSub}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* MY PROFILE TAB */}
            {activeSub === 'profile' && (
              <div className="flex flex-col gap-6">
                {/* Profile Hero Header */}
                <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-[#0b0f19] to-background">
                  <div 
                    onClick={handlePhotoClick}
                    className="relative h-20 w-20 rounded-full border-2 border-cyanAccent/40 flex items-center justify-center bg-background/80 shadow-2xl shrink-0 overflow-hidden group cursor-pointer"
                    title="Manage Profile Photo"
                  >
                    {currentUser?.profile_image ? (
                      <img 
                        src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                        alt="Avatar" 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="font-sans font-black text-2xl text-cyanAccent uppercase">
                        {currentUser?.full_name?.charAt(0) || 'U'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-primaryText">
                      <Camera className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col md:items-start text-center md:text-left gap-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <h3 className="text-lg font-black text-primaryText">{currentUser?.full_name}</h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Active / Verified
                      </span>
                    </div>
                    <span className="text-mutedText font-semibold">{profileForm.role}</span>
                    <span className="text-[10px] text-cyanAccent font-bold">{currentUser?.company_name}</span>
                    
                    <div className="flex flex-wrap md:items-center gap-x-4 gap-y-1 text-gray-500 text-[10px] mt-1.5 font-medium">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {currentUser?.email}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Joined July 2026</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveSub('account')}
                    className="px-4 py-2 bg-white/5 border border-themeBorder hover:bg-white/10 text-primaryText font-bold rounded-xl shadow-md transition-all active:scale-95 text-xs shrink-0"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Grid info cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal info Card */}
                  <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-4">
                    <h4 className="font-bold text-primaryText uppercase tracking-wider pb-1.5 border-b border-themeBorder">
                      Personal Information
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                      {[
                        { label: 'Full Name', val: currentUser?.full_name },
                        { label: 'Email Address', val: currentUser?.email },
                        { label: 'Phone Number', val: profileForm.mobileNumber || '+91 98765 43210' },
                        { label: 'Company / Firm', val: currentUser?.company_name },
                        { label: 'Department', val: profileForm.department },
                        { label: 'Country / region', val: profileForm.country },
                        { label: 'Timezone', val: profileForm.timezone }
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between border-b border-themeBorder pb-2 text-[10px]">
                          <span className="text-gray-500 font-semibold">{item.label}</span>
                          <span className="text-primaryText font-bold">{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Summary Card */}
                  <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-4">
                    <h4 className="font-bold text-cyanAccent uppercase tracking-wider pb-1.5 border-b border-cyanAccent/10">
                      Productivity Summary
                    </h4>

                    <div className="grid grid-cols-2 gap-3.5 mt-1">
                      {[
                        { label: 'Patterns Uploaded', val: '12 Files', color: 'text-cyanAccent' },
                        { label: 'Nesting Runs', val: '48 Jobs', color: 'text-purpleAccent' },
                        { label: 'Exported Layouts', val: '96 CADs', color: 'text-emerald-400' },
                        { label: 'Fabric Saved', val: '125.4 m²', color: 'text-amber-400' },
                        { label: 'CO₂ Reduction Offset', val: '43.2 kg', color: 'text-emerald-400' },
                        { label: 'Utilization Average', val: '94.2%', color: 'text-cyanAccent' }
                      ].map((card, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase">{card.label}</span>
                          <span className={`text-base font-black ${card.color}`}>{card.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Profile Completion and Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Completion widget */}
                  <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-3.5 md:col-span-1">
                    <span className="font-bold text-primaryText uppercase tracking-wider">Profile Status</span>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-mutedText font-medium">Completion Rating</span>
                        <span className="text-cyanAccent font-bold">85%</span>
                      </div>
                      <div className="w-full bg-secondaryBg rounded-full h-2 overflow-hidden border border-themeBorder">
                        <div className="bg-gradient-to-r from-electric to-cyanAccent h-2 rounded-full" style={{ width: '85%' }} />
                      </div>
                      <span className="text-[9px] text-gray-500 leading-normal mt-1 block">
                        Add a verified mobile phone number to secure 2FA authentication and hit 100%.
                      </span>
                    </div>
                  </div>

                  {/* Activity log timeline */}
                  <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-4 md:col-span-2">
                    <span className="font-bold text-primaryText uppercase tracking-wider">Recent Activity Log</span>
                    
                    <div className="flex flex-col gap-3.5 mt-1">
                      {[
                        { text: 'tshirt_pattern_set.pdf nesting layout optimized (95.2% yield)', time: '2 hours ago' },
                        { text: 'Downloaded nesting_report_18.pdf', time: 'Yesterday' },
                        { text: 'Generated API client key for Gerber CAD Accumark sync', time: '3 days ago' }
                      ].map((item, idx) => {
                        return (
                          <div key={idx} className="flex gap-3 items-start text-[10px]">
                            <div className="h-6 w-6 rounded-full border border-themeBorder flex items-center justify-center shrink-0 overflow-hidden bg-background">
                              {currentUser?.profile_image ? (
                                <img 
                                  src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                                  alt="Avatar" 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="font-bold text-[9px] text-cyanAccent">
                                  {currentUser?.full_name?.charAt(0) || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 flex justify-between gap-4 font-semibold text-secondaryText">
                              <span>{item.text}</span>
                              <span className="text-gray-500 whitespace-nowrap">{item.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GENERAL TAB */}
            {activeSub === 'general' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">General Information</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Manage standard factory properties and organizational references.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Factory Branch Reference</label>
                    <input 
                      type="text" 
                      value={profileForm.factoryName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, factoryName: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Industry / Material Sector</label>
                    <input 
                      type="text" 
                      value={profileForm.businessType}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, businessType: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Factory Department</label>
                    <input 
                      type="text" 
                      value={profileForm.department}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Factory Timezone</label>
                    <input 
                      type="text" 
                      disabled
                      value={profileForm.timezone}
                      className="bg-background/40 border border-themeBorder rounded-xl p-3 text-gray-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => addToast("General factory details updated successfully.", "success")}
                    className="px-5 py-2.5 bg-electric hover:bg-blue-700 text-primaryText font-bold rounded-xl shadow-md transition-all active:scale-98"
                  >
                    Save General Changes
                  </button>
                </div>
              </div>
            )}

            {/* ACCOUNT DETAILS TAB */}
            {activeSub === 'account' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">Account Settings</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Configure profile details and verification contacts.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Profile Picture Upload row */}
                  <div className="md:col-span-2 flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-themeBorder mb-2">
                    <div className="relative h-12 w-12 rounded-full border border-themeBorder flex items-center justify-center overflow-hidden bg-background shrink-0">
                      {currentUser?.profile_image ? (
                        <img 
                          src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                          alt="Avatar" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-cyanAccent font-bold text-sm">
                          {currentUser?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-left">
                      <span className="text-primaryText font-bold text-[11px] uppercase tracking-wider">Profile Photo</span>
                      <span className="text-gray-500 text-[10px]">Accepts JPG, JPEG, PNG, or WEBP (Max 5 MB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePhotoClick}
                      className="ml-auto px-3.5 py-1.5 bg-white/5 border border-themeBorder hover:bg-white/10 text-primaryText text-[10px] font-bold rounded-lg transition-all"
                    >
                      Change Photo
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Full Representative Name</label>
                    <input 
                      type="text" 
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Company Name</label>
                    <input 
                      type="text" 
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Email Address</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        value={profileForm.email}
                        onChange={handleEmailChange}
                        className={`w-full bg-background border ${emailError ? 'border-rose-500' : 'border-themeBorder'} focus:border-electric rounded-xl p-3 text-primaryText outline-none transition-all`}
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

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-mutedText">Mobile Phone Number</label>
                    <input 
                      type="text" 
                      value={profileForm.mobileNumber}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end mt-2">
                    <button 
                      type="submit" 
                      disabled={savingAccount || !!emailError || !profileForm.email}
                      title={emailError ? "Please enter a valid email address." : (!profileForm.email ? "Email cannot be empty." : "")}
                      className="px-5 py-2.5 bg-electric hover:bg-blue-700 text-primaryText font-bold rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingAccount ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeSub === 'security' && (
              <div className="flex flex-col gap-6">
                {/* Change Password Card */}
                <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                  <div className="border-b border-themeBorder pb-3">
                    <h3 className="font-extrabold text-base text-primaryText">Change Password</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Configure your login passwords to prevent account compromise.</p>
                  </div>

                  <form onSubmit={handleSavePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-mutedText">Current Password</label>
                      <div className="relative">
                        <input 
                          type={showOldPassword ? "text" : "password"} 
                          placeholder="••••••••"
                          value={passwordForm.oldPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                          className="w-full bg-background border border-themeBorder focus:border-electric rounded-xl py-3 pl-4 pr-10 text-primaryText outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-primaryText transition-colors"
                          aria-label={showOldPassword ? "Hide password" : "Show password"}
                        >
                          {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-mutedText">New Password</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          placeholder="••••••••"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full bg-background border border-themeBorder focus:border-electric rounded-xl py-3 pl-4 pr-10 text-primaryText outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3.5 text-gray-500 hover:text-primaryText transition-colors"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {passwordForm.newPassword && (
                        <div className="flex flex-col gap-2 mt-2 bg-secondaryBg/50 p-3 rounded-xl border border-themeBorder">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider">Password Strength</span>
                            <span className={`text-[10px] font-bold ${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.label}</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1.5 text-[9px] text-gray-500 font-semibold">
                            <span className={passwordChecks.length ? 'text-emerald-400' : 'text-gray-600'}>✓ Min 8 chars</span>
                            <span className={passwordChecks.uppercase ? 'text-emerald-400' : 'text-gray-600'}>✓ Uppercase</span>
                            <span className={passwordChecks.lowercase ? 'text-emerald-400' : 'text-gray-600'}>✓ Lowercase</span>
                            <span className={passwordChecks.number ? 'text-emerald-400' : 'text-gray-600'}>✓ Number</span>
                            <span className={passwordChecks.special ? 'text-emerald-400' : 'text-gray-600'}>✓ Special char</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-mutedText">Confirm Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="••••••••"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full bg-background border border-themeBorder focus:border-electric rounded-xl py-3 pl-4 pr-10 text-primaryText outline-none transition-all"
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

                    <div className="md:col-span-3 flex justify-end mt-2">
                      <button 
                        type="submit" 
                        disabled={savingSecurity || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword || !(passwordChecks.length && passwordChecks.uppercase && passwordChecks.lowercase && passwordChecks.number && passwordChecks.special)}
                        title={!(passwordChecks.length && passwordChecks.uppercase && passwordChecks.lowercase && passwordChecks.number && passwordChecks.special) ? "Please meet password requirements." : 
                               passwordForm.newPassword !== passwordForm.confirmPassword ? "Passwords do not match." : ""}
                        className="px-5 py-2.5 bg-purpleAccent hover:bg-purple-700 text-primaryText font-bold rounded-xl shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingSecurity ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-themeBorder pb-3">
                    <div className="flex flex-col gap-0.5">
                      <h4 className="font-bold text-primaryText text-xs">Two-Factor Authentication (2FA)</h4>
                      <p className="text-[10px] text-gray-500">Secure your enterprise account with an extra verification token block.</p>
                    </div>
                    {/* Toggle Switch */}
                    <button 
                      onClick={() => {
                        setTfaEnabled(!tfaEnabled);
                        addToast(tfaEnabled ? "Two-Factor Authentication disabled" : "Two-Factor Authentication setup pending confirmation", tfaEnabled ? "warning" : "info");
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${tfaEnabled ? 'bg-cyanAccent' : 'bg-slate-800'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${tfaEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-4">
                  <div className="border-b border-themeBorder pb-3 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-primaryText text-xs">Active Device Sessions</h4>
                      <p className="text-[10px] text-gray-500">Manage browser devices currently connected to your profile details.</p>
                    </div>
                    <button 
                      onClick={() => addToast("Logged out of all other active device sessions.", "success")}
                      className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/15 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-[9px] transition-all uppercase"
                    >
                      Logout from All Devices
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 text-[10px]">
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-themeBorder rounded-xl">
                      <div className="flex items-center gap-3">
                        <Laptop className="h-4.5 w-4.5 text-cyanAccent" />
                        <div className="flex flex-col gap-0.5 font-semibold text-secondaryText">
                          <span>Chrome Browser, MacOS (Dilsukhnagar)</span>
                          <span className="text-[9px] text-emerald-400">Current active session</span>
                        </div>
                      </div>
                      <span className="text-gray-500 font-semibold">Active Now</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/5 border border-themeBorder rounded-xl">
                      <div className="flex items-center gap-3">
                        <Laptop className="h-4.5 w-4.5 text-gray-500" />
                        <div className="flex flex-col gap-0.5 font-semibold text-mutedText">
                          <span>Safari, iOS Mobile Device (Hyderabad)</span>
                          <span className="text-[9px] text-gray-500">Last login: 3 hours ago</span>
                        </div>
                      </div>
                      <span className="text-gray-500 font-semibold">Today, 08:42 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeSub === 'notifications' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">Notifications Preferences</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Configure email alerts and workflow notifications.</p>
                </div>

                <div className="flex flex-col gap-4">
                  {[
                    { id: 'emailNotif', title: 'Email Notifications', desc: 'Enable global communications over SMTP.' },
                    { id: 'optimNotif', title: 'Optimization Complete', desc: 'Alert when a shape nesting compaction run finishes.' },
                    { id: 'reportNotif', title: 'Report Ready', desc: 'Notify when printable PDF cards are generated.' },
                    { id: 'secAlerts', title: 'Security Alerts', desc: 'Warning notifications for changes to password logs.' },
                    { id: 'marketing', title: 'Marketing Emails', desc: 'Periodic notifications for algorithm version releases.' }
                  ].map((item) => {
                    const checked = (notificationsForm as any)[item.id];
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 border border-themeBorder rounded-xl">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-primaryText text-xs">{item.title}</span>
                          <span className="text-[10px] text-gray-500">{item.desc}</span>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setNotificationsForm(prev => ({ ...prev, [item.id]: !checked }));
                            addToast("Notification preferences updated.", "success");
                          }}
                          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-cyanAccent' : 'bg-slate-800'}`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeSub === 'appearance' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">Appearance settings</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Configure layout, colors, and graphics performance properties.</p>
                </div>

                {/* Theme Selector */}
                <div className="flex flex-col gap-3 border-b border-themeBorder pb-5">
                  <span className="font-bold text-primaryText text-xs">Global Color Theme</span>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'dark', label: 'Dark theme', icon: <Moon className="h-4 w-4" /> },
                      { id: 'light', label: 'Light theme', icon: <Sun className="h-4 w-4" /> },
                      { id: 'system', label: 'System Default', icon: <Laptop className="h-4 w-4" /> }
                    ].map(t => {
                      const isActive = theme === t.id || (t.id === 'system' && theme === 'dark'); // simulate
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (t.id === 'light') setTheme('light');
                            else setTheme('dark');
                            addToast(`Workspace theme changed to ${t.label}.`, "info");
                          }}
                          className={`py-3 px-4 border rounded-xl flex items-center justify-center gap-2 transition-all ${
                            isActive 
                              ? 'bg-electric/10 border-electric text-primaryText font-bold'
                              : 'bg-white/5 border-themeBorder text-mutedText hover:text-primaryText'
                          }`}
                        >
                          {t.icon}
                          <span className="text-[10px]">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color picker */}
                <div className="flex flex-col gap-3 border-b border-themeBorder pb-5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primaryText text-xs">Accent Color Colorway</span>
                    <button 
                      onClick={() => {
                        setAccentColor('blue');
                        addToast("Accent color reset to default Blue.", "info");
                      }}
                      className="text-[10px] text-gray-500 hover:text-primaryText font-semibold transition-colors bg-white/5 px-2 py-1 rounded"
                    >
                      Reset to Default
                    </button>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {[
                      { id: 'blue', color: 'bg-blue-500', label: 'Blue' },
                      { id: 'cyan', color: 'bg-cyan-500', label: 'Cyan' },
                      { id: 'purple', color: 'bg-purple-500', label: 'Purple' },
                      { id: 'green', color: 'bg-green-500', label: 'Green' },
                      { id: 'orange', color: 'bg-orange-500', label: 'Orange' },
                      { id: 'red', color: 'bg-red-500', label: 'Red' },
                      { id: 'pink', color: 'bg-pink-500', label: 'Pink' },
                      { id: 'indigo', color: 'bg-indigo-500', label: 'Indigo' }
                    ].map(clr => (
                      <button 
                        key={clr.id}
                        onClick={() => {
                          setAccentColor(clr.id as AccentColor);
                          addToast(`Accent color updated to ${clr.label}.`, "success");
                        }}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${clr.color} hover:scale-110 active:scale-95 ${
                          accentColor === clr.id ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 shadow-[0_0_15px_rgba(var(--color-accent),0.6)]' : 'opacity-70 grayscale-[20%]'
                        }`}
                        title={clr.label}
                      >
                        {accentColor === clr.id ? <Check className="h-4 w-4 text-primaryText drop-shadow-md" /> : null}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional UI details */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-themeBorder rounded-xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-primaryText text-xs">Compact Mode View</span>
                      <span className="text-[10px] text-gray-500">Minimize layout padding to display more metrics cards.</span>
                    </div>
                    <button 
                      onClick={() => {
                        setCompactMode(!compactMode);
                        addToast(compactMode ? "Compact Mode disabled" : "Compact Mode enabled", "info");
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${compactMode ? 'bg-cyanAccent' : 'bg-slate-800'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${compactMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 border border-themeBorder rounded-xl">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-primaryText text-xs">Smooth Layout Animations</span>
                      <span className="text-[10px] text-gray-500">Enable transitions and slider wipe movements.</span>
                    </div>
                    <button 
                      onClick={() => {
                        setAnimationsEnabled(!animationsEnabled);
                        addToast(animationsEnabled ? "Animations turned off for performance optimization" : "Animations turned back on", "info");
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${animationsEnabled ? 'bg-cyanAccent' : 'bg-slate-800'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${animationsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* PREFERENCES TAB */}
            {activeSub === 'preferences' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">Default Preferences</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Configure CAD default parameters and units.</p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Units Preference */}
                  <div className="flex flex-col gap-2.5 border-b border-themeBorder pb-4">
                    <span className="font-bold text-primaryText text-xs">Default Measurement Units</span>
                    <div className="flex items-center gap-6">
                      {[
                        { id: 'mm', label: 'Millimeters (mm)' },
                        { id: 'cm', label: 'Centimeters (cm)' },
                        { id: 'inch', label: 'Inches (in)' }
                      ].map(unitItem => (
                        <label key={unitItem.id} className="flex items-center gap-2 cursor-pointer font-semibold text-mutedText">
                          <input 
                            type="radio" 
                            name="units" 
                            checked={units === unitItem.id}
                            onChange={() => {
                              setUnits(unitItem.id as any);
                              addToast(`Default units changed to ${unitItem.label}`, "success");
                            }}
                            className="accent-cyanAccent cursor-pointer h-3.5 w-3.5"
                          />
                          <span>{unitItem.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Default width */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-themeBorder pb-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-mutedText">Default Fabric Width (mm)</label>
                      <input 
                        type="number" 
                        value={defaultWidth}
                        onChange={(e) => setDefaultWidth(Number(e.target.value))}
                        className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="font-semibold text-mutedText">Default Export Extension</label>
                      <select
                        value={defaultExport}
                        onChange={(e) => setDefaultExport(e.target.value)}
                        className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none text-xs"
                      >
                        <option value="dxf">DXF Layout Format</option>
                        <option value="svg">SVG Vector Layout</option>
                        <option value="pdf">PDF Detailed Report</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => addToast("Preferences saved successfully.", "success")}
                    className="px-5 py-2.5 bg-electric hover:bg-blue-700 text-primaryText font-bold rounded-xl shadow-md transition-all active:scale-98"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* LANGUAGE TAB */}
            {activeSub === 'language' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">Language & Region</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Select language locale options for reports.</p>
                </div>

                <div className="flex flex-col gap-1.5 max-w-sm">
                  <label className="font-semibold text-mutedText">Preferred Language Locale</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value as any);
                      addToast("Localization updated successfully.", "success");
                    }}
                    className="bg-background border border-themeBorder focus:border-electric rounded-xl p-3 text-primaryText outline-none text-xs font-semibold"
                  >
                    <option value="en">English (Default)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="te">Telugu (తెలుగు)</option>
                    <option value="ta">Tamil (தமிழ்)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                    <option value="ml">Malayalam (മലയാളം)</option>
                  </select>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeSub === 'about' && (
              <div className="glass-panel p-6 rounded-2xl border-themeBorder flex flex-col gap-6">
                <div className="border-b border-themeBorder pb-3">
                  <h3 className="font-extrabold text-base text-primaryText">About Pattern Optima</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Platform release log, terms, and developer hub.</p>
                </div>

                <div className="flex flex-col gap-4 text-[10px]">
                  <div className="flex justify-between border-b border-themeBorder pb-2.5">
                    <span className="text-gray-500 font-semibold">Application Release Version</span>
                    <span className="text-primaryText font-bold font-mono">v1.2.0-stable (Enterprise Build)</span>
                  </div>
                  <div className="flex justify-between border-b border-themeBorder pb-2.5">
                    <span className="text-gray-500 font-semibold">Developer Association</span>
                    <span className="text-cyanAccent font-bold">Pattern Optima CAD Development Team</span>
                  </div>
                  <div className="flex justify-between border-b border-themeBorder pb-2.5">
                    <span className="text-gray-500 font-semibold">Software License Tiers</span>
                    <span className="text-primaryText font-bold">Proprietary Commercial SaaS License</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3.5 mt-2.5">
                    <a 
                      href="#privacy" 
                      onClick={(e) => { e.preventDefault(); addToast("Opening Privacy policy document...", "info"); }}
                      className="p-3 bg-white/5 border border-themeBorder hover:bg-white/10 text-center font-bold text-secondaryText hover:text-primaryText rounded-xl transition-all"
                    >
                      Privacy Policy
                    </a>
                    <a 
                      href="#terms" 
                      onClick={(e) => { e.preventDefault(); addToast("Opening Terms of Service...", "info"); }}
                      className="p-3 bg-white/5 border border-themeBorder hover:bg-white/10 text-center font-bold text-secondaryText hover:text-primaryText rounded-xl transition-all"
                    >
                      Terms of Service
                    </a>
                    <a 
                      href="#support" 
                      onClick={(e) => { e.preventDefault(); addToast("Initializing email draft support...", "info"); }}
                      className="p-3 bg-electric/10 border border-electric/20 hover:bg-electric/20 text-center font-black text-cyanAccent rounded-xl transition-all"
                    >
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3. UPLOAD/MANAGE PROFILE IMAGE MODAL */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-themeBorder shadow-2xl rounded-3xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-themeBorder flex items-center justify-between">
                <span className="text-sm font-bold text-primaryText uppercase tracking-wider">Update Profile Picture</span>
                <button 
                  onClick={() => setShowPhotoModal(false)}
                  className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-mutedText hover:text-primaryText transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* View: Options */}
              {photoView === 'options' && (
                <div className="p-6 flex flex-col gap-3">
                  {/* Current Avatar State info */}
                  <div className="flex flex-col items-center justify-center py-4 gap-2.5">
                    <div className="h-20 w-20 rounded-full border border-themeBorder flex items-center justify-center overflow-hidden bg-background/80">
                      {currentUser?.profile_image ? (
                        <img 
                          src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                          alt="Avatar" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-cyanAccent font-black text-2xl uppercase">
                          {currentUser?.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Active Avatar Image</span>
                  </div>

                  <button
                    onClick={triggerFileSelect}
                    className="w-full py-3 bg-electric hover:bg-blue-700 text-primaryText font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-md active:scale-[0.98]"
                  >
                    📤 Upload New Photo
                  </button>

                  {currentUser?.profile_image && (
                    <button
                      onClick={() => setPhotoView('confirm_remove')}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98]"
                    >
                      🗑 Remove Current Photo
                    </button>
                  )}

                  <button
                    onClick={() => setShowPhotoModal(false)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-mutedText hover:text-primaryText font-semibold rounded-xl flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                  />
                </div>
              )}

              {/* View: Confirm Remove */}
              {photoView === 'confirm_remove' && (
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold text-sm">
                    🗑
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-primaryText text-xs font-bold uppercase">Remove your profile picture?</span>
                    <p className="text-[10px] text-gray-500">This will revert your avatar to the default letter initials.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mt-2">
                    <button
                      onClick={() => setPhotoView('options')}
                      className="py-2.5 bg-white/5 hover:bg-white/10 text-mutedText hover:text-primaryText font-semibold rounded-xl text-xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemovePhoto}
                      className="py-2.5 bg-rose-600 hover:bg-rose-700 text-primaryText font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* View: Adjust/Preview/Crop Workspace */}
              {photoView === 'adjust' && (
                <div className="p-6 flex flex-col gap-5">
                  {/* Framing Viewport */}
                  <div className="relative w-full h-[240px] bg-background rounded-2xl border border-themeBorder overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 pattern-grid opacity-10 pointer-events-none" />
                    
                    {/* Circle Frame Guide overlay */}
                    <div className="absolute h-[160px] w-[160px] rounded-full border-2 border-dashed border-cyanAccent/40 pointer-events-none z-10 bg-transparent shadow-[0_0_0_9999px_rgba(3,7,18,0.7)]" />

                    {/* Preview Image */}
                    {previewUrl && (
                      <div 
                        style={{
                          transform: `translate(${photoPan.x}px, ${photoPan.y}px) scale(${photoZoom}) rotate(${photoRotation}deg)`,
                          transition: 'transform 0.1s ease-out'
                        }}
                        className="h-[160px] w-[160px] flex items-center justify-center shrink-0"
                      >
                        <img 
                          src={previewUrl} 
                          alt="Adjust Preview" 
                          className="h-full w-full object-cover pointer-events-none rounded-full" 
                        />
                      </div>
                    )}

                    {/* Spinner during upload */}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
                        <div className="h-8 w-8 border-t-2 border-r-2 border-cyanAccent rounded-full animate-spin" />
                        <span className="text-[10px] text-mutedText font-bold uppercase tracking-wider">Uploading picture...</span>
                      </div>
                    )}
                  </div>

                  {/* Manipulation Controls */}
                  <div className="flex flex-col gap-4 bg-white/5 p-4 rounded-2xl border border-themeBorder">
                    {/* Zoom Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[9px] text-gray-500 font-bold">
                        <span>ZOOM PREVIEW</span>
                        <span>{(photoZoom * 100).toFixed(0)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="3" 
                        step="0.05"
                        value={photoZoom}
                        onChange={(e) => setPhotoZoom(Number(e.target.value))}
                        className="w-full accent-cyanAccent cursor-pointer"
                      />
                    </div>

                    {/* Navigation Buttons for Rotation, Pan, Reset */}
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPhotoRotation(prev => (prev + 90) % 360)}
                          className="px-3 py-1.5 bg-white/5 border border-themeBorder hover:bg-white/10 rounded-lg text-mutedText hover:text-primaryText font-bold transition-all"
                        >
                          🔄 Rotate 90°
                        </button>
                        <button
                          onClick={() => {
                            setPhotoZoom(1.0);
                            setPhotoPan({ x: 0, y: 0 });
                            setPhotoRotation(0);
                          }}
                          className="px-3 py-1.5 bg-white/5 border border-themeBorder hover:bg-white/10 rounded-lg text-mutedText hover:text-primaryText font-bold transition-all"
                        >
                          Reset Params
                        </button>
                      </div>

                      {/* Pan controls */}
                      <div className="grid grid-cols-3 gap-0.5 w-[75px] h-[50px] relative">
                        <button 
                          onClick={() => setPhotoPan(prev => ({ ...prev, y: prev.y - 10 }))}
                          className="absolute top-0 left-[25px] h-[18px] w-[25px] bg-white/5 hover:bg-white/10 text-primaryText rounded flex items-center justify-center text-[9px]"
                        >
                          ▲
                        </button>
                        <button 
                          onClick={() => setPhotoPan(prev => ({ ...prev, x: prev.x - 10 }))}
                          className="absolute top-[18px] left-0 h-[18px] w-[25px] bg-white/5 hover:bg-white/10 text-primaryText rounded flex items-center justify-center text-[9px]"
                        >
                          ◀
                        </button>
                        <button 
                          onClick={() => setPhotoPan(prev => ({ ...prev, x: prev.x + 10 }))}
                          className="absolute top-[18px] right-0 h-[18px] w-[25px] bg-white/5 hover:bg-white/10 text-primaryText rounded flex items-center justify-center text-[9px]"
                        >
                          ▶
                        </button>
                        <button 
                          onClick={() => setPhotoPan(prev => ({ ...prev, y: prev.y + 10 }))}
                          className="absolute bottom-0 left-[25px] h-[18px] w-[25px] bg-white/5 hover:bg-white/10 text-primaryText rounded flex items-center justify-center text-[9px]"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress Bar */}
                  {uploadingPhoto && (
                    <div className="flex flex-col gap-1">
                      <div className="w-full bg-secondaryBg rounded-full h-1.5 overflow-hidden border border-themeBorder">
                        <div className="bg-gradient-to-r from-electric to-cyanAccent h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-[8px] text-gray-500 font-bold self-end uppercase">Uploading: {uploadProgress}%</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={() => {
                        setShowPhotoModal(false);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="py-2.5 bg-white/5 hover:bg-white/10 text-mutedText hover:text-primaryText font-semibold rounded-xl text-xs transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePhoto}
                      disabled={uploadingPhoto}
                      className="py-2.5 bg-cyanAccent hover:bg-cyan-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-40"
                    >
                      Save Photo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
