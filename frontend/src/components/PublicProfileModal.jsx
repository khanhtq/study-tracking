import React, { useState, useEffect } from 'react';
import { userApi, friendsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { X, Award, Flame, Clock, CheckCircle2, BookOpen, Loader2, Sparkles, User, Calendar, UserPlus, Check, MessageSquare, Lock, Unlock, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BanUserModal from './admin/BanUserModal';
import UnbanUserModal from './admin/UnbanUserModal';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${cleanUrl}`;
};

export default function PublicProfileModal({ userId, onClose, onOpenChat }) {
  const { t } = useLanguage();
  const { toast, confirm } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [userToUnban, setUserToUnban] = useState(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setImgErr(false);

    userApi.getPublicProfile(userId)
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Lỗi tải hồ sơ công khai:', err);
          setError(err.message || 'Không thể tải thông tin hồ sơ.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const formatHours = (minutes) => {
    if (!minutes) return `0 ${t('minutes')}`;
    const hrs = (minutes / 60).toFixed(1);
    return `${hrs} ${t('hour')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto scrollbar-thin">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg glass-panel rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden relative my-8"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all border border-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-indigo-500 dark:text-indigo-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-medium">{t('loading_account')}</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6" />
              </div>
              <p className="text-slate-100 font-semibold mb-2">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-100 text-sm font-medium hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          ) : profile ? (
            <div>
              {/* Header Cover Banner */}
              <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 relative border-b border-slate-800/80 overflow-hidden">
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/10 dark:bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 dark:bg-purple-500/15 rounded-full blur-3xl" />
              </div>

              {/* User Identity Section */}
              <div className="px-6 pb-6 pt-0 relative">
                <div className="flex justify-between items-end -mt-12 mb-4">
                  {/* Avatar & Status Container */}
                  <div className="flex items-end gap-3">
                    <div className="shrink-0">
                      {profile.avatarUrl && !imgErr ? (
                        <img
                          src={getFullAvatarUrl(profile.avatarUrl)}
                          alt={profile.displayName}
                          onError={() => setImgErr(true)}
                          className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl bg-slate-800"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-800 dark:from-indigo-900 dark:to-purple-950 border-4 border-slate-900 shadow-xl flex items-center justify-center font-black text-2xl text-white dark:text-indigo-200">
                          {initials}
                        </div>
                      )}
                    </div>

                    {/* Online status indicator next to avatar */}
                    <div
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm mb-1 ${
                        profile.isStudying
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : profile.isOnline
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          profile.isStudying
                            ? 'bg-emerald-500 animate-pulse'
                            : profile.isOnline
                            ? 'bg-indigo-500'
                            : 'bg-slate-500'
                        }`}
                      />
                      {profile.isStudying
                        ? t('member_status_studying')
                        : profile.isOnline
                        ? t('member_status_online')
                        : t('member_status_offline')}
                    </div>
                  </div>

                  {/* Level Pill */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-3.5 py-1 rounded-xl bg-amber-500/10 dark:bg-gradient-to-r dark:from-amber-500/20 dark:to-indigo-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('level_short')} {profile.currentLevel || 1}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {profile.currentXp || 0} / {profile.xpRequiredForNextLevel || 100} XP
                    </span>
                  </div>
                </div>

                {/* Display Name & Selected Title */}
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                    <span>{profile.displayName}</span>
                    {profile.isPremium && (
                      <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black flex items-center gap-1 shadow-md shadow-amber-500/10">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                        VIP
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t('title_' + (profile.selectedTitle || 'Tân Binh Tập Trung')) || profile.selectedTitle || 'Tân Binh Tập Trung'}</span>
                  </div>
                </div>

                {/* Active Session Alert (If currently studying) */}
                {profile.isStudying && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {t('member_status_studying')}
                      </p>
                      <p className="text-sm font-semibold text-slate-100">
                        {profile.currentSubject || t('timer_placeholder')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3.5 rounded-2xl bg-slate-950/40 dark:bg-slate-950/50 border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t('member_total_time')}
                      </span>
                      <span className="text-sm font-black text-slate-100">
                        {formatHours(profile.totalStudyTimeMinutes)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/40 dark:bg-slate-950/50 border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t('member_streak')}
                      </span>
                      <span className="text-sm font-black text-amber-700 dark:text-amber-400">
                        {profile.streakDays || 0} {t('days')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/40 dark:bg-slate-950/50 border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t('member_total_sessions')}
                      </span>
                      <span className="text-sm font-black text-slate-100">
                        {profile.totalSessionsCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/40 dark:bg-slate-950/50 border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        {t('total_xp')}
                      </span>
                      <span className="text-sm font-black text-slate-100">
                        {profile.totalXp || 0} XP
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio / Goal */}
                <div className="p-4 rounded-2xl bg-slate-950/30 dark:bg-slate-950/40 border border-slate-800/60 mb-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {t('member_bio_title')}
                  </h4>
                  <p className="text-sm text-slate-100 leading-relaxed italic">
                    {profile.studyGoal ? `"${profile.studyGoal}"` : t('member_no_bio')}
                  </p>
                </div>

                {/* Friend & Message Action Section */}
                {profile.friendshipStatus !== 'SELF' && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {onOpenChat && (
                      <button
                        onClick={() => {
                          onOpenChat({
                            userId: profile.userId || userId,
                            displayName: profile.displayName,
                            avatarUrl: profile.avatarUrl,
                            selectedTitle: profile.selectedTitle,
                            currentLevel: profile.currentLevel,
                          });
                          onClose();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Nhắn tin</span>
                      </button>
                    )}

                    {!isAdmin && (
                      <div className="flex items-center gap-2">
                        {profile.friendshipStatus === 'NONE' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await friendsApi.sendRequest(userId);
                                setProfile({ ...profile, friendshipStatus: 'PENDING_SENT', friendshipId: res?.friendshipId });
                                toast.success('Đã gửi lời mời kết bạn thành công!');
                              } catch (err) {
                                toast.error(err.message || 'Không thể gửi lời mời kết bạn.');
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Kết bạn</span>
                          </button>
                        )}

                        {profile.friendshipStatus === 'PENDING_SENT' && (
                          <button
                            onClick={async () => {
                              try {
                                if (profile.friendshipId) await friendsApi.declineRequest(profile.friendshipId);
                                setProfile({ ...profile, friendshipStatus: 'NONE', friendshipId: null });
                                toast.info('Đã hủy lời mời kết bạn.');
                              } catch (err) {
                                toast.error(err.message || 'Không thể hủy lời mời.');
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Đã gửi lời mời (Hủy)</span>
                          </button>
                        )}

                        {profile.friendshipStatus === 'PENDING_RECEIVED' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  if (profile.friendshipId) await friendsApi.acceptRequest(profile.friendshipId);
                                  setProfile({ ...profile, friendshipStatus: 'FRIENDS' });
                                  toast.success('Đã chấp nhận lời mời kết bạn!');
                                } catch (err) {
                                  toast.error(err.message || 'Không thể đồng ý kết bạn.');
                                }
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Chấp nhận</span>
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  if (profile.friendshipId) await friendsApi.declineRequest(profile.friendshipId);
                                  setProfile({ ...profile, friendshipStatus: 'NONE', friendshipId: null });
                                  toast.info('Đã từ chối lời mời kết bạn.');
                                } catch (err) {
                                  toast.error(err.message || 'Lỗi xử lý.');
                                }
                              }}
                              className="px-3.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}

                        {profile.friendshipStatus === 'FRIENDS' && (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Bạn bè</span>
                            </span>
                            <button
                              onClick={async () => {
                                const isConfirmed = await confirm({
                                  title: 'Hủy kết bạn',
                                  message: 'Bạn có chắc chắn muốn hủy kết bạn với người dùng này không?',
                                  confirmText: 'Hủy kết bạn',
                                  cancelText: 'Giữ lại',
                                  type: 'danger'
                                });
                                if (!isConfirmed) return;
                                try {
                                  await friendsApi.unfriend(userId);
                                  setProfile({ ...profile, friendshipStatus: 'NONE', friendshipId: null });
                                  toast.success('Đã hủy kết bạn thành công.');
                                } catch (err) {
                                  toast.error(err.message || 'Không thể hủy kết bạn.');
                                }
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
                            >
                              Hủy kết bạn
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {profile.banned || profile.isBanned ? (
                          <button
                            onClick={() => setUserToUnban({ ...profile, userId: profile.userId || userId })}
                            className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Unlock className="w-4 h-4 text-emerald-400" />
                            <span>Mở khóa</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setUserToBan({ ...profile, userId: profile.userId || userId })}
                            className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Lock className="w-4 h-4 text-rose-400" />
                            <span>Cấm tài khoản</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>

        {userToBan && (
          <BanUserModal
            user={userToBan}
            onClose={() => setUserToBan(null)}
            onSuccess={() => { setProfile({ ...profile, banned: true, isBanned: true }); }}
          />
        )}

        {userToUnban && (
          <UnbanUserModal
            user={userToUnban}
            onClose={() => setUserToUnban(null)}
            onSuccess={() => { setProfile({ ...profile, banned: false, isBanned: false, banReason: null }); }}
          />
        )}
      </div>
    </AnimatePresence>
  );
}
