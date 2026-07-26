import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, AlertTriangle, LogOut, Mail, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BannedUserNoticeModal({ banNotice, onLogout }) {
  const reason = !banNotice
    ? ''
    : typeof banNotice === 'string'
    ? banNotice
    : banNotice.reason || banNotice.message || 'Vi phạm quy chuẩn cộng đồng.';

  return createPortal(
    <AnimatePresence>
      {banNotice && (
        <div key="banned-screen-backdrop" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl overflow-y-auto">
          <motion.div
            key="banned-screen-card"
            initial={{ opacity: 0, scale: 0.9, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 25 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-lg bg-slate-900/90 border border-rose-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden text-slate-100 backdrop-blur-2xl"
          >
            {/* Top ambient glow */}
            <div className="absolute -top-20 -left-20 w-56 h-56 bg-rose-500/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header section */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xl shadow-rose-950/60 relative">
                <ShieldAlert className="w-10 h-10 text-rose-400 animate-pulse" />
                <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-full border border-rose-500/40">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-rose-200 tracking-tight">Tài Khoản Đã Bị Cấm</h2>
                <p className="text-xs text-rose-400/80 font-semibold tracking-wider uppercase mt-1">
                  Account Suspended
                </p>
              </div>
            </div>

            {/* Ban Reason Highlight Card */}
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2.5 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-extrabold text-rose-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Lý do bị cấm từ Ban Quản Trị:</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-rose-500/20">
                <p className="text-sm font-bold text-rose-100 leading-relaxed italic break-words">
                  "{reason}"
                </p>
              </div>
            </div>

            {/* Support / Guidelines Notice */}
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <p className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Tài khoản của bạn tạm thời không thể tham gia hệ thống. Nếu bạn tin rằng đây là sự nhầm lẫn, vui lòng gửi khiếu nại qua email hỗ trợ của Ban Quản Trị.
                </span>
              </p>
            </div>

            {/* Log Out Action Button */}
            <div className="pt-2">
              <button
                onClick={onLogout}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm shadow-xl shadow-rose-950/80 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <LogOut className="w-5 h-5" />
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
