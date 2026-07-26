import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { adminApi, getErrorMessage } from '../../api';
import { X, ShieldAlert, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_REASONS = [
  'Gian lận thời gian học (Anti-Cheat / Time Spoofing)',
  'Tạo session thủ công bất thường / Cày XP',
  'Vi phạm quy chuẩn cộng đồng',
  'Spam / Tài khoản giả mạo'
];

export default function BanUserModal({ user, onClose, onSuccess }) {
  const [reason, setReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleBan = async (e) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? customReason.trim() : reason;

    try {
      setIsSubmitting(true);
      setError(null);
      await adminApi.banUser(user.userId || user.id, finalReason);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi cấm tài khoản:', err);
      setError(getErrorMessage(err, 'Lỗi cấm tài khoản người dùng'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {user && (
        <div key="ban-modal-backdrop" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <motion.div
            key="ban-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto scrollbar-thin"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-200">Cấm Tài Khoản Người Dùng</h3>
                <p className="text-xs text-slate-400">Khóa truy cập và vô hiệu hóa JWT token ngay lập tức</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target User info */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Tài khoản bị cấm:</span>
              <strong className="text-slate-100 font-bold">{user.displayName}</strong>
              <span className="text-slate-400 block font-mono text-[11px]">{user.email}</span>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-indigo-300 font-bold border border-slate-700">
              Lvl {user.currentLevel || 1}
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleBan} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Chọn lý do cấm (Preset):
              </label>
              <div className="space-y-2">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setReason(preset); setCustomReason(''); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all border ${
                      reason === preset && !customReason
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Hoặc nhập lý do tùy chỉnh:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do chi tiết..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang khóa...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Xác nhận Cấm Tài Khoản
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
