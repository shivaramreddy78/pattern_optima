"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const duration = {
    success: 3000,
    info: 3000,
    warning: 4000,
    error: 5000
  }[toast.type];

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const remainingRef = React.useRef(duration);
  const startRef = React.useRef(0);

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onClose();
    }, remainingRef.current);
  };

  const pauseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
    info: <Info className="h-4 w-4 text-cyanAccent shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
  };

  const bgStyles = {
    success: 'bg-emerald-950/90 border-emerald-500/20 text-emerald-200 shadow-emerald-950/20',
    error: 'bg-rose-950/90 border-rose-500/20 text-rose-200 shadow-rose-950/20',
    info: 'bg-cyan-950/90 border-cyan-500/20 text-cyan-200 shadow-cyan-950/20',
    warning: 'bg-yellow-950/90 border-yellow-500/20 text-yellow-200 shadow-yellow-950/20'
  };

  return (
    <motion.div
      layout
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.3 } }}
      className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${bgStyles[toast.type]} text-xs`}
    >
      <div className="flex items-start gap-3">
        {icons[toast.type]}
        <div className="flex flex-col text-left pr-2 leading-tight">
          {toast.message.split('\n').map((line, idx) => (
            <span key={idx} className={idx === 0 ? "font-bold text-primaryText text-[11px]" : "text-mutedText text-[10px] mt-0.5 font-medium leading-relaxed"}>
              {line}
            </span>
          ))}
        </div>
      </div>
      <button 
        onClick={onClose}
        className="text-mutedText hover:text-primaryText transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
