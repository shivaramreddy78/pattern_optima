"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Grid, 
  Loader2, 
  Cpu, 
  Sparkles, 
  Download, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  FileText, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Info,
  ShieldAlert,
  Compass,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface UploadItem {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
  metadata_json?: {
    pieces_count: number;
    fabric_area: number;
    average_piece_size: number;
    largest_piece_size: number;
    smallest_piece_size: number;
    dimensions: string;
    paper_size: string;
    confidence_score: number;
    estimated_waste: number;
    polygons: number[][][];
    creator: string;
    material_type: string;
  };
}

interface NestingAnalysisDashboardProps {
  uploadItem: UploadItem;
  onClose: () => void;
  onRefreshLibrary: () => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function NestingAnalysisDashboard({ 
  uploadItem, 
  onClose, 
  onRefreshLibrary,
  addToast 
}: NestingAnalysisDashboardProps) {
  const [item, setItem] = useState<UploadItem>(uploadItem);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // View transforms
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0); // degrees
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOutlines, setShowOutlines] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  
  // Drag Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // pdf.js rendering states
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Analysis loader stepper progress
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState(0);
  const stepperLabels = [
    "Reading File...",
    "Extracting Geometry...",
    "Cleaning Shapes...",
    "Detecting Pattern Pieces...",
    "Calculating Areas...",
    "Generating Preview...",
    "Analysis Complete"
  ];

  // Hover properties state
  const [hoveredPolyIdx, setHoveredPolyIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Load pdfjs library script on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => {
        setPdfjs((window as any)['pdfjs-dist/build/pdf']);
      };
      document.body.appendChild(script);
    }
  }, []);

  const hasAnalysis = item.status === 'analyzed' && item.metadata_json;
  const meta = item.metadata_json || {} as any;

  // pdf.js renderer trigger loop
  useEffect(() => {
    if (!pdfjs || !item || item.file_type !== 'pdf' || !hasAnalysis) return;

    let active = true;
    async function renderPDF() {
      setPdfLoading(true);
      setPdfError(false);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const url = `${apiBase}/uploads/${item.id}/preview?token=${token}`;
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        setTotalPages(pdf.numPages);
        
        const page = await pdf.getPage(currentPage);
        if (!active) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        if (active) {
          setPdfLoading(false);
        }
      } catch (err) {
        console.error("Failed to render PDF in analysis dashboard:", err);
        if (active) {
          setPdfError(true);
          setPdfLoading(false);
        }
      }
    }
    
    renderPDF();
    
    return () => {
      active = false;
    };
  }, [pdfjs, item, currentPage, hasAnalysis, retryCount]);

  const startPatternAnalysis = async () => {
    setAnalyzing(true);
    setStep(0);

    const timer = setInterval(() => {
      setStep(prev => {
        if (prev < stepperLabels.length - 2) return prev + 1;
        return prev;
      });
    }, 450);

    try {
      const res = await apiClient.post(`/uploads/${item.id}/analyze`);
      clearInterval(timer);
      setStep(stepperLabels.length - 1);
      
      setTimeout(() => {
        setItem(res.data);
        setAnalyzing(false);
        onRefreshLibrary();
        addToast('Pattern outlines extracted and analyzed successfully!', 'success');
      }, 700);
    } catch (err: any) {
      clearInterval(timer);
      setAnalyzing(false);
      const detail = err.response?.data?.detail || 'Analysis calculation failed.';
      addToast(detail, 'error');
    }
  };

  const handleFitToScreen = () => {
    if (item.file_type === 'pdf') {
      setScale(0.85);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      return;
    }
    if (!meta.polygons || meta.polygons.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    meta.polygons.forEach((poly: number[][]) => {
      poly.forEach(([px, py]) => {
        const sx = px * 1.6 + 50;
        const sy = py * 1.6 + 50;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      });
    });
    const width = maxX - minX;
    const height = maxY - minY;
    const containerW = containerRef.current?.clientWidth || 500;
    const containerH = containerRef.current?.clientHeight || 380;
    const newScale = Math.min(containerW / (width || 1), containerH / (height || 1)) * 0.85;
    setScale(newScale);
    setPan({
      x: -(minX + width / 2) * newScale + containerW / 2,
      y: -(minY + height / 2) * newScale + containerH / 2
    });
    setRotation(0);
  };

  const handleZoom = (factor: number) => {
    setScale(prev => Math.max(0.5, Math.min(prev * factor, 4.0)));
  };

  const handleRotate = (dir: 'left' | 'right') => {
    setRotation(prev => (prev + (dir === 'left' ? -90 : 90)) % 360);
  };

  const handleDownloadOriginal = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    window.open(`${apiBase}/static/uploads/${item.filename}?token=${token}`, '_blank');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const getPolygonArea = (points: number[][]) => {
    if (!points || points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return Math.abs(area / 2);
  };

  // Helper colors
  const getPolyColor = (idx: number) => {
    const colors = ["#06b6d4", "#a855f7", "#10b981", "#fbbf24", "#3b82f6"];
    return colors[idx % colors.length];
  };

  return (
    <div className={`w-full text-xs text-left flex flex-col gap-6 select-none ${isFullscreen ? 'fixed inset-0 z-[9999] bg-[#030712] p-6 overflow-y-auto' : ''}`}>
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-themeBorder pb-4.5 gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-cyanAccent" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">CAD pattern inspection module</span>
            <h3 className="font-extrabold text-sm text-primaryText truncate max-w-[280px] sm:max-w-md">{item.original_filename}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder hover:bg-white/10 text-mutedText hover:text-primaryText flex items-center justify-center transition-all"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder hover:bg-rose-500/10 hover:text-rose-400 text-mutedText flex items-center justify-center transition-all"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* REPLAY PROCESS STEPPER */}
      <AnimatePresence>
        {analyzing && (
          <div className="fixed inset-0 z-[10000] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel max-w-sm w-full p-8 rounded-3xl flex flex-col items-center gap-5 text-center"
            >
              <Loader2 className="h-8 w-8 text-cyanAccent animate-spin" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-primaryText text-xs">AI Geometry Extraction</span>
                <span className="text-mutedText font-mono text-[10px]">{stepperLabels[step]}</span>
              </div>
              <div className="w-48 bg-secondaryBg h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyanAccent h-full rounded-full transition-all duration-300" 
                  style={{ width: `${((step + 1) / stepperLabels.length) * 100}%` }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* INTERACTIVE PREVIEW PANEL */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          
          {/* TOOLBAR CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <span className="font-semibold text-gray-500">Vector Contour Workspace</span>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => handleZoom(1.2)} 
                className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText flex items-center justify-center"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleZoom(0.8)} 
                className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText flex items-center justify-center"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleRotate('left')} 
                className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText flex items-center justify-center"
                title="Rotate Counter-Clockwise"
              >
                <RotateCw className="h-4 w-4 scale-x-[-1]" />
              </button>
              <button 
                onClick={() => handleRotate('right')} 
                className="h-8 w-8 rounded-lg bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText flex items-center justify-center"
                title="Rotate Clockwise"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowOutlines(!showOutlines)}
                className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold transition-all ${
                  showOutlines 
                    ? 'bg-cyanAccent/10 border-cyanAccent/30 text-cyanAccent' 
                    : 'bg-white/5 border-themeBorder text-mutedText hover:text-primaryText'
                }`}
              >
                Outlines
              </button>
              <button 
                onClick={() => setShowDimensions(!showDimensions)}
                className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold transition-all ${
                  showDimensions 
                    ? 'bg-purpleAccent/10 border-purpleAccent/30 text-purpleAccent' 
                    : 'bg-white/5 border-themeBorder text-mutedText hover:text-primaryText'
                }`}
              >
                Labels
              </button>
              <button 
                onClick={handleFitToScreen}
                className="h-8 px-2.5 bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText font-bold rounded-lg text-[10px] flex items-center gap-1"
                title="Fit to Screen"
              >
                <Maximize2 className="h-3 w-3" /> Fit
              </button>
              <button 
                onClick={() => { setScale(1.0); setPan({ x: 0, y: 0 }); setRotation(0); }}
                className="h-8 px-2.5 bg-white/5 border border-themeBorder text-mutedText hover:text-primaryText font-bold rounded-lg text-[10px] flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>

          {/* DRAGGABLE SVG/CANVAS VIEWPORT */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-[380px] rounded-3xl bg-background border border-themeBorder overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            <div className="absolute inset-0 pattern-grid opacity-10 pointer-events-none" />
            
            {item.file_type === 'pdf' ? (
              <div className="relative flex items-center justify-center w-full h-full">
                {pdfLoading && (
                  <div className="absolute inset-0 bg-[#0b0f19]/90 flex flex-col items-center justify-center text-mutedText z-20 gap-4 p-6 animate-pulse">
                    <div className="w-48 h-[220px] bg-secondaryBg rounded-lg shadow-2xl border border-themeBorder flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-cyanAccent animate-spin" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-mutedText font-bold uppercase tracking-wider">Rendering CAD Document...</span>
                      <span className="text-[9px] text-gray-500">Retrieving vector layers</span>
                    </div>
                  </div>
                )}
                {pdfError ? (
                  <div className="flex flex-col items-center justify-center text-mutedText p-8 text-center gap-3 relative z-20">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                    <span className="text-xs font-bold text-rose-400">Unable to preview this pattern.</span>
                    <button 
                      onClick={() => setRetryCount(prev => prev + 1)}
                      className="px-4 py-2 bg-white/5 border border-themeBorder hover:bg-white/10 text-primaryText rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry Loading
                    </button>
                  </div>
                ) : (
                  <div 
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                      transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.1, 0.8, 0.3, 1)'
                    }}
                    className="flex items-center justify-center"
                  >
                    <canvas ref={canvasRef} className="max-h-[340px] max-w-full object-contain bg-white shadow-xl rounded" />
                  </div>
                )}
              </div>
            ) : (
              <svg 
                width="100%" 
                height="100%" 
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.1, 0.8, 0.3, 1)'
                }}
              >
                {/* Outer drawing boundary board */}
                <rect 
                  width="74%" 
                  height="74%" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="1" 
                  strokeDasharray="4"
                  x="13%"
                  y="13%"
                />

                {hasAnalysis && meta.polygons && (
                  <g>
                    {meta.polygons.map((poly: number[][], idx: number) => {
                      const isHovered = hoveredPolyIdx === idx;
                      const ptsStr = poly.map(p => `${p[0] * 1.6 + 50},${p[1] * 1.6 + 50}`).join(" ");
                      const color = getPolyColor(idx);
                      
                      return (
                        <polygon 
                          key={idx}
                          points={ptsStr}
                          onMouseEnter={(e) => {
                            setHoveredPolyIdx(idx);
                            setTooltipPos({ x: e.clientX - 20, y: e.clientY - 260 });
                          }}
                          onMouseLeave={() => setHoveredPolyIdx(null)}
                          fill={showOutlines ? (isHovered ? `${color}30` : `${color}15`) : 'none'}
                          stroke={color}
                          strokeWidth={isHovered ? '2' : '1'}
                          className="cursor-pointer transition-colors"
                        />
                      );
                    })}
                  </g>
                )}

                {/* Default empty visual grid if unanalyzed */}
                {!hasAnalysis && (
                  <text x="50%" y="50%" fill="#475569" textAnchor="middle" fontSize="12" fontFamily="monospace">
                    Click 'Analyze Pattern' to extract coordinate panels
                  </text>
                )}
              </svg>
            )}

            {/* Hover details tooltip card */}
            {hasAnalysis && hoveredPolyIdx !== null && meta.polygons[hoveredPolyIdx] && (
              <div 
                className="absolute glass-panel p-3 rounded-xl border-themeBorder z-50 text-[10px] text-secondaryText w-44 pointer-events-none flex flex-col gap-1 shadow-2xl"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`
                }}
              >
                <span className="font-extrabold text-primaryText uppercase tracking-wider">Panel Piece #{hoveredPolyIdx + 1}</span>
                <span className="text-cyanAccent font-bold">Estimated Area: {(getPolygonArea(meta.polygons[hoveredPolyIdx]) / 100).toFixed(1)} cm²</span>
                <span className="font-mono text-mutedText">Vertices Count: {meta.polygons[hoveredPolyIdx].length}</span>
              </div>
            )}
            
            {/* Page display slider indicators */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-2 bg-secondaryBg/60 rounded-xl border border-themeBorder text-[9px] text-mutedText backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-6 w-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-primaryText disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-6 w-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-primaryText disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <button 
                onClick={handleDownloadOriginal}
                className="flex items-center gap-1 text-cyanAccent hover:text-primaryText font-bold transition-colors"
              >
                <Download className="h-3 w-3" /> Original file
              </button>
            </div>
          </div>

        </div>

        {/* METADATA & RESULTS SIDEBAR */}
        <div className="flex flex-col gap-5">
          
          {/* PATTERN DETAILS METADATA CARD */}
          <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-4 text-xs">
            <h4 className="font-bold text-primaryText uppercase tracking-wider pb-1.5 border-b border-themeBorder">CAD Extraction Specs</h4>
            
            <div className="flex flex-col gap-3 text-secondaryText">
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500 font-semibold">File Type Format</span>
                <span className="text-primaryText font-semibold font-mono uppercase">{item.file_type}</span>
              </div>
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500 font-semibold">File Size Bounds</span>
                <span className="text-primaryText font-semibold font-mono">{(item.file_size/1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500 font-semibold">Upload Date Log</span>
                <span className="text-primaryText font-semibold">{new Date(item.upload_date).toLocaleDateString()}</span>
              </div>
              {hasAnalysis && (
                <>
                  <div className="flex justify-between border-b border-themeBorder pb-2">
                    <span className="text-gray-500 font-semibold">Sheet Dimensions</span>
                    <span className="text-primaryText font-mono font-semibold">{meta.dimensions}</span>
                  </div>
                  <div className="flex justify-between border-b border-themeBorder pb-2">
                    <span className="text-gray-500 font-semibold">Creator Tag</span>
                    <span className="text-primaryText font-semibold">{meta.creator}</span>
                  </div>
                  <div className="flex justify-between border-b border-themeBorder pb-2">
                    <span className="text-gray-500 font-semibold">Paper Standard</span>
                    <span className="text-cyanAccent font-extrabold">{meta.paper_size}</span>
                  </div>
                </>
              )}
            </div>
            
            {!hasAnalysis && (
              <button 
                onClick={startPatternAnalysis}
                className="w-full py-3 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 font-bold rounded-xl text-primaryText shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Cpu className="h-4.5 w-4.5" />
                Analyze Pattern Layout
              </button>
            )}
          </div>

          {/* ANALYSIS RESULTS EXTRACTION STATS CARD */}
          {hasAnalysis && (
            <div className="glass-panel p-5 rounded-2xl border-themeBorder flex flex-col gap-4 text-xs bg-background/40">
              <h4 className="font-bold text-cyanAccent uppercase tracking-wider pb-1.5 border-b border-cyanAccent/10 flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-cyanAccent" /> AI Analysis Results
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-secondaryText">
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Pattern Pieces</span>
                  <span className="text-sm font-black text-cyanAccent">{meta.pieces_count} pieces</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Total Fabric Area</span>
                  <span className="text-sm font-black text-emerald-400">{meta.fabric_area} m²</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Avg Piece Area</span>
                  <span className="text-sm font-black text-primaryText">{meta.average_piece_size} m²</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Largest Piece</span>
                  <span className="text-sm font-black text-cyanAccent">{meta.largest_piece_size} m²</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Smallest Piece</span>
                  <span className="text-sm font-black text-primaryText">{meta.smallest_piece_size} m²</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Est. Fabric Req.</span>
                  <span className="text-sm font-black text-purpleAccent">{(meta.fabric_area * 1.15).toFixed(2)} m²</span>
                </div>
                <div className="p-3 bg-white/5 border border-themeBorder rounded-xl flex flex-col gap-0.5 col-span-2">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Material Recommendation</span>
                  <span className="text-xs font-bold text-yellow-500">{meta.material_type || 'Cotton / Polyester Blend'}</span>
                </div>
              </div>

              <div className="p-3 bg-cyanAccent/5 border border-cyanAccent/10 rounded-xl flex items-center justify-between text-cyanAccent">
                <span className="font-bold text-[9px] uppercase">Confidence Score:</span>
                <span className="font-black font-sans">{meta.confidence_score}%</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
