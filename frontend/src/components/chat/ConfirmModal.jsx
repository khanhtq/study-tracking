import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  const iconBg = isDanger
    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    : isWarning
    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';

  const confirmBtnBg = isDanger
    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
    : isWarning
    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl flex-shrink-0 ${iconBg}`}>
              {isDanger && <AlertTriangle className="w-5 h-5" />}
              {isWarning && <AlertCircle className="w-5 h-5" />}
              {!isDanger && !isWarning && <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-sm font-bold text-slate-100 mb-1">{title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
            </div>

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg disabled:opacity-50 ${confirmBtnBg}`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
