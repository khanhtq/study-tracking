import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ChatToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 3500;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isInfo = !isSuccess && !isError && !isWarning;

  const bgStyles = isSuccess
    ? 'bg-slate-900/95 border-emerald-500/40 shadow-emerald-950/40 text-emerald-300'
    : isError
    ? 'bg-slate-900/95 border-rose-500/40 shadow-rose-950/40 text-rose-300'
    : isWarning
    ? 'bg-slate-900/95 border-amber-500/40 shadow-amber-950/40 text-amber-300'
    : 'bg-slate-900/95 border-indigo-500/40 shadow-indigo-950/40 text-indigo-300';

  const iconColor = isSuccess
    ? 'text-emerald-400 bg-emerald-500/10'
    : isError
    ? 'text-rose-400 bg-rose-500/10'
    : isWarning
    ? 'text-amber-400 bg-amber-500/10'
    : 'text-indigo-400 bg-indigo-500/10';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 15, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`fixed bottom-5 right-5 z-[9999] max-w-sm w-full p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 ${bgStyles}`}
      >
        <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
          {isSuccess && <CheckCircle2 className="w-4 h-4" />}
          {isError && <AlertCircle className="w-4 h-4" />}
          {isWarning && <AlertTriangle className="w-4 h-4" />}
          {isInfo && <Info className="w-4 h-4" />}
        </div>

        <div className="flex-1 overflow-hidden pt-0.5">
          {toast.title && (
            <h4 className="text-xs font-bold text-slate-100 mb-0.5 truncate">
              {toast.title}
            </h4>
          )}
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {toast.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
