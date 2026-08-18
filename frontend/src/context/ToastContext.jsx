import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Loader2 
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

  // --- Toast API ---
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title = '', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newToast = { id, type, message, title, duration };
    setToasts((prev) => [...prev.slice(-4), newToast]); // Limit to 5 max simultaneous toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, title, duration) => addToast('success', msg, title, duration),
    error: (msg, title, duration) => addToast('error', msg, title, duration),
    warning: (msg, title, duration) => addToast('warning', msg, title, duration),
    info: (msg, title, duration) => addToast('info', msg, title, duration),
    remove: removeToast
  };

  // --- Confirm Modal API (Promise-based) ---
  const confirm = useCallback(({
    title = 'Xác nhận thao tác',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    type = 'danger' // 'danger' | 'warning' | 'info'
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        resolve
      });
    });
  }, []);

  const handleConfirmClose = (result) => {
    if (confirmDialog?.resolve) {
      confirmDialog.resolve(result);
    }
    setConfirmDialog(null);
  };

  // --- Alert Modal API (Promise-based) ---
  const alertModal = useCallback(({
    title = 'Thông báo',
    message = '',
    buttonText = 'Đã hiểu',
    type = 'info' // 'info' | 'warning' | 'error' | 'success'
  }) => {
    return new Promise((resolve) => {
      setAlertDialog({
        isOpen: true,
        title,
        message,
        buttonText,
        type,
        resolve
      });
    });
  }, []);

  const handleAlertClose = () => {
    if (alertDialog?.resolve) {
      alertDialog.resolve(true);
    }
    setAlertDialog(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm, alertModal }}>
      {children}

      {/* --- Global Toast Stack --- */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            const isWarning = t.type === 'warning';

            const bgStyles = isSuccess
              ? 'bg-slate-900/95 dark:bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
              : isError
              ? 'bg-slate-900/95 dark:bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-950/40'
              : isWarning
              ? 'bg-slate-900/95 dark:bg-slate-900/95 border-amber-500/40 text-amber-300 shadow-amber-950/40'
              : 'bg-slate-900/95 dark:bg-slate-900/95 border-indigo-500/40 text-indigo-300 shadow-indigo-950/40';

            const iconColor = isSuccess
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
              : isError
              ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              : isWarning
              ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 w-full ${bgStyles}`}
              >
                <div className={`p-2 rounded-xl flex-shrink-0 ${iconColor}`}>
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isWarning && <AlertTriangle className="w-4 h-4" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
                </div>

                <div className="flex-1 overflow-hidden pt-0.5 min-w-0">
                  {t.title && (
                    <h4 className="text-xs font-bold text-slate-100 mb-0.5 truncate">
                      {t.title}
                    </h4>
                  )}
                  <p className="text-xs text-slate-200 leading-relaxed font-medium break-words">
                    {t.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* --- Global Confirm Modal --- */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-2xl flex-shrink-0 ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {confirmDialog.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                  {confirmDialog.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                  {confirmDialog.type !== 'danger' && confirmDialog.type !== 'warning' && <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-sm font-bold text-slate-100 mb-1">{confirmDialog.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{confirmDialog.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                    confirmDialog.type === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : confirmDialog.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  <span>{confirmDialog.confirmText}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Global Alert Modal --- */}
      <AnimatePresence>
        {alertDialog?.isOpen && (
          <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-3 rounded-2xl flex-shrink-0 ${
                  alertDialog.type === 'error'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : alertDialog.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : alertDialog.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                  {alertDialog.type === 'error' && <AlertCircle className="w-5 h-5" />}
                  {alertDialog.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                  {alertDialog.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                  {alertDialog.type !== 'error' && alertDialog.type !== 'warning' && alertDialog.type !== 'success' && <Info className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <h3 className="text-sm font-bold text-slate-100 mb-1">{alertDialog.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{alertDialog.message}</p>
                </div>

                <button
                  type="button"
                  onClick={handleAlertClose}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleAlertClose}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  {alertDialog.buttonText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
