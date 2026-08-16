import React, { useState, useEffect, useCallback } from 'react';
import { communityChatApi } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import GroupChatRoom from '../components/chat/GroupChatRoom';
import PublicProfileModal from '../components/PublicProfileModal';
import ChatToast from '../components/chat/ChatToast';
import SEO from '../components/SEO';
import {
  Users, Search, Plus, Compass, MessageSquare, Shield,
  Globe, Lock, Sparkles, ArrowRight, Loader2, X, Check, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function Community({ onBackToDashboard }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('explore'); // 'explore' or 'my'
  const [popularGroups, setPopularGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [toast, setToast] = useState(null);

  // Create Group Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivacy, setNewGroupPrivacy] = useState('PUBLIC');
  const [newGroupJoinPolicy, setNewGroupJoinPolicy] = useState('OPEN');
  const [newGroupMaxMembers, setNewGroupMaxMembers] = useState(1000);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Invite link preview
  const [inviteCodeToJoin, setInviteCodeToJoin] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/join/')) {
      return path.replace('/join/', '').trim();
    }
    return null;
  });
  const [invitePreview, setInvitePreview] = useState(null);
  const [joiningInvite, setJoiningInvite] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [popRes, myRes] = await Promise.all([
        communityChatApi.getPopularGroups(0, 50),
        communityChatApi.getMyGroups(),
      ]);
      setPopularGroups(popRes?.content || []);
      setMyGroups(myRes || []);
    } catch (err) {
      console.error('Lỗi tải danh sách nhóm:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check invite code if URL contains /join/:code
  useEffect(() => {
    if (inviteCodeToJoin) {
      communityChatApi.previewInvite(inviteCodeToJoin)
        .then((data) => setInvitePreview(data))
        .catch((err) => console.warn('Lỗi xem trước link mời:', err));
    }
  }, [inviteCodeToJoin]);

  const showToast = (message, type = 'success', title = null) => {
    setToast({ message, type, title });
  };

  const handleJoinViaInvite = async () => {
    if (!inviteCodeToJoin) return;
    try {
      setJoiningInvite(true);
      const joined = await communityChatApi.joinViaInvite(inviteCodeToJoin);
      setInvitePreview(null);
      setInviteCodeToJoin(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadData();
      showToast('Tham gia nhóm thành công!', 'success');
      if (joined?.id) {
        setActiveGroupId(joined.id);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tham gia nhóm qua link mời này.', 'error');
    } finally {
      setJoiningInvite(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      setCreatingGroup(true);
      setCreateError(null);

      const payload = {
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || null,
        privacy: newGroupPrivacy,
        joinPolicy: newGroupJoinPolicy,
        maxMembers: Number(newGroupMaxMembers) || 1000,
      };

      const created = await communityChatApi.createGroup(payload);
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadData();
      showToast('Đã tạo nhóm học tập mới thành công!', 'success');
      if (created?.id) {
        setActiveGroupId(created.id);
      }
    } catch (err) {
      setCreateError(err.message || 'Lỗi khi tạo nhóm.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleJoinGroup = async (group) => {
    try {
      await communityChatApi.joinGroup(group.id, {});
      await loadData();
      if (group.joinPolicy === 'OPEN') {
        showToast('Đã tham gia nhóm thành công!', 'success');
        setActiveGroupId(group.id);
      } else {
        showToast('Đã gửi yêu cầu tham gia. Vui lòng chờ Ban quản trị phê duyệt!', 'info', 'Đã gửi yêu cầu');
      }
    } catch (err) {
      showToast(err.message || 'Không thể tham gia nhóm.', 'error');
    }
  };

  // If in a room, render the GroupChatRoom
  if (activeGroupId) {
    return (
      <div className="min-h-screen bg-slate-950 p-2 sm:p-4 text-slate-100">
        <SEO view="dashboard" />
        <GroupChatRoom
          groupId={activeGroupId}
          onBack={() => {
            setActiveGroupId(null);
            loadData();
          }}
          onSelectUser={(userId) => setSelectedProfileUserId(userId)}
        />
        {selectedProfileUserId && (
          <PublicProfileModal
            userId={selectedProfileUserId}
            onClose={() => setSelectedProfileUserId(null)}
          />
        )}
      </div>
    );
  }

  const displayedGroups = (activeTab === 'explore' ? popularGroups : myGroups).filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SEO view="dashboard" />

      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              ← Về Trang Chủ
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h1 className="text-sm font-bold text-slate-100 hidden sm:inline">{t('community_title')}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_group_btn')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero / Header Area */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">{t('community_title')}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">{t('community_subtitle')}</p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhóm học tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 focus:border-indigo-500/50 rounded-2xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors shadow-inner"
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'explore'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>{t('explore_groups')}</span>
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('my_groups')} ({myGroups.length})</span>
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs text-slate-400 uppercase tracking-widest">{t('loading_account')}</span>
          </div>
        ) : displayedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs gap-3">
            <Users className="w-10 h-10 opacity-30" />
            <p>{t('no_groups_found')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedGroups.map((group) => {
              const isMember = group.isMember;
              const hasPending = group.hasPendingRequest;

              return (
                <div
                  key={group.id}
                  className="flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all shadow-lg hover:shadow-indigo-500/5 group"
                >
                  <div>
                    {/* Top Group Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {group.privacy === 'PUBLIC' ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Globe className="w-2.5 h-2.5" />
                            {t('privacy_public')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Lock className="w-2.5 h-2.5" />
                            {t('privacy_private')}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full">
                          {group.joinPolicy === 'OPEN' ? t('join_policy_open') : t('join_policy_approval')}
                        </span>
                      </div>

                      {group.currentUserRole && (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {t(`role_${group.currentUserRole.toLowerCase()}`)}
                        </span>
                      )}
                    </div>

                    {/* Group Title & Avatar */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-base font-bold text-indigo-300 flex-shrink-0 overflow-hidden shadow-md">
                        {group.avatarUrl ? (
                          <img src={getFullAvatarUrl(group.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{group.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                          {group.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {group.description || 'Chưa có mô tả cho nhóm học này.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Group Stats & Action */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>
                        <strong className="text-slate-200">{group.memberCount}</strong> {t('members_count')}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-200">{group.messageCount || 0}</strong> {t('messages_count')}
                      </span>
                    </div>

                    {isMember ? (
                      <button
                        onClick={() => setActiveGroupId(group.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Vào Chat</span>
                      </button>
                    ) : hasPending ? (
                      <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                        {t('pending_approval')}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinGroup(group)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                      >
                        <span>{t('join_group_btn')}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== CREATE GROUP MODAL ==================== */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">{t('create_group_btn')}</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                {createError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_name')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nhóm Ôn Thi THPT Quốc Gia 2026..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_desc')}</label>
                  <textarea
                    rows={3}
                    placeholder="Mô tả mục tiêu học tập, quy định của nhóm..."
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_privacy')}</label>
                    <select
                      value={newGroupPrivacy}
                      onChange={(e) => setNewGroupPrivacy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="PUBLIC">{t('privacy_public')}</option>
                      <option value="PRIVATE">{t('privacy_private')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('join_policy')}</label>
                    <select
                      value={newGroupJoinPolicy}
                      onChange={(e) => setNewGroupJoinPolicy(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="OPEN">{t('join_policy_open')}</option>
                      <option value="APPROVAL_REQUIRED">{t('join_policy_approval')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('max_members')}</label>
                  <select
                    value={newGroupMaxMembers}
                    onChange={(e) => setNewGroupMaxMembers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value={50}>50 thành viên</option>
                    <option value={100}>100 thành viên</option>
                    <option value={500}>500 thành viên</option>
                    <option value={1000}>1,000 thành viên</option>
                    <option value={5000}>5,000 thành viên</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    {t('drive_btn_cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGroup || !newGroupName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {creatingGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t('create_group_btn')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== INVITE PREVIEW RESOLVER MODAL ==================== */}
      <AnimatePresence>
        {invitePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 mx-auto flex items-center justify-center text-xl font-bold text-indigo-300">
                {invitePreview.group?.avatarUrl ? (
                  <img src={getFullAvatarUrl(invitePreview.group.avatarUrl)} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span>{invitePreview.group?.name?.charAt(0)}</span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{invitePreview.group?.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{invitePreview.group?.description || 'Bạn được mời tham gia nhóm học tập này.'}</p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-2">
                  <span>{invitePreview.group?.memberCount} thành viên</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setInvitePreview(null);
                    setInviteCodeToJoin(null);
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 transition-colors"
                >
                  {t('drive_btn_cancel')}
                </button>
                <button
                  onClick={handleJoinViaInvite}
                  disabled={joiningInvite || !invitePreview.isValid}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {joiningInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Tham gia ngay'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Public Profile Modal */}
      {selectedProfileUserId && (
        <PublicProfileModal
          userId={selectedProfileUserId}
          onClose={() => setSelectedProfileUserId(null)}
        />
      )}

      {/* Floating Chat Toast Notification */}
      <ChatToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
