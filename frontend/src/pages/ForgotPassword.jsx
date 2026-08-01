import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api';

export default function ForgotPassword({ onBackToLogin }) {
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();
  const { t } = useLanguage();

  // Step 1: Email Input | Step 2: 4-Digit OTP Verification | Step 3: New Password Input
  const [step, setStep] = useState(1);
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 2 Timers: 5-minute total expiration & 60-second resend cooldown
  const [totalTimer, setTotalTimer] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Focus first input when stepping into Step 2
  useEffect(() => {
    if (step === 2 && inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [step]);

  // 5-minute timer tick for Step 2
  useEffect(() => {
    if (step !== 2 || totalTimer <= 0) return;
    const interval = setInterval(() => {
      setTotalTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, totalTimer]);

  // 60-second cooldown timer tick for Step 2
  useEffect(() => {
    if (step !== 2 || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendCooldown]);

  // Handle Step 1 Submit: Request Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('error_email_required'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t('error_email_invalid'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await forgotPassword(trimmedEmail);
      setSuccessMessage(res?.message || 'Mã OTP khôi phục mật khẩu đã được gửi tới email của bạn.');
      setTotalTimer(300);
      setResendCooldown(60);
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Input Changes for Step 2
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 3 && inputRefs[index + 1].current) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs[index - 1].current) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
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

  // Handle Step 2 Submit: Verify Reset OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
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
      await verifyResetOtp(email.trim(), otpCode);
      setSuccessMessage('Xác minh mã OTP thành công! Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP in Step 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await forgotPassword(email.trim());
      setSuccessMessage(res?.message || 'Mã OTP mới đã được gửi tới email của bạn!');
      setOtp(['', '', '', '']);
      setResendCooldown(60);
      setTotalTimer(300);
      if (inputRefs[0].current) {
        inputRefs[0].current.focus();
      }
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setResendLoading(false);
    }
  };

  // Handle Step 3 Submit: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setError(t('error_password_required'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('error_password_min_length'));
      return;
    }
    if (!confirmPassword) {
      setError(t('error_confirm_password_required'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('error_confirm_password_mismatch'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const otpCode = otp.join('');
      const res = await resetPassword(email.trim(), otpCode, newPassword);
      setSuccessMessage(res?.message || 'Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        onBackToLogin();
      }, 1800);
    } catch (err) {
      setError(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setLoading(false);
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/15 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-rose-500' : 'bg-slate-700'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-rose-500' : 'bg-slate-700'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === 3 ? 'w-8 bg-rose-500' : 'bg-slate-700'}`} />
        </div>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4 text-rose-400 shadow-lg shadow-rose-500/10">
            {step === 1 && <KeyRound className="w-8 h-8" />}
            {step === 2 && <ShieldCheck className="w-8 h-8" />}
            {step === 3 && <Lock className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
            {step === 1 && 'Quên mật khẩu?'}
            {step === 2 && 'Xác minh mã OTP'}
            {step === 3 && 'Đặt lại mật khẩu mới'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 && 'Nhập email đã đăng ký của bạn để nhận mã khôi phục.'}
            {step === 2 && 'Nhập mã OTP 4 chữ số được gửi tới email:'}
            {step === 3 && 'Nhập mật khẩu mới cho tài khoản của bạn.'}
          </p>
          {step > 1 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-rose-300 font-medium text-xs">
              <Mail className="w-3.5 h-3.5" />
              <span>{email}</span>
            </div>
          )}
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

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                required
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg shadow-rose-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Gửi mã xác minh OTP</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter 4-Digit OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className={`w-14 h-16 text-center text-2xl font-bold font-mono rounded-2xl border transition-all duration-200 focus:outline-none ${
                    digit 
                      ? 'border-rose-500 bg-rose-950/40 text-rose-200 shadow-lg shadow-rose-500/20' 
                      : 'border-slate-700/80 bg-slate-950/60 text-slate-100 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
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
              <span className={`font-mono font-semibold ${totalTimer <= 60 ? 'text-amber-400 animate-pulse' : 'text-rose-400'}`}>
                {totalTimer > 0 ? formatTime(totalTimer) : 'Đã hết hạn (5:00)'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 4 || totalTimer <= 0}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg shadow-rose-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Xác minh mã OTP</span>
              )}
            </button>

            {/* Resend OTP Section with 1-min Cooldown */}
            <div className="mt-6 pt-6 border-t border-slate-800/80 text-center flex flex-col items-center gap-3">
              <p className="text-slate-400 text-xs">
                Chưa nhận được mã?
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resendLoading}
                className="inline-flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? (
                  <span>Gửi lại mã OTP ({resendCooldown}s)</span>
                ) : (
                  <span>Gửi lại mã OTP</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Enter New Password & Confirm */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                required
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg shadow-rose-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận đặt lại mật khẩu</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Back Navigation */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang đăng nhập</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
