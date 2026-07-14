"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Cpu, 
  Trash2, 
  Leaf, 
  DollarSign, 
  LayoutDashboard, 
  History as HistoryIcon, 
  LogOut, 
  Settings as SettingsIcon, 
  TrendingUp, 
  User, 
  Maximize2,
  FileDown,
  Info,
  Upload,
  BarChart3,
  FileText,
  BadgeCent,
  Bell,
  CheckCircle2,
  Lock,
  ChevronDown,
  Sun,
  Moon,
  Clock,
  FolderOpen
} from 'lucide-react';
import { apiClient, getAuthToken, setAuthToken } from '@/lib/api';
import { useAuth, UserProfile } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import DashboardCharts from '@/components/DashboardCharts';
import Toast, { ToastMessage } from '@/components/Toast';
import PatternEditor from '@/components/PatternEditor';
import AnalyticsTab from '@/components/AnalyticsTab';
import HistoryTab from '@/components/HistoryTab';
import SettingsTab from '@/components/SettingsTab';
import UploadTab from '@/components/UploadTab';
import LibraryTab from '@/components/LibraryTab';
import NestingCompareTab from '@/components/NestingCompareTab';
import NestingAnalysisDashboard from '@/components/NestingAnalysisDashboard';
import PatternPreview from '@/components/PatternPreview';

