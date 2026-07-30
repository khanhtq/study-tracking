import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, Crown, Sparkles, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';

export default function PaymentResultModal({ isOpen, onClose, status, orderId, onGoHome }) {
  const { t } = useLanguage();

  React.useEffect(() => {
    if (isOpen && status === 'SUCCESS') {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) { /* ignore */ }
    }
  }, [isOpen, status]);

  if (!isOpen) return null;

  const isSuccess = status === 'SUCCESS';

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md glass-panel bg-slate-900/95 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 overflow-hidden text-center space-y-6"
        >
          {/* Background Ambient Glow */}
          <div className={`absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isSuccess ? 'bg-amber-500/20' : 'bg-rose-500/20'
          }`} />

          {/* Icon Badge */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl ${
                isSuccess
                  ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-amber-500/30'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-400 shadow-rose-500/20'
              }`}>
                {isSuccess ? (
                  <Crown className="w-12 h-12 fill-slate-950" />
                ) : (
                  <XCircle className="w-12 h-12" />
                )}
              </div>
              {isSuccess && (
                <Sparkles className="w-7 h-7 text-amber-300 absolute -top-3 -right-3 animate-bounce" />
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              {isSuccess ? t('payment_success_title') : t('payment_failed_title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              {isSuccess ? t('payment_success_desc') : t('payment_failed_desc')}
            </p>
            {orderId && (
              <span className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-[11px] font-mono text-amber-400">
                {t('payment_order_code')} {orderId}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                onClose();
                if (onGoHome) onGoHome();
              }}
              className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSuccess
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              <Home className="w-4.5 h-4.5" />
              <span>{t('btn_back_to_home')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
