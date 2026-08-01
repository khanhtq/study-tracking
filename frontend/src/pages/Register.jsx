import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../api';
import { ShieldAlert, UserPlus, LogIn, Flame, Sun, Moon } from 'lucide-react';

export default function Register({ onToggleView, onBackToLanding, onNavigateVerifyOtp }) {
  const { register, loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setError(t('error_display_name_required'));
      return false;
    }
    if (trimmedDisplayName.length < 2 || trimmedDisplayName.length > 50) {
      setError(t('error_display_name_length'));
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('error_email_required'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t('error_email_invalid'));
      return false;
    }

    if (!password) {
      setError(t('error_password_required'));
      return false;
    }
    if (password.length < 6) {
      setError(t('error_password_min_length'));
      return false;
    }

    if (!confirmPassword) {
      setError(t('error_confirm_password_required'));
      return false;
    }
    if (password !== confirmPassword) {
      setError(t('error_confirm_password_mismatch'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const res = await register(email.trim(), password, displayName.trim());
      if (res?.requiresVerification && onNavigateVerifyOtp) {
        onNavigateVerifyOtp(res.email || email.trim());
      }
    } catch (err) {
      setError(getErrorMessage(err, 'register_failed', t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Settings Panel (Theme & Language Toggle) */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-slate-900/50 hover:bg-slate-900 text-slate-300 border border-slate-800/80 backdrop-blur-md rounded-2xl px-3 py-2 text-sm font-semibold outline-none cursor-pointer hover:text-indigo-500 transition-colors shadow-lg"
          title={t('language')}
        >
          <option value="vi" className="bg-slate-950 text-slate-300">Tiếng Việt</option>
          <option value="en" className="bg-slate-950 text-slate-300">English</option>
          <option value="zh" className="bg-slate-950 text-slate-300">简体中文</option>
        </select>

        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-indigo-500 border border-slate-800/80 backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer shadow-lg"
          title={theme === 'light' ? t('theme_dark') : t('theme_light')}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-indigo-600" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20" />
          )}
        </button>
      </div>

      {/* Decorative gradient glowing balls */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel glass-panel-glow rounded-3xl p-8 z-10 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-bounce-slow">
            <Flame className="w-8 h-8 text-white fill-white/20" />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-gradient-start to-text-gradient-end tracking-tight">
            {t('register_title')}
          </h2>
          <p className="text-slate-400 mt-2 text-sm text-center">
            {t('register_subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-200 text-sm rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('display_name')}
            </label>
            <input
              type="text"
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder={t('display_name')}
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('email')}
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('password')}
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t('confirm_password')}
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('register_btn')}</span>
                <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-950 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider absolute">
              HOẶC
            </span>
          </div>

          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  setLoading(true);
                  setError('');
                  try {
                    await loginWithGoogle(credentialResponse.credential);
                  } catch (err) {
                    setError(getErrorMessage(err, 'register_failed', t));
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              onError={() => {
                setError('Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
              }}
              theme={theme === 'light' ? 'outline' : 'filled_black'}
              shape="pill"
              size="large"
              text="signup_with"
              locale="vi"
            />
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-900/50 flex flex-col gap-3 text-center text-sm text-slate-400">
          <div>
            {t('already_have_account')}{' '}
            <button
              onClick={onToggleView}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              {t('login_now')} <LogIn className="w-4 h-4" />
            </button>
          </div>
          <div>
            <button
              onClick={onBackToLanding}
              className="text-slate-500 hover:text-slate-300 font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              &larr; {t('landing_back_to_home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
