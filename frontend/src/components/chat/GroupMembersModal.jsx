import React, { useState, useEffect } from 'react';
import { communityChatApi, friendsApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { X, Users, UserPlus, Shield, ShieldCheck, Crown, VolumeX, Volume2, UserMinus, Check, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatToast from './ChatToast';
import ConfirmModal from './ConfirmModal';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function GroupMembersModal({ groupId, currentRole, isOpen, onClose, onSelectUser }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'requests', 'invite'
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

  const showToast = (message, type = 'success', title = null) => setToast({ message, type, title });

  const isModOrAbove = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'MODERATOR';
  const isOwner = currentRole === 'OWNER';

  useEffect(() => {
    if (isOpen && groupId) {
      loadMembers();
      if (isModOrAbove) {
        loadRequests();
      }
      loadFriends();
    }
  }, [isOpen, groupId, isModOrAbove]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await communityChatApi.getMembers(groupId, 0, 100);
      setMembers(res?.content || []);
    } catch (err) {
      console.error('Lỗi tải danh sách thành viên:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await communityChatApi.getPendingJoinRequests(groupId);
      setRequests(res || []);
    } catch (err) {
      console.error('Lỗi tải yêu cầu tham gia:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await friendsApi.getFriends();
      setFriends(res || []);
    } catch (err) {}
  };

  const handleKick = (targetUserId, memberName) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa thành viên khỏi nhóm',
      message: `Bạn có chắc chắn muốn xóa "${memberName || 'thành viên này'}" khỏi nhóm không?`,
      confirmText: 'Xóa khỏi nhóm',
      type: 'danger',
      onConfirm: async () => {
        try {
          setActionLoadingId(targetUserId);
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          await communityChatApi.kickMember(groupId, targetUserId);
          setMembers(prev => prev.filter(m => m.user.id !== targetUserId));
          showToast(`Đã xóa ${memberName || 'thành viên'} khỏi nhóm`, 'info');
        } catch (err) {
          showToast(err.message || 'Lỗi khi xóa thành viên', 'error');
        } finally {
          setActionLoadingId(null);
          setConfirmConfig({ isOpen: false });
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleMuteToggle = (member) => {
    const isMuted = member.status === 'MUTED';
    const memberName = member.user?.displayName || 'thành viên';

    setConfirmConfig({
      isOpen: true,
      title: isMuted ? 'Bật lại quyền chat' : 'Tắt quyền chat (Mute)',
      message: isMuted
        ? `Bật lại quyền nhắn tin trong nhóm cho "${memberName}"?`
        : `Tắt quyền nhắn tin trong nhóm của "${memberName}" trong vòng 24 giờ?`,
      confirmText: isMuted ? 'Bật lại chat' : 'Tắt chat (24h)',
      type: isMuted ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          setActionLoadingId(member.user.id);
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          if (isMuted) {
            await communityChatApi.unmuteMember(groupId, member.user.id);
            showToast(`Đã bật lại quyền chat cho ${memberName}`, 'success');
          } else {
            await communityChatApi.muteMember(groupId, member.user.id, 1440); // Mute 24h
            showToast(`Đã tắt chat ${memberName} trong 24 giờ`, 'warning');
          }
          await loadMembers();
        } catch (err) {
          showToast(err.message || 'Lỗi xử lý quyền chat', 'error');
        } finally {
          setActionLoadingId(null);
          setConfirmConfig({ isOpen: false });
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleRoleChange = (targetUserId, newRole, memberName) => {
    const roleLabels = { OWNER: 'Chủ nhóm', ADMIN: 'Quản trị viên', MODERATOR: 'Kiểm duyệt viên', MEMBER: 'Thành viên' };
    setConfirmConfig({
      isOpen: true,
      title: 'Thay đổi vai trò',
      message: `Bạn có chắc chắn muốn thay đổi vai trò của "${memberName || 'thành viên'}" thành "${roleLabels[newRole] || newRole}" không?`,
      confirmText: 'Đổi vai trò',
      type: 'info',
      onConfirm: async () => {
        try {
          setActionLoadingId(targetUserId);
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          await communityChatApi.updateMemberRole(groupId, targetUserId, newRole);
          await loadMembers();
          showToast(`Đã cập nhật vai trò của ${memberName || 'thành viên'} thành ${roleLabels[newRole] || newRole}`, 'success');
        } catch (err) {
          showToast(err.message || 'Lỗi đổi vai trò', 'error');
        } finally {
          setActionLoadingId(null);
          setConfirmConfig({ isOpen: false });
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleReviewRequest = async (requestId, approved) => {
    try {
      setActionLoadingId(requestId);
      await communityChatApi.reviewJoinRequest(groupId, requestId, approved);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      showToast(approved ? 'Đã duyệt thành viên vào nhóm' : 'Đã từ chối yêu cầu tham gia', approved ? 'success' : 'info');
      if (approved) {
        await loadMembers();
      }
    } catch (err) {
      showToast(err.message || 'Lỗi duyệt yêu cầu', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteFriends = async () => {
    if (selectedFriendIds.length === 0) return;
    try {
      setLoading(true);
      await communityChatApi.inviteFriends(groupId, selectedFriendIds);
      const count = selectedFriendIds.length;
      setSelectedFriendIds([]);
      setActiveTab('members');
      await loadMembers();
      showToast(`Đã gửi lời mời tham gia nhóm đến ${count} bạn bè!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi mời bạn bè', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectFriend = (friendId) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">{t('group_members_list')}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/20 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t('group_members_list')} ({members.length})
            </button>

            {isModOrAbove && (
              <button
                onClick={() => setActiveTab('requests')}
                className={`relative px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t('group_join_requests')}
                {requests.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-extrabold rounded-full">
                    {requests.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('invite')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'invite'
                  ? 'bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/40 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t('invite_friends')}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[250px]">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : activeTab === 'members' ? (
              members.map((m) => {
                const isCurrent = m.user.id === currentUser?.id;
                const isTargetOwner = m.role === 'OWNER';
                const isTargetAdmin = m.role === 'ADMIN';
                const canManageTarget = isOwner || (currentRole === 'ADMIN' && m.role !== 'ADMIN' && !isTargetOwner);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all shadow-xs"
                  >
                    <div
                      onClick={() => onSelectUser && onSelectUser(m.user.id)}
                      className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 dark:bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-500 dark:text-indigo-300 border border-indigo-500/30">
                        {m.user.avatarUrl ? (
                          <img
                            src={getFullAvatarUrl(m.user.avatarUrl)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user.displayName || 'User'}`;
                            }}
                          />
                        ) : (
                          <span>{(m.user.displayName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                            {m.user.displayName}
                          </span>
                          {m.role === 'OWNER' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              <Crown className="w-2.5 h-2.5" />
                              {t('role_owner')}
                            </span>
                          )}
                          {m.role === 'ADMIN' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              {t('role_admin')}
                            </span>
                          )}
                          {m.role === 'MODERATOR' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              <Shield className="w-2.5 h-2.5" />
                              {t('role_moderator')}
                            </span>
                          )}
                          {m.status === 'MUTED' && (
                            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              {t('mute_member')}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.user.selectedTitle || `Lv.${m.user.currentLevel || 1}`}
                        </div>
                      </div>
                    </div>

                    {/* Actions toolbar for admin/owner */}
                    {!isCurrent && canManageTarget && (
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {isOwner && (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user.id, e.target.value, m.user.displayName)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="MEMBER">{t('role_member')}</option>
                            <option value="MODERATOR">{t('role_moderator')}</option>
                            <option value="ADMIN">{t('role_admin')}</option>
                            <option value="OWNER">{t('transfer_ownership')}</option>
                          </select>
                        )}
                        <button
                          onClick={() => handleMuteToggle(m)}
                          disabled={actionLoadingId === m.user.id}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            m.status === 'MUTED'
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-amber-400 hover:bg-amber-500/10'
                          }`}
                          title={m.status === 'MUTED' ? t('unmute_member') : t('mute_member')}
                        >
                          {m.status === 'MUTED' ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleKick(m.user.id, m.user.displayName)}
                          disabled={actionLoadingId === m.user.id}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={t('kick_member')}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : activeTab === 'requests' ? (
              requests.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-12">
                  Không có yêu cầu tham gia nào đang chờ duyệt.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 shadow-xs"
                  >
                    <div
                      onClick={() => onSelectUser && onSelectUser(req.user.id)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 dark:bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-500 dark:text-indigo-300">
                        {req.user.avatarUrl ? (
                          <img
                            src={getFullAvatarUrl(req.user.avatarUrl)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${req.user.displayName || 'User'}`;
                            }}
                          />
                        ) : (
                          <span>{(req.user.displayName || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {req.user.displayName}
                        </div>
                        {req.requestMessage && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 italic">"{req.requestMessage}"</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReviewRequest(req.id, true)}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        {t('approve')}
                      </button>
                      <button
                        onClick={() => handleReviewRequest(req.id, false)}
                        disabled={actionLoadingId === req.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        {t('reject')}
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Invite friends tab
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('select_friends_to_invite')}</div>
                {friends.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-10">
                    Bạn chưa có bạn bè trong danh sách để mời.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((f) => {
                      const isSelected = selectedFriendIds.includes(f.friendId);
                      const isAlreadyMember = members.some(m => m.user.id === f.friendId);

                      return (
                        <div
                          key={f.id}
                          onClick={() => !isAlreadyMember && toggleSelectFriend(f.friendId)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isAlreadyMember
                              ? 'opacity-50 cursor-not-allowed bg-slate-100/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-900'
                              : isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-600/10 border-indigo-300 dark:border-indigo-500/50 cursor-pointer shadow-xs'
                              : 'bg-slate-50/90 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 dark:bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300">
                              {f.avatarUrl ? (
                                <img src={getFullAvatarUrl(f.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span>{(f.displayName || 'U').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">{f.displayName}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Lv.{f.level || 1}</div>
                            </div>
                          </div>

                          <div>
                            {isAlreadyMember ? (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {t('joined_badge')}
                              </span>
                            ) : (
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                                isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedFriendIds.length > 0 && (
                  <button
                    onClick={handleInviteFriends}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Mời ({selectedFriendIds.length}) bạn bè vào nhóm</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        isLoading={confirmConfig.isLoading}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ isOpen: false })}
      />

      {/* Floating Chat Toast Notification */}
      <ChatToast toast={toast} onClose={() => setToast(null)} />
    </AnimatePresence>
  );
}
