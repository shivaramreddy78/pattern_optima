"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  X, 
  Loader2, 
  FileCode,
  Image as ImageIcon,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface UploadedFileMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  status: string;
}

interface PatternPreviewProps {
  file: UploadedFileMetadata;
  onClose: () => void;
  onAnalyzeSuccess: (analyzedFile: UploadedFileMetadata, metadata: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function PatternPreview({ file, onClose, onAnalyzeSuccess, addToast }: PatternPreviewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  
  // Expose backend static files path
  const API_STATIC_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '/static/uploads') || 'http://localhost:8000/static/uploads';

  // pdf.js rendering states
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.async = true;
      script.onload = () => {
        setPdfjs((window as any)['pdfjsLib']);
      };
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!pdfjs || file.file_type !== 'pdf') return;

    let active = true;
    async function renderPDF() {
      setPdfLoading(true);
      setPdfError(false);
      try {
        const url = `${API_STATIC_URL}/${file.filename}`;
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        setPdfTotalPages(pdf.numPages);
        
        const page = await pdf.getPage(pdfPage);
        if (!active) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        const viewport = page.getViewport({ scale: 1.0 });
        const containerWidth = canvas.parentElement?.clientWidth || 300; 
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: scaledViewport
        }).promise;
        
        if (active) setPdfLoading(false);
      } catch (err) {
        console.error("PDF Render Error:", err);
        if (active) {
          setPdfError(true);
          setPdfLoading(false);
        }
      }
    }
    
    renderPDF();
    return () => { active = false; };
  }, [pdfjs, pdfPage, file]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await apiClient.post(`/uploads/${file.id}/analyze`);
      addToast('Pattern analyzed successfully.', 'success');
      // Pass the analyzed metadata back up to Dashboard to transition to Optimizer
      onAnalyzeSuccess(file, res.data);
    } catch (err: any) {
      addToast(err.response?.data?.detail || 'Analysis failed.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full flex flex-col gap-6 text-xs text-left">
      <div className="flex items-center justify-between glass-panel p-4 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-themeBorder flex items-center justify-center">
            {file.file_type === 'dxf' ? (
              <FileCode className="h-5 w-5 text-cyanAccent" />
            ) : ['png', 'jpg', 'jpeg'].includes(file.file_type) ? (
              <ImageIcon className="h-5 w-5 text-purpleAccent" />
            ) : (
              <FileText className="h-5 w-5 text-emerald-400" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-primaryText">{file.original_filename}</h3>
            <p className="text-mutedText text-xs">Uploaded on {new Date(file.upload_date).toLocaleDateString()}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="h-8 w-8 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-mutedText hover:text-primaryText transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PREVIEW RENDERER */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-themeBorder pb-3">
            <h4 className="font-bold text-sm text-primaryText flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-cyanAccent" />
              Document Preview
            </h4>
            
            {file.file_type === 'pdf' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                  disabled={pdfPage <= 1}
                  className="h-6 w-6 rounded bg-white/5 disabled:opacity-30 flex items-center justify-center hover:bg-white/10"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-mutedText font-bold min-w-[30px] text-center">
                  {pdfPage} / {pdfTotalPages}
                </span>
                <button 
                  onClick={() => setPdfPage(p => Math.min(pdfTotalPages, p + 1))}
                  disabled={pdfPage >= pdfTotalPages}
                  className="h-6 w-6 rounded bg-white/5 disabled:opacity-30 flex items-center justify-center hover:bg-white/10"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="w-full bg-background/80 rounded-2xl border border-themeBorder min-h-[400px] flex items-center justify-center relative overflow-hidden">
            {file.file_type === 'pdf' ? (
              <>
                {pdfLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 text-cyanAccent animate-spin" />
                    <span className="text-mutedText font-bold text-xs">Rendering Vector PDF...</span>
                  </div>
                )}
                {pdfError ? (
                  <div className="text-rose-400 font-semibold flex flex-col items-center gap-2">
                    <X className="h-8 w-8" />
                    Could not render PDF preview
                  </div>
                ) : (
                  <canvas ref={canvasRef} className="max-w-full shadow-2xl rounded" />
                )}
              </>
            ) : ['png', 'jpg', 'jpeg', 'svg'].includes(file.file_type) ? (
              <img 
                src={`${API_STATIC_URL}/${file.filename}`}
                alt="Pattern Preview"
                className="max-w-full max-h-[500px] object-contain rounded"
              />
            ) : (
              <div className="text-mutedText font-medium flex flex-col items-center gap-3">
                <FileCode className="h-12 w-12 opacity-50" />
                Preview not available for {file.file_type.toUpperCase()} files
              </div>
            )}
          </div>
        </div>

        {/* METADATA & ACTIONS */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4">
            <h4 className="font-bold text-sm text-primaryText border-b border-themeBorder pb-3">File Information</h4>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500">File Type</span>
                <span className="text-primaryText font-bold uppercase">{file.file_type}</span>
              </div>
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500">File Size</span>
                <span className="text-primaryText font-bold">{formatBytes(file.file_size)}</span>
              </div>
              <div className="flex justify-between border-b border-themeBorder pb-2">
                <span className="text-gray-500">System ID</span>
                <span className="text-mutedText font-mono text-[9px]">{file.id.split('-')[0]}...</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 flex flex-col gap-5 border-cyanAccent/20 bg-gradient-to-b from-cyanAccent/5 to-transparent">
            <div className="flex flex-col gap-1">
              <h4 className="font-bold text-sm text-primaryText flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyanAccent" />
                AI Analysis Engine
              </h4>
              <p className="text-[11px] text-mutedText leading-relaxed mt-1">
                Run Pattern Optima's geometry extraction engine to parse the CAD vectors, identify part boundaries, and prepare the shapes for nested optimization.
              </p>
            </div>
            
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full py-3.5 px-4 bg-cyanAccent hover:bg-cyanAccent/90 text-slate-900 font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting Geometry...
                </>
              ) : (
                <>
                  <Cpu className="h-4 w-4" />
                  Analyze Pattern Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
