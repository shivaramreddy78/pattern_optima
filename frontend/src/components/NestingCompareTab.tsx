"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Grid, 
  FileText, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Trash2,
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import NestingResultsDashboard from './NestingResultsDashboard';

interface UploadItem {
  id: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

interface PlacedShape {
  id: string;
  x: number;
  y: number;
  rotation: number;
  points: number[][];
}

interface NestingResponse {
  job_id?: number;
  status: string;
  fabric_width: number;
  fabric_height: number;
  utilization_percentage: number;
  waste_percentage: number;
  saved_area: number;
  saved_money: number;
  optimized_layout: PlacedShape[];
  algorithm_used: string;
  processing_time: number;
}

interface NestingCompareTabProps {
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onSaveJobToHistory: (job: any) => void;
  preselectedFileId?: string | null;
}

export default function NestingCompareTab({ addToast, onSaveJobToHistory, preselectedFileId }: NestingCompareTabProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  
  // Selection and constraints inputs
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [fabricWidth, setFabricWidth] = useState<number>(120);
  const [algorithm, setAlgorithm] = useState<string>("Skyline");
  const [margin, setMargin] = useState<number>(2.0);
  
  // Optimization execution states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'result'>('select');
  const [result, setResult] = useState<NestingResponse | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Zoom / Pan transformation state for interactive SVG viewports
  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch library uploads
  useEffect(() => {
    async function loadLibrary() {
      try {
        const res = await apiClient.get('/uploads');
        setUploads(res.data);
        // Initialize default quantities of 1 for files
        const qtys: Record<string, number> = {};
        res.data.forEach((file: UploadItem) => {
          qtys[file.id] = 2; // Default to 2 pattern pieces
        });
        setQuantities(qtys);
        
        // Auto-select if transitioning from preview
        if (preselectedFileId) {
          setSelectedUploads([preselectedFileId]);
        }
      } catch (err) {
        addToast('Failed to load uploads library catalog.', 'error');
      } finally {
        setLoadingUploads(false);
      }
    }
    loadLibrary();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedUploads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleQtyChange = (id: string, val: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, val)
    }));
  };

  const triggerOptimization = async () => {
    if (selectedUploads.length === 0) {
      addToast('Select at least one pattern file to optimize.', 'warning');
      return;
    }
    
    setIsOptimizing(true);
    setStep('processing');
    setProcessingProgress(15);

    // Simulate animated processing step percentages
    const progressTimer = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev < 90) return prev + 15;
        return prev;
      });
    }, 400);

    try {
      const res = await apiClient.post('/nesting/optimize-uploads', {
        upload_ids: selectedUploads,
        fabric_width: fabricWidth,
        fabric_height: 0.0, // continuous fabric bin
        algorithm: algorithm,
        margin: margin,
        quantities: quantities
      });

      clearInterval(progressTimer);
      setProcessingProgress(100);
      
      // Wait a moment for success checkmark animation
      setTimeout(() => {
        setResult(res.data);
        setStep('result');
        setIsOptimizing(false);
        addToast('Nesting layout compacted successfully!', 'success');
        
        // Sync history tab inside dashboard layout
        if (res.data) {
          // Trigger mock log save
          onSaveJobToHistory({
            id: res.data.job_id || Math.floor(Math.random() * 1000) + 200,
            name: `Batch Nesting (${algorithm})`,
            fabric_width: fabricWidth,
            fabric_height: res.data.fabric_height,
            status: "completed",
            utilization_percentage: res.data.utilization_percentage,
            waste_percentage: res.data.waste_percentage,
            saved_area: res.data.saved_area,
            saved_money: res.data.saved_money,
            algorithm_used: res.data.algorithm_used,
            created_at: new Date().toISOString()
          });
        }
      }, 800);
      
    } catch (err: any) {
      clearInterval(progressTimer);
      setStep('select');
      setIsOptimizing(false);
      const errDetail = err.response?.data?.detail || 'Computational nesting failed.';
      addToast(errDetail, 'error');
    }
  };

  // Zoom / Pan callbacks
  const handleZoom = (factor: number) => {
    setScale(prev => Math.max(0.25, Math.min(prev * factor, 5.0)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (step !== 'result') return;
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    handleZoom(factor);
  };

  const handleResetView = () => {
    setScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Color assignments
  const getColor = (idx: number) => {
    const colorsList = ["#06b6d4", "#a855f7", "#10b981", "#fbbf24", "#3b82f6"];
    return colorsList[idx % colorsList.length];
  };

  return (
    <div className="w-full flex flex-col gap-6 text-xs text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1 border-b border-themeBorder pb-4">
        <h3 className="font-extrabold text-sm text-primaryText">AI Compaction Solver</h3>
        <p className="text-mutedText">Select uploaded pattern files and run computational nested layouts.</p>
      </div>

      {step === 'select' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* SELECT UPLOADS GRID */}
          <div className="xl:col-span-2 glass-panel rounded-2xl p-5 flex flex-col gap-4">
            <h4 className="font-bold text-primaryText uppercase tracking-wider pb-2 border-b border-themeBorder">Select Pattern Library Files</h4>
            
            {loadingUploads ? (
              <div className="flex flex-col items-center py-12 gap-2 text-mutedText">
                <Loader2 className="h-6 w-6 text-cyanAccent animate-spin" />
                <span>Scanning pattern catalog...</span>
              </div>
            ) : uploads.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center gap-3">
                <p className="text-mutedText">You must upload pattern files before nesting.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1">
                {uploads.map(file => {
                  const isSelected = selectedUploads.includes(file.id);
                  return (
                    <div 
                      key={file.id} 
                      onClick={() => handleToggleSelect(file.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'border-cyanAccent bg-cyanAccent/5' 
                          : 'border-themeBorder bg-background/60 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => {}} // toggled on card click
                          className="rounded border-themeBorder text-cyanAccent focus:ring-cyanAccent"
                        />
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-bold text-primaryText truncate max-w-[150px]">{file.original_filename}</span>
                          <span className="text-[9px] text-gray-500">{file.file_type.toUpperCase()} • {(file.file_size/1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                      
                      {/* Quantity input inside card */}
                      {isSelected && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] text-gray-500 font-semibold uppercase">Qty:</span>
                          <input 
                            type="number" 
                            min="1"
                            value={quantities[file.id] || 1}
                            onChange={(e) => handleQtyChange(file.id, parseInt(e.target.value))}
                            className="w-10 text-center py-1 bg-white/5 border border-themeBorder rounded-lg text-primaryText font-bold"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PARAMETERS SETTINGS CARD */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 h-fit">
            <h4 className="font-bold text-primaryText uppercase tracking-wider pb-2 border-b border-themeBorder">Nesting Options</h4>
            
            <div className="flex flex-col gap-3.5">
              
              {/* Width */}
              <div className="flex flex-col gap-1.5">
                <label className="text-mutedText font-semibold">Fabric Roll Width (cm)</label>
                <input 
                  type="number"
                  value={fabricWidth}
                  onChange={(e) => setFabricWidth(parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-themeBorder focus:border-cyanAccent text-primaryText font-mono"
                />
              </div>

              {/* Margins */}
              <div className="flex flex-col gap-1.5">
                <label className="text-mutedText font-semibold">Buffer Margin Space (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  value={margin}
                  onChange={(e) => setMargin(parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-themeBorder focus:border-cyanAccent text-primaryText font-mono"
                />
              </div>

              {/* Algorithm selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-mutedText font-semibold">Nesting Packing Solver</label>
                <select 
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-themeBorder focus:border-cyanAccent text-primaryText font-bold"
                >
                  <option value="Skyline">Skyline Pack (Tighter yield)</option>
                  <option value="Guillotine">Guillotine Pack (Simple cut)</option>
                  <option value="Shelf">Shelf Pack (Default box)</option>
                </select>
              </div>

              <button 
                onClick={triggerOptimization}
                className="w-full py-3 bg-gradient-to-r from-electric to-cyanAccent hover:from-blue-700 hover:to-cyan-600 font-bold rounded-xl text-primaryText shadow-lg active:scale-98 transition-all mt-2 flex items-center justify-center gap-2"
              >
                <Cpu className="h-4.5 w-4.5" />
                Solve Nesting Layout
              </button>

            </div>
          </div>

        </div>
      )}

      {/* ANIMATED COMPACTION PROCESSING PAGE */}
      {step === 'processing' && (
        <div className="glass-panel rounded-3xl p-16 flex flex-col items-center justify-center text-center gap-6 min-h-[350px]">
          <div className="h-16 w-16 rounded-full bg-cyanAccent/5 border border-cyanAccent/10 flex items-center justify-center text-cyanAccent relative shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          
          <div className="flex flex-col gap-1.5 max-w-sm">
            <h4 className="font-extrabold text-sm text-primaryText animate-pulse">Running Packing Algorithms</h4>
            <p className="text-mutedText">Detecting shape collisions, solving boundary rectangles, and applying Shapely geometric compaction...</p>
          </div>

          <div className="w-64 bg-secondaryBg h-2 rounded-full overflow-hidden border border-themeBorder">
            <div className="bg-cyanAccent h-full rounded-full transition-all duration-300" style={{ width: `${processingProgress}%` }} />
          </div>
          <span className="text-cyanAccent font-bold font-mono">{processingProgress}%</span>
        </div>
      )}

      {step === 'result' && result && (
        <NestingResultsDashboard 
          result={result}
          onBack={() => setStep('select')}
          addToast={addToast}
        />
      )}

    </div>
  );
}
