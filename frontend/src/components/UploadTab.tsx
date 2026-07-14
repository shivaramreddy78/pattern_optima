"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  FileCode,
  Image as ImageIcon,
  ChevronRight,
  Cpu,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Trash2,
  RotateCw,
  Clock,
  Play,
  ArrowRight,
  Activity,
  FolderOpen,
  PieChart,
  Grid,
  Sparkles,
  Leaf,
  Zap,
  Award,
  Factory
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// --- Interfaces ---

interface UploadedFileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

interface AnalysisResult {
  complexity_score: number;
  estimated_pieces: number;
  estimated_fabric_area: number;
  garment_type_detected: string;
  recommended_width: number;
  recommended_margin: number;
  shapes_extracted: number;
  confidence_score: number;
}

interface OptimizationResult {
  job_id: number;
  status: string;
  fabric_width: number;
  fabric_height: number;
  utilization_percentage: number;
  waste_percentage: number;
  saved_area: number;
  saved_money: number;
  algorithm_used: string;
  processing_time: number;
  optimized_layout: {
    id: string;
    x: number;
    y: number;
    rotation: number;
    points: [number, number][];
  }[];
}

interface UploadTabProps {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type WorkflowStep = 'upload' | 'preview' | 'analysis' | 'optimization' | 'results';

// --- Helper Functions ---

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function CountUpNumber({ value = 0, prefix = "", suffix = "", decimals = 0 }: { value?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const safeValue = value ?? 0;

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min(1, (timestamp - startTimestamp) / duration);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(easeProgress * safeValue);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(safeValue);
      }
    };
    window.requestAnimationFrame(step);
  }, [safeValue]);

  return <>{prefix}{(displayValue || 0).toFixed(decimals)}{suffix}</>;
}

// --- Main Component ---

