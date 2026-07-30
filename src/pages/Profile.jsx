import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { userApi, leaderboardApi, paymentApi, getErrorMessage } from '../api';
import AvatarUploader from '../components/AvatarUploader';
import SEO from '../components/SEO';
import PremiumUpgradeModal from '../components/PremiumUpgradeModal';
import { Sun, Moon, ArrowLeft, User, Shield, Trophy, Settings, Lock, Check, Globe, LogOut, Crown, Sparkles, Music, BarChart3, Clock, CreditCard } from 'lucide-react';

export default function Profile({ onBackToDashboard }) {
  const { user, progress, refreshUserProgress, logout, togglePremium } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'titles' | 'preferences'
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Profile Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(60);
  const [favoriteSubjects, setFavoriteSubjects] = useState('');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences & RPG Titles state
  const [selectedTitle, setSelectedTitle] = useState('Tân Binh Tập Trung');
  const [themeAccent, setThemeAccent] = useState('indigo');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [activityStatusVisibility, setActivityStatusVisibility] = useState('EVERYONE');
  const [messagePermission, setMessagePermission] = useState('EVERYONE');
  const [availableTitles, setAvailableTitles] = useState([]);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setDailyGoalMinutes(user.dailyGoalMinutes || 60);
      setFavoriteSubjects(user.favoriteSubjects || '');
      setSelectedTitle(user.selectedTitle || 'Tân Binh Tập Trung');
      setThemeAccent(user.themeAccent || 'indigo');
      setSoundEnabled(user.soundEnabled !== undefined ? user.soundEnabled : true);
      setPreferredLanguage(user.preferredLanguage || language || 'en');
      setActivityStatusVisibility(user.activityStatusVisibility || progress?.activityStatusVisibility || 'EVERYONE');
      setMessagePermission(user.messagePermission || progress?.messagePermission || 'EVERYONE');
    }
  }, [user, progress, language]);

  const [userRank, setUserRank] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    userApi
      .getAvailableTitles()
      .then((titles) => setAvailableTitles(titles))
      .catch((err) => console.warn('Could not load titles:', err));

    leaderboardApi
      .getMyRank()
      .then((rankData) => setUserRank(rankData))
      .catch((err) => console.warn('Could not load user rank:', err));
  }, []);

  useEffect(() => {
    if (activeTab === 'premium') {
      paymentApi
        .getHistory()
        .then((history) => setPaymentHistory(history || []))
        .catch((err) => console.warn('Could not load payment history:', err));
    }
  }, [activeTab]);

  const handleUpdateProfile = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await userApi.updateProfile({
        displayName,
        bio,
        dailyGoalMinutes: parseInt(dailyGoalMinutes, 10),
        favoriteSubjects,
        selectedTitle,
        themeAccent,
        soundEnabled,
        preferredLanguage,
        activityStatusVisibility,
        messagePermission,
      });
      if (preferredLanguage && preferredLanguage !== language) {
        setLanguage(preferredLanguage);
      }
      await refreshUserProgress();
      setSuccessMsg(t('profile_toast_info_success'));
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadAvatarFile = async (file) => {
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await userApi.uploadAvatar(file);
      await refreshUserProgress();
      setSuccessMsg(t('profile_toast_avatar_success'));
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPresetAvatar = async (avatarUrl) => {
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await userApi.updateProfile({ avatarUrl });
      await refreshUserProgress();
      setSuccessMsg(t('profile_toast_preset_avatar_success'));
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await userApi.changePassword(currentPassword, newPassword, confirmPassword);
      setSuccessMsg(t('profile_toast_password_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTitle = async (titleName) => {
    setSelectedTitle(titleName);
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await userApi.updateProfile({ selectedTitle: titleName });
      await refreshUserProgress();
      setSuccessMsg(`${t('profile_toast_title_success')} "${titleName}".`);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'error_unknown', t));
    } finally {
      setIsLoading(false);
    }
  };

  const getFullAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
    return `${backendOrigin}${url}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <SEO title={t('profile_seo_title')} description={t('profile_seo_desc')} />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Back & Theme/Logout Navigation */}
        <div className="flex items-center justify-between gap-4">
          {onBackToDashboard ? (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-indigo-400 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('back_to_dashboard')}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-500 border border-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-md"
              title={theme === 'light' ? t('theme_dark') : t('theme_light')}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-indigo-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              )}
            </button>

            <button
              onClick={async () => {
                setIsLoggingOut(true);
                await logout();
              }}
              disabled={isLoggingOut}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700/50 text-rose-400 hover:text-rose-300 rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoggingOut ? '...' : t('logout')}</span>
            </button>
          </div>
        </div>

        {/* Header Profile Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="relative flex flex-col items-center">
              {/* Avatar circle + Level Badge outside overflow-hidden */}
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-indigo-500/30 overflow-hidden bg-slate-950 shadow-xl flex items-center justify-center text-slate-400">
                  {user?.avatarUrl ? (
                    <img
                      src={getFullAvatarUrl(user.avatarUrl)}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.displayName || 'User'}`;
                      }}
                    />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
                {/* Level Badge - Đặt ngoài overflow-hidden để không bị cắt chữ */}
                <span className="absolute bottom-0 right-0 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-900 shadow-md whitespace-nowrap">
                  {t('level_short')} {progress?.currentLevel ?? user?.currentLevel ?? 1}
                </span>
              </div>

              {/* Global Rank Badge ngay dưới Avatar - Tương thích cả Light & Dark theme và Đa ngôn ngữ */}
              {userRank && (
                <div className="mt-3.5 inline-flex items-center gap-1.5 bg-amber-500/15 dark:bg-amber-500/10 border border-amber-600/40 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-extrabold px-3.5 py-1.5 rounded-full shadow-md shadow-amber-500/10 backdrop-blur-sm">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-400/30 animate-pulse shrink-0" />
                  <span className="whitespace-nowrap">
                    {userRank.rank > 0 ? `${t('global_rank')} #${userRank.rank}` : t('global_rank_unranked')}
                    {userRank.totalUsers > 0 && (
                      <span className="text-[10px] text-amber-800/80 dark:text-amber-300/70 font-normal ml-1">
                        ({userRank.totalUsers} {t('global_rank_total_users')})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
                  <span>{user?.displayName || t('profile_user_default')}</span>
                  {user?.isPremium && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black flex items-center gap-1 shadow-md shadow-amber-500/10">
                      <Crown className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                      VIP
                    </span>
                  )}
                </h1>
                {user?.selectedTitle && (
                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {t('title_' + user.selectedTitle) || user.selectedTitle}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1 font-medium">{user?.email}</p>
              {user?.bio && <p className="text-slate-300 text-xs mt-2 italic">"{user.bio}"</p>}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4 text-xs">
                <span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                  {t('profile_total_xp')} <strong className="text-amber-400">{(progress?.totalXp ?? user?.totalXp ?? 0).toLocaleString()} XP</strong>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                  {t('profile_daily_goal')} <strong className="text-indigo-400">{user?.dailyGoalMinutes || 60} {t('minutes')}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Success / Error Toast Messages */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-2xl flex items-center justify-between text-sm shadow-lg">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-slate-100 font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-400 px-4 py-3 rounded-2xl flex items-center justify-between text-sm shadow-lg">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-slate-100 font-bold ml-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto no-scrollbar gap-2 sm:gap-4 pb-2">
          {[
            { id: 'profile', label: t('profile_tab_info'), icon: User },
            { id: 'premium', label: t('profile_tab_premium'), icon: Crown },
            { id: 'security', label: t('profile_tab_security'), icon: Lock },
            { id: 'titles', label: t('profile_tab_titles'), icon: Trophy },
            { id: 'preferences', label: t('profile_tab_preferences'), icon: Settings },
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSuccessMsg('');
                  setErrorMsg('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Profile Information & Avatar */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <AvatarUploader
              currentAvatarUrl={user?.avatarUrl}
              onUploadFile={handleUploadAvatarFile}
              onSelectPreset={handleSelectPresetAvatar}
              isLoading={isLoading}
            />

            <form onSubmit={handleUpdateProfile} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                <span>{t('profile_edit_info')}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_display_name_label')}</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder={t('profile_display_name_placeholder')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_daily_goal_label')}</label>
                  <select
                    value={dailyGoalMinutes}
                    onChange={(e) => setDailyGoalMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={30}>{t('profile_goal_30')}</option>
                    <option value={60}>{t('profile_goal_60')}</option>
                    <option value={90}>{t('profile_goal_90')}</option>
                    <option value={120}>{t('profile_goal_120')}</option>
                    <option value={180}>{t('profile_goal_180')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_favorite_subjects_label')}</label>
                <input
                  type="text"
                  value={favoriteSubjects}
                  onChange={(e) => setFavoriteSubjects(e.target.value)}
                  placeholder={t('profile_favorite_subjects_placeholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_bio_label')}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={255}
                  placeholder={t('profile_bio_placeholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <span className="text-[10px] text-slate-400 float-right mt-1">{bio.length}/255 {t('profile_char_limit')}</span>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isLoading ? t('profile_saving') : t('profile_btn_save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB VIP PREMIUM */}
        {activeTab === 'premium' && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent p-6 rounded-2xl border border-amber-500/30">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                  <Crown className="w-10 h-10 text-slate-950 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{t('premium_badge_vip')}</h3>
                    {user?.isPremium && (
                      <span className="px-3 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-extrabold animate-pulse">
                        {t('profile_vip_active_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {t('premium_modal_subtitle')}
                  </p>
                </div>
              </div>

              {user?.isPremium ? (
                <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs flex items-center gap-2 shrink-0 shadow-md">
                  <Crown className="w-4.5 h-4.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>{t('profile_vip_active_badge')}</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsPremiumModalOpen(true)}
                  className="px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 shadow-amber-500/20 active:scale-95"
                >
                  <Crown className="w-4 h-4 fill-slate-950" />
                  <span>{t('profile_btn_upgrade_vip')}</span>
                </button>
              )}
            </div>

            {/* Premium Perks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{t('perk_scientific_timer')}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Ultradian 90/20, Rule 52/17 & Active Recall Flow.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{t('perk_unlimited_lofi')}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    YouTube Lofi, Piano, Ambient.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{t('perk_weekly_chart')}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    7 Days detailed study analytics.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{t('perk_xp_bonus')}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    +15% XP Bonus & 👑 VIP badge.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment History Section */}
            <div className="pt-6 border-t border-slate-800/80 space-y-4">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-amber-400" />
                <span>{t('payment_history_title')}</span>
              </h4>

              {paymentHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">
                  {t('payment_history_no_orders')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">{t('payment_col_order_id')}</th>
                        <th className="py-2.5 px-3">{t('payment_col_package')}</th>
                        <th className="py-2.5 px-3">{t('payment_col_amount')}</th>
                        <th className="py-2.5 px-3">{t('payment_col_status')}</th>
                        <th className="py-2.5 px-3">{t('payment_col_date')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paymentHistory.map((item) => (
                        <tr key={item.orderId} className="hover:bg-slate-950/40">
                          <td className="py-3 px-3 font-mono font-bold text-amber-400">{item.orderId}</td>
                          <td className="py-3 px-3 font-semibold text-slate-200">{item.packageName}</td>
                          <td className="py-3 px-3 font-bold text-emerald-400">{(item.amount || 0).toLocaleString()}đ</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : item.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : item.status === 'EXPIRED'
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {item.status === 'SUCCESS'
                                ? t('payment_status_success')
                                : item.status === 'PENDING'
                                ? t('payment_status_pending')
                                : item.status === 'EXPIRED'
                                ? t('payment_status_expired')
                                : t('payment_status_failed')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Security & Password Management */}
        {activeTab === 'security' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              <span>{t('profile_security_title')}</span>
            </h3>

            {user?.authProvider === 'GOOGLE' ? (
              <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6 text-center space-y-3">
                <Shield className="w-10 h-10 text-indigo-400 mx-auto" />
                <h4 className="text-slate-100 font-bold text-base">{t('profile_google_title')}</h4>
                <p className="text-slate-400 text-xs max-w-md mx-auto">
                  {t('profile_google_desc')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_current_password')}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_new_password')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">{t('profile_confirm_password')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-all cursor-pointer"
                >
                  {isLoading ? t('profile_processing') : t('profile_btn_change_password')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: RPG Titles & Badges */}
        {activeTab === 'titles' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-500" />
                <span>{t('profile_titles_title')}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {t('profile_titles_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {availableTitles.map((tItem) => {
                const isSelected = selectedTitle === tItem.title;
                return (
                  <div
                    key={tItem.title}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      tItem.unlocked
                        ? isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-100">{t('title_' + tItem.title) || tItem.title}</span>
                        {tItem.unlocked ? (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> {t('profile_title_unlocked')}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 font-medium">{t('profile_title_req_lvl')} {tItem.minLevelRequired}</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mb-4">{t('title_desc_' + tItem.title) || tItem.description}</p>
                    </div>

                    {tItem.unlocked && (
                      <button
                        onClick={() => handleSelectTitle(tItem.title)}
                        disabled={isSelected || isLoading}
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white cursor-default'
                            : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                        }`}
                      >
                        {isSelected ? t('profile_title_equipped') : t('profile_title_equip_btn')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: UI Preferences */}
        {activeTab === 'preferences' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              <span>{t('profile_preferences_title')}</span>
            </h3>

            <div className="space-y-6">
              {/* System Language Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>{t('profile_system_language_label')}</span>
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(e.target.value);
                    setLanguage(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-800 text-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 w-full sm:w-72"
                >
                  <option value="vi">Tiếng Việt (Vietnamese)</option>
                  <option value="en">English (English)</option>
                  <option value="zh">简体中文 (Chinese)</option>
                </select>
              </div>

              {/* Theme Toggle Card */}
              <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {t('profile_theme_mode_title')}: {theme === 'light' ? t('profile_theme_light_label') : t('profile_theme_dark_label')}
                    </h4>
                    <p className="text-xs text-slate-400">{t('profile_theme_mode_desc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
                >
                  {theme === 'light' ? t('theme_dark') : t('theme_light')}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3">{t('profile_theme_accent_label')}</label>
                <div className="flex flex-wrap gap-4">
                  {[
                    { id: 'indigo', name: t('profile_accent_indigo'), bg: 'bg-indigo-600' },
                    { id: 'emerald', name: t('profile_accent_emerald'), bg: 'bg-emerald-600' },
                    { id: 'rose', name: t('profile_accent_rose'), bg: 'bg-rose-600' },
                    { id: 'amber', name: t('profile_accent_amber'), bg: 'bg-amber-600' },
                    { id: 'purple', name: t('profile_accent_purple'), bg: 'bg-purple-600' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setThemeAccent(color.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        themeAccent === color.id
                          ? 'border-indigo-500 bg-slate-800 text-slate-100 shadow-lg ring-2 ring-indigo-500/50'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${color.bg}`} />
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800 rounded-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">{t('profile_sound_fx_title')}</h4>
                  <p className="text-xs text-slate-400">{t('profile_sound_fx_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                    soundEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Activity Status Privacy Setting */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  <span>{t('profile_privacy_status_title')}</span>
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  {t('profile_privacy_status_desc')}
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'EVERYONE', title: t('profile_privacy_everyone_title'), desc: t('profile_privacy_everyone_desc') },
                    { id: 'FRIENDS_ONLY', title: t('profile_privacy_friends_title'), desc: t('profile_privacy_friends_desc') },
                    { id: 'NOBODY', title: t('profile_privacy_nobody_title'), desc: t('profile_privacy_nobody_desc') },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        activityStatusVisibility === opt.id
                          ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="activityStatusVisibility"
                        value={opt.id}
                        checked={activityStatusVisibility === opt.id}
                        onChange={(e) => setActivityStatusVisibility(e.target.value)}
                        className="mt-1 accent-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{opt.title}</span>
                        <span className="text-[11px] text-slate-400">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message Permission Privacy Setting */}
              <div className="pt-4 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  <span>{t('profile_message_permission_title')}</span>
                </label>
                <p className="text-xs text-slate-400 mb-3">
                  {t('profile_message_permission_desc')}
                </p>
                <div className="space-y-2">
                  {[
                    { id: 'EVERYONE', title: t('profile_msg_everyone_title'), desc: t('profile_msg_everyone_desc') },
                    { id: 'FRIENDS_ONLY', title: t('profile_msg_friends_title'), desc: t('profile_msg_friends_desc') },
                    { id: 'NOBODY', title: t('profile_msg_nobody_title'), desc: t('profile_msg_nobody_desc') },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        messagePermission === opt.id
                          ? 'bg-slate-800/90 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="messagePermission"
                        value={opt.id}
                        checked={messagePermission === opt.id}
                        onChange={(e) => setMessagePermission(e.target.value)}
                        className="mt-1 accent-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-100 block">{opt.title}</span>
                        <span className="text-[11px] text-slate-400">{opt.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Account Logout Section */}
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t('logout')}</span>
                  </h4>
                  <p className="text-xs text-slate-400">{t('profile_logout_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoggingOut(true);
                    await logout();
                  }}
                  disabled={isLoggingOut}
                  className="px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/30 text-rose-400 hover:text-white text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? '...' : t('logout')}</span>
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl transition-all cursor-pointer"
                >
                  {isLoading ? t('profile_saving') : t('profile_btn_save_settings')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <PremiumUpgradeModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
}
