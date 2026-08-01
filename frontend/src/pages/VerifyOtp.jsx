import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api';

export default function VerifyOtp({ email, onBackToLogin, onBackToRegister, onSuccess }) {
  const { verifyOtp, resendOtp } = useAuth();
  const { t } = useLanguage();

  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Total 5 minutes expiration countdown (300 seconds)
  const [totalTimer, setTotalTimer] = useState(300);
  
  // Resend OTP Cooldown timer (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, []);

  // 5-minute total expiration timer tick
  useEffect(() => {
    if (totalTimer <= 0) return;
    const interval = setInterval(() => {
      setTotalTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [totalTimer]);

  // 60-second resend cooldown timer tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto advance focus to next input box
    if (value && index < 3 && inputRefs[index + 1].current) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs[index - 1].current) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{4}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      setError('');
      if (inputRefs[3].current) {
        inputRefs[3].current.focus();
      }
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 4) {
      setError(t('error_otp_required'));
      return;
    }

    if (totalTimer <= 0) {
      setError(t('error_otp_expired'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await verifyOtp(email, otpCode);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await resendOtp(email);
      setSuccessMessage(res?.message || 'Mã OTP mới đã được gửi tới email của bạn!');
      setOtp(['', '', '', '']);
      setResendCooldown(60);
      setTotalTimer(300); // Reset 5 min timer on fresh OTP resend
      if (inputRefs[0].current) {
        inputRefs[0].current.focus();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setResendLoading(false);
    }
  };


  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Xác minh Email</h2>
          <p className="text-slate-400 text-sm mt-1">
            Mã OTP 4 chữ số đã được gửi tới địa chỉ:
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-indigo-300 font-medium text-xs">
            <Mail className="w-3.5 h-3.5" />
            <span>{email || 'email-cua-ban@example.com'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* 4 OTP Input Boxes */}
        <form onSubmit={handleVerify}>
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-14 h-16 text-center text-2xl font-bold font-mono rounded-2xl border transition-all duration-200 focus:outline-none ${
                  digit 
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 shadow-lg shadow-indigo-500/20' 
                    : 'border-slate-700/80 bg-slate-950/60 text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
            ))}
          </div>

          {/* 5-minute Timer indicator */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-6 bg-slate-950/40 px-4 py-2.5 rounded-xl border border-slate-800/60">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Thời hạn OTP:</span>
            </span>
            <span className={`font-mono font-semibold ${totalTimer <= 60 ? 'text-amber-400 animate-pulse' : 'text-indigo-400'}`}>
              {totalTimer > 0 ? formatTime(totalTimer) : 'Đã hết hạn (5:00)'}
            </span>
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={loading || otp.join('').length < 4 || totalTimer <= 0}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>Xác minh & Tiếp tục</span>
            )}
          </button>
        </form>

        {/* Resend OTP Section with 1-min Cooldown */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center flex flex-col items-center gap-3">
          <p className="text-slate-400 text-xs">
            Bạn chưa nhận được mã xác minh?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendLoading}
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
            {resendCooldown > 0 ? (
              <span>Gửi lại mã OTP ({resendCooldown}s)</span>
            ) : (
              <span>Gửi lại mã OTP</span>
            )}
          </button>
        </div>

        {/* Back navigation */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBackToLogin || onBackToRegister}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang đăng nhập</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
