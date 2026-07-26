import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, getErrorMessage } from '../../api';
import { X, RotateCcw, AlertTriangle, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResetUserXpModal({ user, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirmReset = async () => {
    if (!user) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await adminApi.resetUserProgress(user.userId || user.id);
      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi reset kết quả người dùng:', err);
      setError(getErrorMessage(err, 'Lỗi reset kết quả người dùng'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {user && (
        <div key="reset-xp-modal-backdrop" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            key="reset-xp-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden text-slate-100"
          >
            {/* Top ambient glow */}
            <div className="absolute -top-16 -left-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-950/50 shrink-0">
                <RotateCcw className="w-6 h-6 animate-spin-slow text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-amber-200">Reset Kết Quả Học Tập</h3>
                <p className="text-xs text-slate-400">Cảnh báo thao tác nguy hiểm (Reset XP)</p>
              </div>
            </div>

            {/* Success View */}
            {isSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <h4 className="text-base font-bold text-emerald-200">Reset Kết Quả Thành Công!</h4>
                <p className="text-xs text-slate-300">
                  Đã đưa XP của người dùng <strong>{user.displayName}</strong> về 0 và cập nhật lại cấp độ.
                </p>
              </div>
            ) : (
              <>
                {/* Target User Info */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tài khoản được chọn:</span>
                      <strong className="text-slate-100 font-bold text-sm">{user.displayName}</strong>
                      <span className="text-slate-400 block font-mono text-[11px]">{user.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 text-xs">
                        Lvl {user.currentLevel || 1}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-1 font-mono">
                        {user.totalXp || 0} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning Alert Banner */}
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>⚠️ Cảnh Báo Xóa Dữ Liệu:</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 leading-relaxed pl-6">
                    Thao tác này sẽ đặt lại cấp độ về <strong>Level 1</strong>, đưa <strong>XP về 0</strong> và <strong>xóa toàn bộ lịch sử học tập</strong> của người dùng này.
                  </p>
                  <p className="text-[11px] font-bold text-amber-300/90 pl-6 italic">
                    Hành động này không thể hoàn tác!
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-amber-950/60 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang Reset...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Xác Nhận Reset 0 XP
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
