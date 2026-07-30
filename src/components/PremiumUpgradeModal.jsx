import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, Check, X, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { paymentApi } from '../api';

const DEFAULT_PACKAGES = [
  { id: '1_MONTH', name: '1 Tháng', price: '20.000đ', tagName: null },
  { id: '3_MONTHS', name: '3 Tháng', price: '50.000đ', tagName: 'Phổ biến 🔥' },
  { id: '1_YEAR', name: '1 Năm', price: '180.000đ', tagName: 'Tiết kiệm 25% ⚡' },
];

export default function PremiumUpgradeModal({ isOpen, onClose, featureName }) {
  const { togglePremium } = useAuth();
  const { t } = useLanguage();
  const [selectedPackage, setSelectedPackage] = useState('3_MONTHS');
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingTrial, setLoadingTrial] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const loadPackages = async () => {
      try {
        const data = await paymentApi.getActivePackages();
        if (data && data.length > 0) {
          const formatted = data.map(p => ({
            id: p.id,
            name: p.name,
            price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.priceVnd),
            tagName: p.tagName,
          }));
          setPackages(formatted);
          if (!formatted.some(p => p.id === selectedPackage)) {
            setSelectedPackage(formatted[0].id);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải gói thanh toán từ server, dùng gói mặc định:', err);
      }
    };
    loadPackages();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVnPayPayment = async () => {
    setLoadingPayment(true);
    try {
      const res = await paymentApi.createVnPayUrl(selectedPackage);
      if (res && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      }
    } catch (err) {
      console.error('Lỗi tạo URL thanh toán VNPay:', err);
      alert('Không thể kết nối cổng thanh toán VNPay. Vui lòng thử lại sau.');
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleFreeTrial = async () => {
    setLoadingTrial(true);
    try {
      await togglePremium();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrial(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg glass-panel bg-slate-900/95 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                <Crown className="w-10 h-10 text-slate-950 fill-slate-950" />
              </div>
              <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2 animate-bounce" />
            </div>

            <div>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-1">
                {t('premium_badge_vip')}
              </span>
              <h2 className="text-2xl font-black text-white">
                {t('premium_modal_title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {t('premium_modal_subtitle')}
              </p>
            </div>
          </div>

          {/* Package Selection Cards */}
          <div className="space-y-2.5 mb-6">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {t('premium_select_package')}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 to-yellow-500/10 border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    {(pkg.tagName || pkg.tagKey) && (
                      <span className="absolute -top-2.5 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[9px] rounded-full shadow-sm">
                        {pkg.tagName || t(pkg.tagKey)}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-200 mt-1">{pkg.name || t(pkg.nameKey)}</span>
                    <span className="text-sm font-black text-amber-300 mt-0.5">{pkg.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feature Perks Summary */}
          <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('perk_scientific_timer')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('perk_unlimited_lofi')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('perk_weekly_chart')}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('perk_xp_bonus')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleVnPayPayment}
              disabled={loadingPayment}
              className="w-full py-4 px-6 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loadingPayment ? (
                <span>{t('btn_connecting_vnpay')}</span>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 fill-slate-950" />
                  <span>{t('btn_vnpay_pay')}</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleFreeTrial}
                disabled={loadingTrial}
                className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                {loadingTrial ? '...' : t('btn_free_trial_3d')}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
              >
                {t('btn_close')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