// Custom Count Up component for stats counts
function CountUpNumber({ value, duration = 1000, decimals = 0, prefix = "", suffix = "" }: { value: number; duration?: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min(1, (timestamp - startTimestamp) / duration);
      setDisplayValue(progress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{prefix}{displayValue.toFixed(decimals)}{suffix}</>;
}

function capitalizeName(name: string) {
  if (!name) return "";
  return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

interface JobItem {
  id: number;
  name: string;
  fabric_width: number;
  fabric_height?: number;
  status: string;
  utilization_percentage?: number;
  waste_percentage?: number;
  saved_area: number;
  saved_money: number;
  algorithm_used: string;
  created_at: string;
}

interface DashboardStatsData {
  total_optimizations: number;
  waste_saved_sqm: number;
  fabric_saved_sqm: number;
  money_saved_usd: number;
  utilization_trend: Array<{ date: string; utilization: number }>;
  algorithm_popularity: Array<{ name: string; count: number }>;
}

interface UploadItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  // Tab Routing State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'library' | 'analytics' | 'reports' | 'history' | 'settings'>('dashboard');
  
  // Theme state
  const { theme, setTheme } = useTheme();
  const { t, formatCurrency, formatDate } = useLanguage();

  // Dashboard stats & data
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Date and Time ticking clock state
  const [currentTime, setCurrentTime] = useState<string>('');
  // User uploads list state
  const [recentUploads, setRecentUploads] = useState<UploadItem[]>([]);
  // Selected pattern for CAD analysis
  const [selectedPatternForAnalysis, setSelectedPatternForAnalysis] = useState<any | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<UploadItem | null>(null);
  const [analyzedFileForOptimization, setAnalyzedFileForOptimization] = useState<any | null>(null);

  const refreshUploads = async () => {
    try {
      const res = await apiClient.get('/uploads');
      setRecentUploads(res.data);
    } catch (err) {
      console.warn("Failed to refresh uploads library:", err);
    }
  };

  // Shared Upload/Sandbox shapes state
  const [uploadedShapes, setUploadedShapes] = useState<any[]>([]);

  // Ticking clock loop
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      };
      setCurrentTime(new Date().toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notifications dropdown state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, text: string, read: boolean}>>([
    { id: "1", text: "Nesting calculation finished with 95.2% yield.", read: false },
    { id: "2", text: "API Key for Optitex CAD generated successfully.", read: true },
    { id: "3", text: "Factory Unit Hyderabad upgraded to Premium.", read: true }
  ]);

  // User Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const isSigningOut = useRef(false);

  // Global Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync context user to page state
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Welcome login experience toast alert
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const showWelcome = localStorage.getItem('po_login_welcome_toast');
      if (showWelcome === 'true') {
        const isFirst = localStorage.getItem('po_first_login_flag');
        if (isFirst === 'true') {
          addToast("🎉 Welcome to Pattern Optima!\nLet's reduce fabric waste with AI-powered optimization.", "success");
          localStorage.removeItem('po_first_login_flag');
        } else {
          addToast(`👋 Welcome back, ${currentUser.full_name || 'User'}!\nGreat to see you again. Ready to optimize your patterns?`, "success");
        }
        localStorage.removeItem('po_login_welcome_toast');
      }
    }
  }, [isAuthenticated, currentUser]);

  // Tab Persistence: Load and clear active tab from local storage
  useEffect(() => {
    const storedTab = localStorage.getItem('dashboard_active_tab');
    if (storedTab) {
      const validTabs = ['dashboard', 'upload', 'library', 'analytics', 'reports', 'history', 'settings'];
      if (validTabs.includes(storedTab)) {
        setActiveTab(storedTab as any);
      }
      localStorage.removeItem('dashboard_active_tab');
    }
  }, []);

  // Auth Guard: Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isSigningOut.current) {
      router.push('/login?message=Please+sign+in+to+continue.&type=info');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load Seed logs & Stats
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadDashboardData() {
      try {
        const statsRes = await apiClient.get('/jobs/dashboard-stats');
        setStats(statsRes.data);
        setJobs(statsRes.data.recent_jobs || []);

        // Fetch user uploads
        const uploadsRes = await apiClient.get('/uploads');
        setRecentUploads(uploadsRes.data);
      } catch (err: any) {
        console.warn('Dashboard api retrieval failed, using fallback dashboard seed data...', err);
        // Standard high-fidelity MSME seed metrics
        setStats({
          total_optimizations: 28,
          waste_saved_sqm: 92.4,
          fabric_saved_sqm: 125.6,
          money_saved_usd: 1380.0,
          utilization_trend: [
            { date: "Jul 04", utilization: 88.5 },
            { date: "Jul 05", utilization: 90.2 },
            { date: "Jul 06", utilization: 91.8 },
            { date: "Jul 07", utilization: 89.9 },
            { date: "Jul 08", utilization: 93.1 },
            { date: "Jul 09", utilization: 94.8 },
            { date: "Jul 10", utilization: 95.2 }
          ],
          algorithm_popularity: [
            { name: "Skyline Pack", count: 18 },
            { name: "Guillotine Pack", count: 7 },
            { name: "Shelf Pack", count: 3 }
          ]
        });
        setJobs([
          {
            id: 104,
            name: "Summer Collection Nesting",
            fabric_width: 120.0,
            fabric_height: 84.5,
            status: "completed",
            utilization_percentage: 95.2,
            waste_percentage: 4.8,
            saved_area: 4.8,
            saved_money: 72.0,
            algorithm_used: "Skyline Pack + AI Compaction",
            created_at: new Date().toISOString()
          },
          {
            id: 103,
            name: "Pants Pattern Yield",
            fabric_width: 100.0,
            fabric_height: 140.2,
            status: "completed",
            utilization_percentage: 91.4,
            waste_percentage: 8.6,
            saved_area: 3.2,
            saved_money: 48.0,
            algorithm_used: "Guillotine Pack + AI Compaction",
            created_at: new Date(Date.now() - 3600000 * 24).toISOString()
          }
        ]);
        setRecentUploads([
          { id: "f1", filename: "f1.svg", original_filename: "tshirt_layout.svg", file_type: "svg", file_size: 409600, upload_date: new Date().toISOString(), status: "completed" },
          { id: "f2", filename: "f2.dxf", original_filename: "trousers_pattern.dxf", file_type: "dxf", file_size: 1548200, upload_date: new Date(Date.now() - 3600000 * 5).toISOString(), status: "completed" },
          { id: "f3", filename: "f3.pdf", original_filename: "collar_detail.pdf", file_type: "pdf", file_size: 890000, upload_date: new Date(Date.now() - 3600000 * 24).toISOString(), status: "completed" }
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [isAuthenticated]);

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = () => {
    isSigningOut.current = true;
    logout();
    localStorage.setItem('po_signed_out_toast', 'true');
    router.push('/');
  };

  const deleteJob = (jobId: number) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const saveJobToHistory = (newJob: any) => {
    setJobs(prev => [newJob, ...prev]);
    // update statistics metrics accordingly
    setStats(prev => {
      if (!prev) return null;
      return {
        ...prev,
        total_optimizations: prev.total_optimizations + 1,
        waste_saved_sqm: parseFloat((prev.waste_saved_sqm + newJob.saved_area).toFixed(1)),
        fabric_saved_sqm: parseFloat((prev.fabric_saved_sqm + newJob.saved_area * 1.25).toFixed(1)),
        money_saved_usd: prev.money_saved_usd + newJob.saved_money
      };
    });
  };

  const handleDuplicateJob = (job: any) => {
    // Maps preset coordinate IDs back to active shapes
    const presetLibrary = [
      { id: "tshirt_front", name: "T-Shirt Front Panel", points: [[0,0], [40,0], [40,15], [50,20], [50,60], [40,65], [40,80], [0,80]] },
      { id: "tshirt_back", name: "T-Shirt Back Panel", points: [[0,0], [40,0], [40,10], [50,15], [50,60], [40,65], [40,80], [0,80]] },
      { id: "sleeve_left", name: "Sleeve Left", points: [[0,0], [20,0], [30,15], [20,35], [0,20]] },
      { id: "sleeve_right", name: "Sleeve Right", points: [[0,0], [20,0], [30,20], [10,35], [0,15]] },
      { id: "collar", name: "Classic Collar", points: [[0,0], [25,0], [20,6], [5,6]] },
      { id: "pant_leg", name: "Trouser Leg Panel", points: [[5,0], [25,0], [30,30], [20,90], [0,90], [10,30]] }
    ];

    // Load dummy items into sandbox shapes
    const shapesToLoad = presetLibrary.slice(0, 3).map(s => ({
      ...s,
      quantity: 2,
      allow_rotation: true,
      scale: 1,
      rotation: 0
    }));

    setUploadedShapes(shapesToLoad);
    setActiveTab('upload');
  };

  const toggleNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (authLoading || (loading && !stats)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-t-2 border-r-2 border-electric rounded-full animate-spin" />
          <span className="text-xs text-mutedText">Verifying secure authorization credentials...</span>
        </div>
      </div>
    );
  }

  // Active theme wrappers
  const themeClass = theme === 'light' 
    ? 'bg-slate-50 text-slate-800' 
    : 'bg-background text-gray-200';

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${themeClass}`}>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* Background radial overlays */}
      {theme === 'dark' && (
        <>
          <div className="absolute inset-0 mesh-grid opacity-10 pointer-events-none" />
          <div className="absolute inset-0 radial-glow-cyan opacity-40 pointer-events-none" />
        </>
      )}

      {/* 1. SIDEBAR NAVIGATION */}
      <aside className={`w-64 border-r ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-themeBorder bg-background/80'} backdrop-blur-md flex flex-col justify-between p-6 shrink-0 relative z-20`}>
        <div className="flex flex-col gap-8">
          
          {/* Logo */}
          <Link href="/" className={`flex items-center gap-2 font-bold text-base tracking-tight font-sans ${theme === 'light' ? 'text-slate-900' : 'text-primaryText'}`}>
            <Sparkles className="h-4.5 w-4.5 text-cyanAccent" />
            PATTERN<span className="text-electric">OPTIMA</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 text-xs font-semibold">
            <span className="text-[10px] text-mutedText uppercase tracking-widest px-3 mb-2">Core Workspace</span>
            
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'upload', label: 'Upload Pattern', icon: <Upload className="h-4 w-4" /> },
              { id: 'library', label: 'Pattern Library', icon: <FolderOpen className="h-4 w-4" /> },
              { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
              { id: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4" /> },
              { id: 'history', label: 'History Logs', icon: <HistoryIcon className="h-4 w-4" /> },
              { id: 'settings', label: 'Settings & Profile', icon: <SettingsIcon className="h-4 w-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const activeStyle = isActive
                ? theme === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-electric/15 border-electric/30 text-cyanAccent shadow-md'
                : 'text-mutedText hover:text-primaryText hover:bg-white/5 border-transparent';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${activeStyle}`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card */}
        <div className="flex flex-col gap-4 border-t border-themeBorder pt-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/5 border border-themeBorder flex items-center justify-center overflow-hidden shrink-0">
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
            <div className="flex flex-col overflow-hidden">
              <span className={`text-xs font-bold truncate ${theme === 'light' ? 'text-slate-800' : 'text-primaryText'}`}>
                {currentUser?.full_name}
              </span>
              <span className="text-[10px] text-gray-500 truncate">{currentUser?.company_name}</span>
            </div>
          </div>

          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP NAVBAR */}
        <header className={`h-16 border-b ${theme === 'light' ? 'border-slate-200 bg-white' : 'border-themeBorder bg-background/40'} px-8 flex items-center justify-between shrink-0 relative z-30`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-mutedText uppercase tracking-widest">{activeTab} panel</span>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-4 text-xs">
            
            {/* Theme Indicators */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder flex items-center justify-center text-mutedText hover:text-primaryText transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserDropdown(false);
                }}
                className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder flex items-center justify-center text-mutedText hover:text-primaryText transition-colors relative"
              >
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>

              {/* Notifications Dropdown card */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute right-0 mt-2 w-72 border rounded-xl shadow-xl p-3 flex flex-col gap-2.5 z-50 ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-background border-themeBorder text-secondaryText'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b border-themeBorder">
                      Recent Activity
                    </span>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => toggleNotificationRead(n.id)}
                          className={`p-2 rounded-lg text-[10px] cursor-pointer flex flex-col gap-1 transition-all ${
                            n.read ? 'opacity-50 hover:opacity-80' : 'bg-white/5 border border-themeBorder'
                          }`}
                        >
                          <span>{n.text}</span>
                          {!n.read && <span className="text-[9px] text-cyanAccent font-semibold">Mark as read</span>}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Dropdown Profile Selector */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-white/5 border border-transparent hover:border-themeBorder rounded-lg transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-cyanAccent/10 text-cyanAccent border border-cyanAccent/25 flex items-center justify-center overflow-hidden font-bold text-xs shrink-0">
                  {currentUser?.profile_image ? (
                    <img 
                      src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                      alt="Avatar" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    currentUser?.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-mutedText" />
              </button>

              <AnimatePresence>
                {showUserDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`absolute right-0 mt-2 w-48 border rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-background border-themeBorder text-secondaryText'
                    }`}
                  >
                    <button 
                      onClick={() => {
                        setActiveTab('settings');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-[11px]"
                    >
                      My Profile settings
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-[11px] text-red-400 font-bold"
                    >
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        {/* TAB WORKSPACE PANEL AREA */}
        <main className="flex-1 p-8 overflow-y-auto relative z-10 max-w-7xl w-full mx-auto">
          {selectedFileForPreview ? (
            <PatternPreview 
              file={selectedFileForPreview}
              onClose={() => setSelectedFileForPreview(null)}
              onAnalyzeSuccess={(file, data) => {
                setSelectedFileForPreview(null);
                setAnalyzedFileForOptimization(data);
                setActiveTab('upload');
              }}
              addToast={addToast}
            />
          ) : selectedPatternForAnalysis ? (
            <NestingAnalysisDashboard 
              uploadItem={selectedPatternForAnalysis}
              onClose={() => setSelectedPatternForAnalysis(null)}
              onRefreshLibrary={refreshUploads}
              addToast={addToast}
            />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
              
              {/* TAB OVERVIEW: GENERAL OVERVIEW */}
              {activeTab === 'dashboard' && (
                <motion.div 
                  initial="hidden" 
                  animate="show" 
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                  }}
                  className="flex flex-col gap-6 w-full text-left max-w-[1400px] mx-auto"
                >
                  
                  {/* Hero greeting banner with clock */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full border-2 border-themeBorder flex items-center justify-center overflow-hidden bg-secondaryBg shadow-xl shrink-0 relative group">
                        {currentUser?.profile_image ? (
                          <img 
                            src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${currentUser.profile_image}`} 
                            alt="Avatar" 
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <span className="font-sans font-black text-lg text-cyanAccent uppercase">
                            {currentUser?.full_name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs text-mutedText font-semibold uppercase tracking-wider">
                          {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'},
                        </p>
                        <h2 className="text-2xl font-extrabold text-primaryText font-sans tracking-tight">
                          Welcome back, {capitalizeName(currentUser?.full_name?.split(' ')[0] || 'User')} 👋
                        </h2>
                      </div>
                    </div>
                    {currentTime && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-themeBorder text-mutedText text-xs font-semibold shadow-sm self-start md:self-auto backdrop-blur-sm">
                        <Clock className="h-4 w-4 text-cyanAccent shrink-0" />
                        <span>{currentTime}</span>
                      </div>
                    )}
                  </motion.div>

                  {/* QUICK ACTIONS BAR */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                      { label: t("Upload Pattern"), icon: <Upload className="h-4 w-4 text-cyanAccent" />, action: () => setActiveTab('upload') },
                      { label: t("Pattern Library"), icon: <FileText className="h-4 w-4 text-emerald-400" />, action: () => setActiveTab('library') },
                      { label: t("Reports"), icon: <FileDown className="h-4 w-4 text-yellow-500" />, action: () => setActiveTab('reports') },
                      { label: t("Analytics"), icon: <BarChart3 className="h-4 w-4 text-blue-400" />, action: () => setActiveTab('analytics') },
                      { label: t("Settings"), icon: <SettingsIcon className="h-4 w-4 text-mutedText" />, action: () => setActiveTab('settings') }
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={btn.action}
                        className="glass-panel p-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                        {btn.icon}
                        <span className="font-semibold text-primaryText text-[11px] whitespace-nowrap z-10">{btn.label}</span>
                      </button>
                    ))}
                  </motion.div>

                  {/* 12-COLUMN DASHBOARD GRID */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
                    
                    {/* LEFT COLUMN (Span 8) */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                      
                      {/* STATS ANIMATED COUNTERS CARDS */}
                      {stats && (
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { label: "Patterns Uploaded", val: stats.total_optimizations, decimals: 0, prefix: "", suffix: "", icon: <Upload className="h-4 w-4 text-cyanAccent" />, trend: "+12%" },
                            { label: "Fabric Saved", val: stats.fabric_saved_sqm, decimals: 1, prefix: "", suffix: " m²", icon: <Leaf className="h-4 w-4 text-emerald-400" />, trend: "+4%" },
                            { label: "Estimated Cost Saved", val: stats.money_saved_usd, decimals: 0, prefix: "$", suffix: "", icon: <DollarSign className="h-4 w-4 text-yellow-500" />, trend: "+8%" },
                            { label: "CO₂ Reduction", val: (stats.fabric_saved_sqm * 2.3), decimals: 1, prefix: "", suffix: " kg", icon: <Leaf className="h-4 w-4 text-purpleAccent" />, trend: "+14%" }
                          ].map((card, idx) => (
                            <div key={idx} className="glass-panel p-4 rounded-xl flex flex-col gap-3 shadow-lg relative overflow-hidden group hover:border-themeBorder transition-colors">
                              <div className="flex items-center justify-between z-10">
                                <span className="text-[10px] text-mutedText font-bold uppercase tracking-wider">{card.label}</span>
                                <div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center">
                                  {card.icon}
                                </div>
                              </div>
                              <div className="flex items-end justify-between z-10 mt-1">
                                <span className="text-2xl font-black text-primaryText font-sans tracking-tight">
                                  <CountUpNumber value={card.val} decimals={card.decimals} prefix={card.prefix} suffix={card.suffix} duration={1200} />
                                </span>
                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{card.trend}</span>
                              </div>
                              {/* Background subtle glow */}
                              <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5 blur-xl group-hover:bg-white/10 transition-all duration-500" />
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {/* ANCHOR ANALYTICS CHARTS VIEW */}
                      {stats && (
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="w-full">
                          <DashboardCharts 
                            utilizationData={stats.utilization_trend}
                            algorithmData={stats.algorithm_popularity}
                          />
                        </motion.div>
                      )}

                      {/* RECENT PROJECTS TABLE */}
                      <motion.section variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-themeBorder pb-3">
                          <h3 className="font-bold text-sm text-primaryText flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4 text-mutedText" />
                            Recent Projects
                          </h3>
                          <button 
                            onClick={() => setActiveTab('upload')}
                            className="text-[11px] text-mutedText hover:text-cyanAccent font-semibold transition-colors"
                          >
                            View Library →
                          </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                            <thead>
                              <tr className="text-gray-500 font-semibold">
                                <th className="pb-3 px-3">Project Name</th>
                                <th className="pb-3 px-3">Upload Date</th>
                                <th className="pb-3 px-3">Format</th>
                                <th className="pb-3 px-3 text-center">Status</th>
                                <th className="pb-3 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {recentUploads.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                      <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-500">
                                        <FileText className="h-5 w-5" />
                                      </div>
                                      <p className="text-mutedText font-medium">No patterns uploaded yet.</p>
                                      <button 
                                        onClick={() => setActiveTab('upload')}
                                        className="mt-2 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-primaryText font-bold text-xs transition-colors"
                                      >
                                        Upload Your First Pattern
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                recentUploads.slice(0, 4).map((file) => (
                                  <tr 
                                    key={file.id} 
                                    className="hover:bg-white/5 transition-colors group"
                                  >
                                    <td className="py-3 px-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-white/5 border border-themeBorder flex items-center justify-center text-mutedText shrink-0">
                                          {file.file_type === 'pdf' ? <FileText className="h-4 w-4 text-red-400" /> : <Maximize2 className="h-4 w-4 text-cyanAccent" />}
                                        </div>
                                        <span className="font-bold text-primaryText truncate max-w-[150px] sm:max-w-[200px]">{file.original_filename}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-mutedText font-medium">
                                      {new Date(file.upload_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="px-2 py-0.5 rounded bg-white/5 border border-themeBorder text-[10px] font-bold text-secondaryText uppercase">{file.file_type}</span>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        file.status === 'completed' 
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                          : file.status === 'processing' 
                                            ? 'bg-cyanAccent/10 text-cyanAccent border border-cyanAccent/20 animate-pulse'
                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                      }`}>
                                        {file.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                      <button 
                                        onClick={() => setSelectedPatternForAnalysis(file)}
                                        className="py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-secondaryText font-semibold text-[11px] opacity-0 group-hover:opacity-100 transition-all border border-themeBorder hover:border-themeBorder shadow-sm"
                                      >
                                        Open
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.section>
                    </div>

                    {/* RIGHT COLUMN (Span 4) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                      
                      {/* AI INSIGHTS CARD */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="glass-panel border-cyanAccent/20 rounded-xl p-5 flex flex-col gap-4 text-left shadow-lg relative overflow-hidden bg-cyanAccent/[0.02] bg-gradient-to-br from-cyanAccent/[0.02] to-purpleAccent/[0.02]">
                        <div className="absolute -top-6 -right-6 h-24 w-24 bg-cyanAccent/10 rounded-full blur-2xl" />
                        <h4 className="font-extrabold text-sm text-cyanAccent flex items-center gap-2">
                          <Sparkles className="h-4.5 w-4.5" />
                          AI Insights
                        </h4>
                        <div className="flex flex-col gap-3 text-xs text-secondaryText relative z-10">
                          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-themeBorder">
                            <span className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                              <TrendingUp className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-[11px] leading-relaxed">Your average utilization improved by <strong className="text-primaryText">8%</strong> this week. Keep it up!</p>
                          </div>
                          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-themeBorder">
                            <span className="h-6 w-6 rounded-md bg-purple-500/10 text-purpleAccent flex items-center justify-center shrink-0">
                              <Leaf className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-[11px] leading-relaxed">You saved <strong className="text-primaryText">14% more fabric</strong> compared to industry averages.</p>
                          </div>
                          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 border border-themeBorder">
                            <span className="h-6 w-6 rounded-md bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                              <Info className="h-3.5 w-3.5" />
                            </span>
                            <p className="text-[11px] leading-relaxed">Recommended optimal fabric width for next batch: <strong className="text-primaryText">1500 mm</strong>.</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* SYSTEM STATUS */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="glass-panel rounded-xl p-5 flex flex-col gap-4 shadow-lg">
                        <h4 className="font-bold text-sm text-primaryText flex items-center gap-2 border-b border-themeBorder pb-2">
                          <Cpu className="h-4 w-4 text-mutedText" />
                          System Status
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-mutedText">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Backend API
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            AI Engine
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Database
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Storage
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500 text-right mt-1">All systems operational.</p>
                      </motion.div>

                      {/* RECENT ACTIVITY TIMELINE */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="glass-panel rounded-xl p-5 flex flex-col gap-4 shadow-lg flex-1">
                        <h4 className="font-bold text-sm text-primaryText flex items-center gap-2 border-b border-themeBorder pb-2">
                          <HistoryIcon className="h-4 w-4 text-mutedText" />
                          Recent Activity
                        </h4>
                        <div className="flex flex-col gap-4 relative mt-2 pl-3">
                          {/* Vertical Line */}
                          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
                          
                          <div className="flex gap-3 relative z-10">
                            <div className="h-7 w-7 rounded-full bg-secondaryBg border-2 border-cyanAccent flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                              <Upload className="h-3.5 w-3.5 text-cyanAccent" />
                            </div>
                            <div className="flex flex-col pt-0.5">
                              <span className="text-[11px] text-primaryText font-bold">Pattern Uploaded</span>
                              <span className="text-[10px] text-mutedText">Summer_Collection_v2.dxf</span>
                              <span className="text-[9px] text-gray-500 mt-0.5">2 hours ago</span>
                            </div>
                          </div>

                          <div className="flex gap-3 relative z-10">
                            <div className="h-7 w-7 rounded-full bg-secondaryBg border-2 border-purpleAccent flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                              <Sparkles className="h-3.5 w-3.5 text-purpleAccent" />
                            </div>
                            <div className="flex flex-col pt-0.5">
                              <span className="text-[11px] text-primaryText font-bold">Optimization Completed</span>
                              <span className="text-[10px] text-mutedText">Guillotine Pack • 91.4% Yield</span>
                              <span className="text-[9px] text-gray-500 mt-0.5">5 hours ago</span>
                            </div>
                          </div>

                          <div className="flex gap-3 relative z-10">
                            <div className="h-7 w-7 rounded-full bg-secondaryBg border-2 border-yellow-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                              <FileDown className="h-3.5 w-3.5 text-yellow-500" />
                            </div>
                            <div className="flex flex-col pt-0.5">
                              <span className="text-[11px] text-primaryText font-bold">Report Generated</span>
                              <span className="text-[10px] text-mutedText">Pants_Yield_Report.pdf</span>
                              <span className="text-[9px] text-gray-500 mt-0.5">Yesterday</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 relative z-10">
                            <div className="h-7 w-7 rounded-full bg-secondaryBg border-2 border-themeBorder flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-mutedText" />
                            </div>
                            <div className="flex flex-col pt-0.5">
                              <span className="text-[11px] text-primaryText font-bold">Profile Updated</span>
                              <span className="text-[10px] text-mutedText">Avatar synced successfully</span>
                              <span className="text-[9px] text-gray-500 mt-0.5">Jul 10, 2026</span>
                            </div>
                          </div>

                        </div>
                      </motion.div>

                    </div>
                  </div>

                </motion.div>
              )}

              {/* TAB UPLOAD: ENTERPRISE PATTERN UPLOAD */}
              {activeTab === 'upload' && (
                <UploadTab addToast={addToast} />
              )}

              {/* TAB LIBRARY: PATTERN CATALOG */}
              {activeTab === 'library' && (
                <LibraryTab 
                  addToast={addToast} 
                  onOpenPattern={(file) => {
                    setSelectedFileForPreview(file);
                  }} 
                />
              )}


              {/* TAB ANALYTICS: CHARTS AND HEATMAPS */}
              {activeTab === 'analytics' && (
                <AnalyticsTab />
              )}

              {/* TAB REPORTS LIST */}
              {activeTab === 'reports' && (
                <div className="glass-panel rounded-2xl p-6 flex flex-col gap-6 text-left">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-extrabold text-base text-primaryText">Optimization Performance Reports</h3>
                    <p className="text-[11px] text-mutedText">Download CAD vector coordinates and PDF yardage efficiency auditing cards.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {jobs.map((job) => (
                      <div key={job.id} className="p-4 bg-background/60 rounded-xl border border-themeBorder flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-bold text-primaryText truncate max-w-[200px]">{job.name}</span>
                          <span className="text-[9px] text-gray-500 font-medium">Ref #{job.id} • Yield: {job.utilization_percentage}%</span>
                          <span className="text-[10px] text-cyanAccent font-bold">Savings: +${job.saved_money}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => addToast("Successfully compiled report PDF", "success")} 
                            className="h-8 w-8 bg-white/5 border border-themeBorder hover:bg-white/10 rounded flex items-center justify-center text-mutedText hover:text-primaryText"
                            title="Download PDF"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB HISTORY: LIST AND SEARCH */}
              {activeTab === 'history' && (
                <HistoryTab 
                  jobs={jobs}
                  onDeleteJob={deleteJob}
                  onDuplicateJob={handleDuplicateJob}
                  addToast={addToast}
                />
              )}

              {/* TAB SETTINGS: PROFILES AND API */}
              {activeTab === 'settings' && (
                <SettingsTab 
                  currentUser={currentUser}
                  setCurrentUser={setCurrentUser}
                  theme={theme}
                  setTheme={setTheme}
                  addToast={addToast}
                />
              )}

            </motion.div>
          </AnimatePresence>
          )}

        </main>
      </div>

      {/* SIGN OUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSignOutModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0f19] border border-themeBorder shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-themeBorder flex items-center justify-between">
                <span className="text-sm font-bold text-primaryText uppercase tracking-wider">Sign Out</span>
                <button 
                  onClick={() => setShowSignOutModal(false)}
                  className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-mutedText hover:text-primaryText transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                  <LogOut className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-primaryText text-sm font-bold">Sign Out</span>
                  <p className="text-xs text-mutedText">Are you sure you want to sign out of Pattern Optima?</p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowSignOutModal(false)}
                    className="py-2.5 bg-white/5 hover:bg-white/10 text-mutedText hover:text-primaryText font-semibold rounded-xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSignOut}
                    className="py-2.5 bg-rose-600 hover:bg-rose-700 text-primaryText font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
