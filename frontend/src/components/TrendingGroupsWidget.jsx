import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Users, MessageSquare, Compass, Plus, ArrowRight,
  Loader2, Globe, Lock, ShieldCheck, Check, Sparkles, AlertCircle
} from 'lucide-react';
import { communityChatApi } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function TrendingGroupsWidget({ onNavigateCommunity, onOpenGroup }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('trending'); // 'trending' | 'my'
  const [popularGroups, setPopularGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  const [widgetToast, setWidgetToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setWidgetToast({ message, type });
    setTimeout(() => setWidgetToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [popRes, myRes] = await Promise.all([
        communityChatApi.getPopularGroups(0, 6),
        communityChatApi.getMyGroups(),
      ]);
      setPopularGroups(popRes?.content || []);
      setMyGroups(myRes || []);
    } catch (err) {
      console.error('Lỗi tải nhóm trong widget:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoinGroup = async (e, group) => {
    e.stopPropagation();
    try {
      setJoiningGroupId(group.id);
      await communityChatApi.joinGroup(group.id, {});
      await loadData();

      if (group.joinPolicy === 'OPEN') {
        showToast(`Đã tham gia nhóm "${group.name}"!`, 'success');
        if (onOpenGroup) {
          onOpenGroup(group.id);
        }
      } else {
        showToast('Đã gửi yêu cầu tham gia. Vui lòng chờ phê duyệt!', 'info');
      }
    } catch (err) {
      showToast(err.message || 'Không thể tham gia nhóm.', 'error');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleGroupClick = (group) => {
    if (group.isMember || activeTab === 'my') {
      if (onOpenGroup) {
        onOpenGroup(group.id);
      } else if (onNavigateCommunity) {
        onNavigateCommunity(group.id);
      }
    } else {
      if (onNavigateCommunity) {
        onNavigateCommunity(group.id);
      }
    }
  };

  return (
    <div className="glass-panel border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Toast popup for widget */}
      <AnimatePresence>
        {widgetToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5 ${
              widgetToast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                : widgetToast.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border border-rose-500/40'
                : 'bg-indigo-950/90 text-indigo-300 border border-indigo-500/40'
            }`}
          >
            {widgetToast.type === 'success' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            {widgetToast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
            <span>{widgetToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{t('widget_trendingGroups_name') || 'Nhóm học tập & Cộng đồng'}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Thảo luận, chia sẻ tài liệu và cùng nhau tiến bộ
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateCommunity && onNavigateCommunity()}
            className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors p-1.5 rounded-xl hover:bg-indigo-500/10"
            title="Khám phá tất cả nhóm"
          >
            <span className="hidden sm:inline">Khám phá</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'trending'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Xu hướng</span>
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Nhóm của tôi</span>
            {myGroups.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'my' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {myGroups.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Body: Groups list */}
      <div className="space-y-2.5 min-h-[220px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Đang tải nhóm học tập...</span>
          </div>
        ) : activeTab === 'trending' ? (
          popularGroups.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Chưa có nhóm nào đang hoạt động. Hãy tạo nhóm mới!
            </div>
          ) : (
            popularGroups.slice(0, 4).map((group) => {
              const isJoining = joiningGroupId === group.id;
              return (
                <div
                  key={group.id}
                  onClick={() => handleGroupClick(group)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden pr-2">
                    <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-200 font-bold text-sm">
                      {group.avatarUrl ? (
                        <img src={getFullAvatarUrl(group.avatarUrl)} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{group.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                          {group.name}
                        </span>
                        {group.privacy === 'PRIVATE' ? (
                          <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          {group.memberCount} thành viên
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                          <Flame className="w-3 h-3" />
                          {Math.round(group.popularityScore || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center flex-shrink-0 ml-2">
                    {group.isMember ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupClick(group);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-bold transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Vào chat</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleJoinGroup(e, group)}
                        disabled={isJoining || group.hasPendingRequest}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                          group.hasPendingRequest
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                        }`}
                      >
                        {isJoining ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : group.hasPendingRequest ? (
                          <span>Chờ duyệt</span>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tham gia</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          myGroups.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-slate-400">Bạn chưa tham gia nhóm học tập nào</p>
              <button
                onClick={() => setActiveTab('trending')}
                className="px-4 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all"
              >
                Khám phá nhóm sôi nổi ngay
              </button>
            </div>
          ) : (
            myGroups.slice(0, 4).map((group) => (
              <div
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 border border-slate-700/60 flex items-center justify-center flex-shrink-0 text-slate-200 font-bold text-sm">
                    {group.avatarUrl ? (
                      <img src={getFullAvatarUrl(group.avatarUrl)} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{group.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                        {group.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-500" />
                        {group.memberCount} thành viên
                      </span>
                      {group.currentUserRole && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-300 font-semibold text-[10px] bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                            {group.currentUserRole}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGroupClick(group);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex-shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vào chat</span>
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* Footer link to community */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>Hơn 100+ bạn học đang hoạt động</span>
        <button
          onClick={() => onNavigateCommunity && onNavigateCommunity()}
          className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Xem tất cả nhóm →
        </button>
      </div>
    </div>
  );
}
