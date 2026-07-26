import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, getErrorMessage } from '../../api';
import { X, Unlock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UnbanUserModal({ user, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleUnban = async () => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await adminApi.unbanUser(user.userId || user.id);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi mở khóa tài khoản:', err);
      setError(getErrorMessage(err, 'Lỗi mở khóa tài khoản người dùng'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {user && (
        <div key="unban-modal-backdrop" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            key="unban-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto scrollbar-thin text-slate-100"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-200">Mở Khóa Tài Khoản</h3>
                <p className="text-xs text-slate-400">Cho phép người dùng đăng nhập và tiếp tục học tập</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User info card */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Tài khoản được mở khóa:</span>
                <strong className="text-slate-100 font-bold text-sm">{user.displayName}</strong>
                <span className="text-slate-400 block font-mono text-[11px]">{user.email}</span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                Lvl {user.currentLevel || 1}
              </span>
            </div>

            {user.banReason && (
              <div className="pt-2 border-t border-slate-800/80 text-rose-300/90 text-[11px]">
                <span className="font-bold block text-slate-400">Lý do cấm trước đó:</span>
                <span className="italic">"{user.banReason}"</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleUnban}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang mở khóa...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận Mở Khóa
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