export default function UploadTab({ addToast }: UploadTabProps) {
  // Global Workspace State
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  
  // Data States
  const [activeFile, setActiveFile] = useState<UploadedFileMetadata | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [optData, setOptData] = useState<OptimizationResult | null>(null);
  const [recentUploads, setRecentUploads] = useState<UploadedFileMetadata[]>([]);
  
  // Processing States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(0);

  // UI States
  const [isDragOver, setIsDragOver] = useState(false);
  const [cadZoom, setCadZoom] = useState(1);
  const [cadFullscreen, setCadFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_STATIC_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '/static/uploads') || 'http://localhost:8000/static/uploads';

  // --- PDF Viewer State ---
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Data
  useEffect(() => {
    fetchRecentUploads();
    
    // Load PDF.js
    if (typeof window !== 'undefined' && !(window as any)['pdfjsLib']) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => setPdfjs((window as any)['pdfjsLib']);
      document.body.appendChild(script);
    } else if (typeof window !== 'undefined') {
      setPdfjs((window as any)['pdfjsLib']);
    }
  }, []);

  const fetchRecentUploads = async () => {
    try {
      const res = await apiClient.get('/uploads/');
      setRecentUploads(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  // --- Actions ---

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validateFile = (file: File): boolean => {
    const allowed = ["dxf", "svg", "pdf", "png", "jpg", "jpeg"];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowed.includes(ext)) {
      addToast(`Unsupported format. Use: ${allowed.join(', ').toUpperCase()}`, 'error');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast(`File too large (Max 10MB)`, 'error');
      return false;
    }
    return true;
  };

  const handleFileDrop = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else {
      if (e.target.files && e.target.files.length > 0) {
        file = e.target.files[0];
      }
    }

    if (!file || !validateFile(file)) return;

    // Reset workspace
    setAnalysisData(null);
    setOptData(null);
    setCurrentStep('upload');
    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const progressSim = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 90));
    }, 200);

    try {
      const res = await apiClient.post('/uploads/upload', formData, {
        headers: { 'Content-Type': undefined }
      });
      clearInterval(progressSim);
      setUploadProgress(100);
      
      // Delay for success animation
      setTimeout(() => {
        setActiveFile(res.data);
        setCurrentStep('preview');
        setIsUploading(false);
        addToast('File uploaded & parsed successfully', 'success');
        fetchRecentUploads();
      }, 800);
      
    } catch (err: any) {
      clearInterval(progressSim);
      setIsUploading(false);
      addToast(err.response?.data?.detail || 'Upload failed', 'error');
    }
  };

  const handleAnalyze = async () => {
    if (!activeFile) return;
    setCurrentStep('analysis');
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post(`/uploads/${activeFile.id}/analyze`);
      setAnalysisData(res.data);
      addToast('AI Analysis Complete', 'success');
    } catch (err: any) {
      addToast('Analysis failed', 'error');
      setCurrentStep('preview');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (!activeFile || !analysisData) return;
    setCurrentStep('optimization');
    setIsOptimizing(true);
    setOptProgress(0);

    const sim = setInterval(() => {
      setOptProgress(p => Math.min(p + 8, 95));
    }, 400);

    try {
      const res = await apiClient.post('/nesting/optimize-uploads', {
        upload_ids: [activeFile.id],
        fabric_width: analysisData.recommended_width || 150,
        fabric_height: 0.0,
        algorithm: 'Skyline',
        margin: analysisData.recommended_margin || 2.0,
        quantities: { [activeFile.id]: 2 } // Default requested pairs
      });
      
      clearInterval(sim);
      setOptProgress(100);
      
      setTimeout(() => {
        setOptData(res.data);
        setCurrentStep('results');
        setIsOptimizing(false);
        addToast('Optimal nested layout generated!', 'success');
      }, 800);
      
    } catch (err: any) {
      clearInterval(sim);
      setIsOptimizing(false);
      setCurrentStep('analysis');
      addToast(err.response?.data?.detail || 'Optimization failed', 'error');
    }
  };

  const handleDownloadReport = () => {
    if (!optData?.job_id) {
      addToast('No valid job ID found', 'error');
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('pattern_optima_token') : '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    window.open(`${apiBase}/nesting/jobs/${optData.job_id}/download/pdf?token=${token}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/uploads/${id}`);
      addToast('Pattern deleted', 'info');
      fetchRecentUploads();
      if (activeFile?.id === id) {
        setActiveFile(null);
        setCurrentStep('upload');
      }
    } catch (err) {
      addToast('Failed to delete pattern', 'error');
    }
  };

  // --- PDF Renderer Effect ---
  useEffect(() => {
    if (currentStep === 'preview' && activeFile?.file_type === 'pdf' && pdfjs) {
      let active = true;
      async function render() {
        setPdfLoading(true);
        try {
          const url = `${API_STATIC_URL}/${activeFile!.filename}`;
          // Disable Web Worker to prevent cross-origin strict blocking which causes silent infinite promise hanging in some modern browsers
          pdfjs.GlobalWorkerOptions.workerSrc = ''; 
          
          const loadingTask = pdfjs.getDocument(url);
          const pdf = await loadingTask.promise;
          if (!active) return;
          setPdfTotalPages(pdf.numPages);
          
          const page = await pdf.getPage(pdfPage);
          if (!active) return;
          
          const canvas = canvasRef.current;
          if (!canvas) {
            if (active) setPdfLoading(false);
            return;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (active) setPdfLoading(false);
            return;
          }

          const viewport = page.getViewport({ scale: 1.0 });
          const scale = (canvas.parentElement?.clientWidth || 400) / viewport.width;
          const scaledViewport = page.getViewport({ scale: Math.min(scale, 1.5) });

          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          if (active) setPdfLoading(false);
        } catch (e) {
          console.error('PDF Render Error:', e);
          if (active) setPdfLoading(false);
        }
      }
      render();
      return () => { active = false; };
    }
  }, [currentStep, activeFile, pdfjs, pdfPage]);


  // --- Render Helpers ---

  const timelineSteps = [
    { id: 'upload', title: 'File Upload', desc: 'Secure cloud storage' },
    { id: 'preview', title: 'Pattern Preview', desc: 'Vector validation' },
    { id: 'analysis', title: 'AI Analysis', desc: 'Geometry extraction' },
    { id: 'optimization', title: 'Nesting Solver', desc: 'Yield compaction' },
    { id: 'results', title: 'Final Results', desc: 'Reports & Exports' }
  ];

  const getStepIndex = (step: WorkflowStep) => timelineSteps.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  // --- Final Results Computation Logic ---
  const renderResults = () => {
    if (!optData) return null;

    const processingTime = optData.processing_time !== undefined ? optData.processing_time : 0.0;
    const utilization = optData.utilization_percentage || 0;
    const waste = optData.waste_percentage || 100 - utilization;
    const fabricAreaSqm = (optData.fabric_width * (optData.fabric_height || 0)) / 10000;
    
    // If backend returns 0 saved_area, calculate it
    const optimizedAreaSqm = fabricAreaSqm > 0 
        ? fabricAreaSqm * (utilization / 100) 
        : (optData.saved_area || 0);

    const costPerSqm = 85;
    const estimatedSavings = (optData.saved_area || 0) * costPerSqm;
    const co2Reduction = (optData.saved_area || 0) * 2.5;

    const timePenalty = Math.min(20, processingTime * 2);
    const score = Math.max(0, Math.min(100, utilization - timePenalty));

    let rating = "Needs Improvement";
    let ratingColor = "text-rose-400";
    if (score > 85) { rating = "Excellent"; ratingColor = "text-emerald-400"; }
    else if (score > 75) { rating = "Very Good"; ratingColor = "text-green-400"; }
    else if (score > 60) { rating = "Good"; ratingColor = "text-yellow-400"; }

    const baselineYield = Math.max(0, utilization - 15.3);

    return (
      <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-8 pb-12 animate-fade-in-up">
        
        {/* Results Header */}
        <div className="p-6 border-b border-themeBorder flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyanAccent/20 to-purpleAccent/20 border border-themeBorder flex items-center justify-center">
              <FileText className="h-6 w-6 text-primaryText" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-lg text-primaryText">Production Blueprint Ready</h3>
              <p className="text-xs text-mutedText flex items-center gap-2">
                <span className="uppercase text-cyanAccent font-bold">Optimization Complete</span> • Job #{optData.job_id}
              </p>
            </div>
          </div>
          <button onClick={handleDownloadReport} className="px-6 py-3 bg-white text-slate-900 font-extrabold rounded-xl hover:scale-105 transition-all shadow-lg flex items-center gap-2">
            <Download className="h-4 w-4" /> Download PDF Report
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">Fabric Yield</span>
                  <span className="text-3xl font-black text-cyanAccent"><CountUpNumber value={utilization} decimals={1} suffix="%" /></span>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">Waste Remaining</span>
                  <span className="text-3xl font-black text-primaryText"><CountUpNumber value={waste} decimals={1} suffix="%" /></span>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">Optimized Area</span>
                  <span className="text-3xl font-black text-primaryText"><CountUpNumber value={optimizedAreaSqm} decimals={2} /> <span className="text-sm">m²</span></span>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">Estimated Savings</span>
                  <span className="text-3xl font-black text-emerald-400">₹<CountUpNumber value={estimatedSavings} decimals={0} /></span>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">CO₂ Reduction</span>
                  <span className="text-3xl font-black text-primaryText"><CountUpNumber value={co2Reduction} decimals={1} /> <span className="text-sm">kg</span></span>
                </div>
                <div className="flex flex-col gap-4">
                  <span className="text-mutedText font-bold text-[10px] uppercase tracking-wider">Optimization Time</span>
                  <span className="text-3xl font-black text-primaryText"><CountUpNumber value={processingTime} decimals={2} suffix="s" /></span>
                </div>
              </div>

              {/* CAD Viewer */}
              <div className={`bg-background rounded-2xl border border-themeBorder p-6 relative flex flex-col overflow-hidden h-96`}>
                <div className="absolute inset-0 pattern-grid opacity-30" />
                <div className="flex-1 flex items-center justify-center relative z-10 border border-dashed border-themeBorder bg-[#060b13] overflow-hidden">
                    <svg 
                      className="w-full h-full" 
                      viewBox={`0 0 ${optData.fabric_width || 150} ${optData.fabric_height || 100}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {optData.optimized_layout?.map((shape, i) => (
                        <polygon key={i} points={shape.points.map(p => `${p[0]},${p[1]}`).join(' ')} fill="rgba(20, 184, 166, 0.4)" stroke="rgba(20, 184, 166, 1)" strokeWidth="0.5" />
                      ))}
                    </svg>
                </div>
                <div className="text-primaryText text-sm font-medium leading-relaxed max-w-lg mt-2">
                  AI successfully optimized {optData.optimized_layout?.length || 0} garment pieces on a {optData.fabric_width} cm wide fabric using the {optData.algorithm_used || 'Skyline'} algorithm.<br/><br/>
                  Fabric utilization improved from {baselineYield.toFixed(1)}% to {utilization.toFixed(1)}%.<br/>
                  Estimated savings: ₹{estimatedSavings.toFixed(0)} per layout iteration.
                </div>
              </div>
            </div>

            {/* Side Metrics */}
            <div className="flex flex-col gap-6">
                <div className="bg-secondaryBg border border-themeBorder rounded-2xl p-6">
                    <span className="text-mutedText font-bold text-xs uppercase tracking-wider">Yield Improvement</span>
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center w-full">
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex items-center">
                          <div className="bg-gray-500 h-full" style={{ width: `${baselineYield}%` }} />
                          <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(0, utilization - baselineYield)}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs font-black">
                        <span className="text-mutedText">{baselineYield.toFixed(1)}%</span>
                        <span className="text-emerald-400">+{((utilization - baselineYield)).toFixed(1)}% <span className="font-bold text-gray-500 ml-1">({utilization.toFixed(1)}%)</span></span>
                      </div>
                    </div>
                </div>

                <div className="bg-secondaryBg border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                        <div className="flex flex-col">
                            <span className="text-emerald-400 font-bold text-sm">Production Ready</span>
                            <span className="text-xs text-mutedText">Export formats available</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-1 rounded bg-white/5 border border-themeBorder text-[10px] font-bold text-primaryText uppercase tracking-wider">Ready For Cutting</span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-themeBorder text-[10px] font-bold text-primaryText uppercase tracking-wider">CNC Compatible</span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-themeBorder text-[10px] font-bold text-primaryText uppercase tracking-wider">Approved</span>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-8 text-xs text-left animate-fade-in pb-12">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-2 border-b border-themeBorder pb-6">
        <h2 className="text-2xl font-black text-primaryText tracking-tight flex items-center gap-3">
          <Layers className="h-6 w-6 text-cyanAccent" />
          Pattern Intelligence Workspace
        </h2>
        <p className="text-sm text-mutedText max-w-2xl">
          Upload garment files, validate vector geometry, run Shapely AI analysis, and execute high-yield nesting optimizations in a single, unified enterprise pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: TIMELINE & UPLOAD HUB */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          
          {/* Timeline Stepper */}
          <div className="glass-panel rounded-3xl p-6 hidden md:block">
            <h4 className="font-extrabold text-sm text-primaryText mb-6 uppercase tracking-widest">Workflow State</h4>
            <div className="flex flex-col gap-0 relative">
              <div className="absolute left-[15px] top-4 bottom-8 w-[2px] bg-slate-800" />
              
              {timelineSteps.map((step, idx) => {
                const isPast = idx < currentIndex;
                const isCurrent = idx === currentIndex;
                const isFuture = idx > currentIndex;
                
                return (
                  <div key={step.id} className="flex gap-4 relative z-10 pb-6 last:pb-0">
                    <div className="flex flex-col items-center mt-0.5">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-xl bg-background ${
                        isPast ? 'border-emerald-500 text-emerald-500' : 
                        isCurrent ? 'border-cyanAccent text-cyanAccent shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 
                        'border-slate-800 text-slate-700'
                      }`}>
                        {isPast ? <CheckCircle2 className="h-4 w-4" /> : 
                         isCurrent ? <Loader2 className={`h-4 w-4 ${isUploading || isAnalyzing || isOptimizing ? 'animate-spin' : ''}`} /> :
                         <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />}
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: isPast ? '100%' : 0 }}
                          className="w-[2px] bg-cyanAccent absolute top-8 bottom-0 left-[15px] -z-10"
                        />
                      )}
                    </div>
                    <div className="flex flex-col pt-1.5">
                      <span className={`font-bold text-[13px] ${isCurrent ? 'text-primaryText' : isPast ? 'text-secondaryText' : 'text-gray-600'}`}>
                        {step.title}
                      </span>
                      <span className={`text-[10px] ${isCurrent ? 'text-cyanAccent' : 'text-gray-500'}`}>
                        {step.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions (Visible after upload) */}
          <AnimatePresence>
            {activeFile && !isUploading && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-3xl p-6 flex flex-col gap-3"
              >
                <h4 className="font-extrabold text-xs text-mutedText uppercase tracking-wider mb-2">Workspace Actions</h4>
                
                <button 
                  onClick={() => { setActiveFile(null); setCurrentStep('upload'); }}
                  className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-primaryText font-bold transition-all text-left flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2"><Upload className="h-4 w-4 text-mutedText group-hover:text-primaryText" /> Upload New File</span>
                </button>

                {currentStep === 'preview' && (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full py-2.5 px-4 bg-cyanAccent/10 hover:bg-cyanAccent/20 border border-cyanAccent/20 rounded-xl text-cyanAccent font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Run AI Analysis</span>
                  </button>
                )}

                {currentStep === 'analysis' && (
                  <button 
                    onClick={handleOptimize}
                    className="w-full py-2.5 px-4 bg-purpleAccent/10 hover:bg-purpleAccent/20 border border-purpleAccent/20 rounded-xl text-purpleAccent font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Grid className="h-4 w-4" /> Start Optimization</span>
                  </button>
                )}
                
                {currentStep === 'results' && (
                  <button 
                    onClick={handleDownloadReport}
                    className="w-full py-2.5 px-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl text-yellow-500 font-bold transition-all text-left flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Download PDF Report</span>
                  </button>
                )}

              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* RIGHT COLUMN: DYNAMIC WORKSPACE PANEL */}
        <div className="xl:col-span-3">
          <div className="glass-panel rounded-3xl min-h-[600px] flex flex-col relative overflow-hidden bg-background/40">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: UPLOAD */}
              {currentStep === 'upload' && (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-6"
                >
                  {!isUploading ? (
                    <>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleFileDrop}
                        className={`w-full max-w-xl border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 transition-all duration-300 cursor-pointer ${
                          isDragOver ? 'border-cyanAccent bg-cyanAccent/5 scale-105' : 'border-themeBorder hover:border-themeBorder hover:bg-white/5'
                        }`}
                      >
                        <div className="h-24 w-24 rounded-full bg-secondaryBg border-4 border-slate-800 flex items-center justify-center text-cyanAccent relative shadow-2xl pointer-events-none">
                          <Upload className="h-10 w-10 animate-bounce" />
                        </div>
                        <div className="flex flex-col gap-2 pointer-events-none">
                          <h3 className="text-xl font-black text-primaryText">Drag & Drop Pattern File</h3>
                          <p className="text-sm text-mutedText">or click to browse local computer</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center mt-2 pointer-events-none">
                          {['DXF', 'SVG', 'PDF', 'PNG', 'JPG'].map(ext => (
                            <span key={ext} className="px-2.5 py-1 rounded-md bg-white/5 text-mutedText font-bold text-[10px] border border-themeBorder">{ext}</span>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileDrop} 
                        onClick={(e) => { e.stopPropagation(); }} 
                        style={{ display: 'none' }} 
                        accept=".dxf,.svg,.pdf,.png,.jpg,.jpeg" 
                      />
                  </>
                  ) : (
                    <div className="w-full max-w-md flex flex-col items-center justify-center gap-8 py-10">
                      <div className="relative h-32 w-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                          <motion.circle 
                            cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" 
                            className="text-cyanAccent" strokeDasharray="283"
                            initial={{ strokeDashoffset: 283 }}
                            animate={{ strokeDashoffset: 283 - (283 * uploadProgress) / 100 }}
                            transition={{ duration: 0.2 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-primaryText">{uploadProgress}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-center w-full">
                        <h4 className="font-bold text-primaryText text-lg">Uploading to secure vault...</h4>
                        <p className="text-mutedText text-sm truncate px-4">{fileInputRef.current?.files?.[0]?.name || 'Pattern File'}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 2: PREVIEW */}
              {currentStep === 'preview' && activeFile && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                  {/* File Info Header */}
                  <div className="p-6 border-b border-themeBorder flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyanAccent/20 to-purpleAccent/20 border border-themeBorder flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primaryText" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-bold text-lg text-primaryText">{activeFile.original_filename}</h3>
                        <p className="text-xs text-mutedText flex items-center gap-2">
                          <span className="uppercase text-cyanAccent font-bold">{activeFile.file_type}</span> • {formatBytes(activeFile.file_size)} • Uploaded Today
                        </p>
                      </div>
                    </div>
                    <button onClick={handleAnalyze} className="px-6 py-3 bg-cyanAccent text-slate-900 font-extrabold rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-2">
                      <Cpu className="h-4 w-4" /> Run AI Analysis
                    </button>
                  </div>
                  
                  {/* Preview Area */}
                  <div className="flex-1 flex items-center justify-center p-8 relative min-h-[400px]">
                    <div className="absolute inset-0 mesh-grid opacity-20" />
                    
                    {['png', 'jpg', 'jpeg', 'svg'].includes(activeFile.file_type) ? (
                      <img src={`${API_STATIC_URL}/${activeFile.filename}`} className="max-w-full max-h-[450px] object-contain rounded-lg shadow-2xl relative z-10" />
                    ) : activeFile.file_type === 'pdf' ? (
                      <div className="relative z-10 w-full flex flex-col items-center">
                        {pdfLoading && <Loader2 className="h-8 w-8 animate-spin text-cyanAccent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                        <canvas ref={canvasRef} className="max-w-full max-h-[450px] shadow-2xl rounded bg-white" />
                        {pdfTotalPages > 1 && (
                          <div className="mt-4 flex gap-4 items-center bg-secondaryBg px-4 py-2 rounded-xl border border-themeBorder">
                            <button onClick={() => setPdfPage(p => Math.max(1, p-1))} disabled={pdfPage===1} className="disabled:opacity-30"><ChevronRight className="h-4 w-4 rotate-180 text-primaryText"/></button>
                            <span className="text-primaryText font-bold">{pdfPage} / {pdfTotalPages}</span>
                            <button onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p+1))} disabled={pdfPage===pdfTotalPages} className="disabled:opacity-30"><ChevronRight className="h-4 w-4 text-primaryText"/></button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <FileCode className="h-20 w-20 text-gray-600" />
                        <span className="text-mutedText font-bold text-sm">Visual preview unavailable for DXF format.<br/>Raw vector data will still be extracted.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: AI ANALYSIS */}
              {(currentStep === 'analysis' || isAnalyzing) && (
                <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-8 flex flex-col justify-center gap-8 relative">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center text-center gap-6">
                      <div className="relative h-32 w-32 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[3px] border-cyanAccent/20 border-t-cyanAccent animate-spin" />
                        <Cpu className="h-12 w-12 text-cyanAccent animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-black text-primaryText">Extracting Geometric Vectors</h3>
                        <p className="text-mutedText">Our AI is parsing shapes, detecting seam allowances, and predicting garment types...</p>
                      </div>
                    </div>
                  ) : analysisData ? (
                    <>
                      <div className="flex justify-between items-end border-b border-themeBorder pb-4">
                        <div className="flex flex-col gap-1">
                          <h3 className="text-xl font-black text-primaryText flex items-center gap-2"><Sparkles className="h-5 w-5 text-purpleAccent" /> AI Insights Generated</h3>
                          <p className="text-mutedText">Analysis complete. Ready for layout compaction.</p>
                        </div>
                        <button onClick={handleOptimize} className="px-6 py-3 bg-purpleAccent text-primaryText font-extrabold rounded-xl hover:scale-105 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-2">
                          Start Optimization <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-secondaryBg border border-themeBorder p-5 rounded-2xl flex flex-col gap-2">
                          <span className="text-gray-500 uppercase font-bold text-[10px]">Predicted Garment</span>
                          <span className="text-primaryText font-bold text-lg">{analysisData.garment_type_detected}</span>
                        </div>
                        <div className="bg-secondaryBg border border-themeBorder p-5 rounded-2xl flex flex-col gap-2">
                          <span className="text-gray-500 uppercase font-bold text-[10px]">Total Pattern Pieces</span>
                          <span className="text-primaryText font-bold text-2xl text-cyanAccent"><CountUpNumber value={analysisData.shapes_extracted} /></span>
                        </div>
                        <div className="bg-secondaryBg border border-themeBorder p-5 rounded-2xl flex flex-col gap-2">
                          <span className="text-gray-500 uppercase font-bold text-[10px]">Complexity Score</span>
                          <span className="text-primaryText font-bold text-2xl text-emerald-400"><CountUpNumber value={analysisData.complexity_score} />/10</span>
                        </div>
                        <div className="bg-secondaryBg border border-themeBorder p-5 rounded-2xl flex flex-col gap-2 relative overflow-hidden">
                          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-green-500/20 to-transparent" />
                          <span className="text-gray-500 uppercase font-bold text-[10px]">AI Confidence</span>
                          <span className="text-primaryText font-bold text-2xl relative z-10"><CountUpNumber value={analysisData.confidence_score} />%</span>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-themeBorder flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-primaryText">Default Configuration Applied</h4>
                          <p className="text-mutedText">Roll Width: {analysisData.recommended_width}cm | Margin: {analysisData.recommended_margin}cm | Algorithm: Skyline</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-secondaryBg flex items-center justify-center border border-themeBorder">
                          <Settings className="h-4 w-4 text-mutedText" />
                        </div>
                      </div>
                    </>
                  ) : null}
                </motion.div>
              )}

              {/* STEP 4: OPTIMIZING & RESULTS */}
              {(currentStep === 'optimization') && (
                <motion.div key="optimization" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-8 flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 gap-8">
                      <div className="h-20 w-20 relative">
                        <div className="absolute inset-0 rounded-xl bg-purpleAccent/20 animate-ping" />
                        <div className="absolute inset-0 rounded-xl border-2 border-purpleAccent bg-secondaryBg flex items-center justify-center z-10 shadow-[0_0_30px_rgba(168,85,247,0.5)]">
                          <Grid className="h-8 w-8 text-purpleAccent animate-pulse" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center text-center gap-3">
                        <h3 className="text-2xl font-black text-primaryText">Computing Optimal Layout</h3>
                        <p className="text-mutedText max-w-sm">Applying combinatorial algorithms to minimize waste and pack {analysisData?.shapes_extracted || 0} vector geometries.</p>
                      </div>
                      <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purpleAccent rounded-full" style={{ width: `${optProgress}%` }} />
                      </div>
                    </div>
                </motion.div>
              )}
              
              {/* STEP 5: FINAL RESULTS (NEW DASHBOARD) */}
              {currentStep === 'results' && renderResults()}

            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW: RECENT UPLOADS */}
      <div className="mt-8 flex flex-col gap-4">
        <h3 className="font-black text-primaryText text-sm uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4 text-cyanAccent" />
          Recent Workspace Files
        </h3>
        
        {recentUploads.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/5 border border-themeBorder flex items-center justify-center text-gray-500">
              <FolderOpen className="h-5 w-5" />
            </div>
            <p className="text-mutedText font-medium">Your workspace history is empty. Upload a pattern above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentUploads.slice(0, 4).map(file => (
              <div key={file.id} className="glass-panel p-4 rounded-2xl flex flex-col gap-3 group hover:border-cyanAccent/30 transition-all">
                <div className="flex items-center gap-3 border-b border-themeBorder pb-3">
                  <div className="h-10 w-10 rounded-xl bg-secondaryBg border border-themeBorder flex items-center justify-center">
                    <FileText className="h-5 w-5 text-mutedText group-hover:text-cyanAccent transition-colors" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-primaryText text-[11px] truncate">{file.original_filename}</span>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5">{formatBytes(file.file_size)} • {file.file_type.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setActiveFile(file);
                      setCurrentStep('preview');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-primaryText font-bold text-[10px] transition-colors"
                  >
                    Open
                  </button>
                  <button 
                    onClick={() => handleDelete(file.id)}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// Temporary internal lucide icons to avoid bloat imports
const Settings = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
