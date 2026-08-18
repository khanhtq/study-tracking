import React, { useState, useEffect, useRef, useCallback } from 'react';
import { communityChatApi } from '../../api';
import { subscribeToGroup, publishGroupMessage, publishGroupReaction, publishGroupTyping } from '../../websocket';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ShareDocumentModal from './ShareDocumentModal';
import GroupMembersModal from './GroupMembersModal';
import GroupInviteModal from './GroupInviteModal';
import GroupMediaModal from './GroupMediaModal';
import EditGroupModal from './EditGroupModal';
import GroupCountdownsModal from './GroupCountdownsModal';
import ChatToast from './ChatToast';
import ConfirmModal from './ConfirmModal';
import {
  ArrowLeft, Search, Pin, Users, Link2, FileText, Send, Paperclip,
  Smile, CornerDownRight, X, Edit2, Trash2, ChevronDown, Check,
  Download, Loader2, Play, Image as ImageIcon, Volume2, VolumeX, ShieldCheck,
  Shield, Crown, Eye, Settings, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STANDARD_REACTIONS = ['👍', '❤️', '😆', '😭', '😡', '🎉'];

const getFullMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};
const getFullAvatarUrl = getFullMediaUrl;

export default function GroupChatRoom({ groupId, onBack, onSelectUser }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  // Group Details & Status
  const [groupDetail, setGroupDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  // Messages & Pagination
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestCursor, setOldestCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Input & Reply & Edit State
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);

  // Attachments & Uploading
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Realtime & Typing
  const [typingUsers, setTypingUsers] = useState(new Map());
  const typingTimeoutRef = useRef(null);

  // UI Modals & Popovers
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isCountdownsModalOpen, setIsCountdownsModalOpen] = useState(false);
  const [groupCountdowns, setGroupCountdowns] = useState([]);
  const [isShareDocOpen, setIsShareDocOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Floating Toast & Confirmation Modal
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const showToast = (message, type = 'success', title = null) => setToast({ message, type, title });

  // Floating New Message Banner & Auto-scroll
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // ==================== 1. TẢI DỮ LIỆU BAN ĐẦU & REALTIME STOMP ====================

  const loadGroupDetail = useCallback(async () => {
    try {
      setLoadingDetail(true);
      const data = await communityChatApi.getGroupDetail(groupId);
      setGroupDetail(data);
      setPinnedMessages(data?.pinnedMessages || []);
    } catch (err) {
      console.error('Lỗi tải chi tiết nhóm:', err);
      if (err?.message?.includes('không phải là thành viên') || err?.response?.status === 403) {
        if (onBack) onBack();
      }
    } finally {
      setLoadingDetail(false);
    }
  }, [groupId, onBack]);

  const loadGroupCountdowns = useCallback(async () => {
    try {
      const data = await communityChatApi.getGroupCountdowns(groupId);
      setGroupCountdowns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải đếm ngược nhóm:', err);
    }
  }, [groupId]);

  const loadInitialMessages = useCallback(async () => {
    try {
      setLoadingMessages(true);
      const res = await communityChatApi.getMessages(groupId, null, 30);
      setMessages(res?.messages || []);
      setHasMore(res?.hasMore || false);
      setOldestCursor(res?.oldestCursor || null);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
      if (err?.message?.includes('không phải là thành viên') || err?.response?.status === 403) {
        if (onBack) onBack();
      }
    } finally {
      setLoadingMessages(false);
    }
  }, [groupId, onBack]);

  useEffect(() => {
    loadGroupDetail();
    loadGroupCountdowns();
    loadInitialMessages();
  }, [loadGroupDetail, loadGroupCountdowns, loadInitialMessages]);

  // Đăng ký STOMP Broker Topics
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = subscribeToGroup(groupId, {
      onMessage: (msg) => {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === msg.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = msg;
            return updated;
          }
          return [...prev, msg];
        });

        if (msg.messageType === 'SYSTEM') {
          loadGroupDetail();
          if (msg.content && currentUser?.displayName && msg.content.includes(currentUser.displayName)) {
            if (msg.content.includes('tắt quyền chat')) {
              showToast('Bạn vừa bị tắt quyền gửi tin nhắn trong nhóm này.', 'warning', 'Thông báo tắt chat');
            } else if (msg.content.includes('mở lại quyền chat')) {
              showToast('Bạn đã được mở lại quyền gửi tin nhắn trong nhóm!', 'success', 'Thông báo mở chat');
            }
          }
        }

        if (isAtBottom) {
          setTimeout(scrollToBottom, 50);
        } else {
          setUnreadCount((c) => c + 1);
        }
      },
      onReaction: (reactionUpdate) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === reactionUpdate.messageId) {
              return { ...m, reactions: reactionUpdate.reactions };
            }
            return m;
          })
        );
      },
      onPinned: (updatedPinnedList) => {
        setPinnedMessages(updatedPinnedList || []);
      },
      onTyping: (typingNotif) => {
        if (typingNotif.userId === currentUser?.id) return;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (typingNotif.isTyping) {
            next.set(typingNotif.userId, typingNotif);
          } else {
            next.delete(typingNotif.userId);
          }
          return next;
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, [groupId, currentUser?.id, isAtBottom]);

  // ==================== 2. CUỘN & PHÂN TRANG CON TRỎ (CURSOR PAGINATION) ====================

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
      setIsAtBottom(true);
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    if (atBottom) setUnreadCount(0);

    // Tải tin nhắn cũ hơn khi cuộn lên đỉnh
    if (scrollTop < 60 && hasMore && !loadingOlder && oldestCursor) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = async () => {
    const container = messagesContainerRef.current;
    if (!container || loadingOlder || !oldestCursor) return;

    try {
      setLoadingOlder(true);
      const prevScrollHeight = container.scrollHeight;
      const res = await communityChatApi.getMessages(groupId, oldestCursor, 30);

      setMessages((prev) => [...(res?.messages || []), ...prev]);
      setHasMore(res?.hasMore || false);
      setOldestCursor(res?.oldestCursor || null);

      // Duy trì vị trí scroll không bị nhảy
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      console.error('Lỗi tải tin nhắn cũ:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ==================== 3. GỬI TIN NHẮN, DÁN ẢNH (CTRL+V) & KÉO THẢ (DRAG & DROP) ====================

  const handleSendMessage = async () => {
    if (isMuted) {
      showToast('Bạn đang bị tắt quyền chat trong nhóm này.', 'warning', 'Tắt quyền chat');
      return;
    }
    if ((!inputText.trim() && pendingAttachments.length === 0) || uploadingFiles) return;

    const payload = {
      content: inputText.trim(),
      messageType: pendingAttachments.length > 0 ? 'MEDIA' : 'TEXT',
      replyToId: replyingTo ? replyingTo.id : null,
      attachments: pendingAttachments.map((a) => ({
        studyDocumentId: a.studyDocumentId || null,
        fileUrl: a.fileUrl,
        thumbnailUrl: a.thumbnailUrl,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        attachmentType: a.attachmentType,
        metadata: a.metadata,
      })),
    };

    setInputText('');
    setPendingAttachments([]);
    setReplyingTo(null);

    // Gửi qua STOMP nếu kết nối, fallback sang REST
    const published = publishGroupMessage(groupId, payload);
    if (!published) {
      try {
        await communityChatApi.sendMessage(groupId, payload);
      } catch (err) {
        console.error('Lỗi gửi tin nhắn qua REST fallback:', err);
      }
    }
    setTimeout(scrollToBottom, 50);
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingFiles(true);
      for (const file of files) {
        const att = await communityChatApi.uploadChatFile(groupId, file);
        setPendingAttachments((prev) => [...prev, att]);
      }
    } catch (err) {
      console.error('Lỗi tải tệp lên:', err);
      showToast(err.message || 'Lỗi tải tệp lên máy chủ', 'error', 'Tải tệp thất bại');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Xử lý kéo thả tệp
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  // Xử lý dán Clipboard Ctrl+V
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFileUpload(files);
    }
  };

  // ==================== 4. TYPING & @MENTIONS ====================

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Gửi typing indicator
    publishGroupTyping(groupId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      publishGroupTyping(groupId, false);
    }, 2000);

    // Kiểm tra ký tự @ cho mention autocomplete
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_.-]*)$/);

    if (match && groupDetail?.topMembers) {
      const q = match[1].toLowerCase();
      setMentionQuery(q);
      const filtered = groupDetail.topMembers
        .filter((m) => m.user.displayName.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q))
        .slice(0, 5);
      setMentionSuggestions(filtered);
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (member) => {
    const cursor = textareaRef.current.selectionStart;
    const textBefore = inputText.slice(0, cursor);
    const textAfter = inputText.slice(cursor);
    const newBefore = textBefore.replace(/@([a-zA-Z0-9_.-]*)$/, `@${member.user.displayName} `);

    setInputText(newBefore + textAfter);
    setMentionQuery(null);
    setMentionSuggestions([]);
    textareaRef.current.focus();
  };

  // ==================== 5. ACTIONS: SỬA, XÓA, REACTION, GHIM & LƯU TÀI LIỆU ====================
  const [savingEdit, setSavingEdit] = useState(false);

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim() || savingEdit) return;
    try {
      setSavingEdit(true);
      await communityChatApi.editMessage(groupId, editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    } catch (err) {
      console.error('Lỗi sửa tin nhắn:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMessage = (msgId) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa tin nhắn',
      message: 'Bạn có chắc chắn muốn xóa tin nhắn này khỏi cuộc trò chuyện? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa tin nhắn',
      type: 'danger',
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          await communityChatApi.deleteMessage(groupId, msgId);
          showToast('Đã xóa tin nhắn', 'info');
        } catch (err) {
          showToast(err.message || 'Không thể xóa tin nhắn', 'error');
        } finally {
          setConfirmConfig({ isOpen: false });
        }
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const handleToggleReaction = async (msgId, emoji) => {
    publishGroupReaction(groupId, msgId, emoji);
  };

  const handleTogglePin = async (msgId) => {
    try {
      const isPinned = pinnedMessages.some(p => p.messageId === msgId);
      await communityChatApi.togglePinMessage(groupId, msgId);
      await loadGroupDetail();
      showToast(isPinned ? 'Đã bỏ ghim tin nhắn' : 'Đã ghim tin nhắn lên đầu nhóm', 'info');
    } catch (err) {
      showToast(err.message || 'Lỗi khi ghim tin nhắn', 'error');
    }
  };

  const handleSaveToDrive = async (attachmentId) => {
    try {
      await communityChatApi.saveSharedDocumentToMyLibrary(groupId, attachmentId);
      showToast(t('saved_to_drive_success') || 'Đã lưu tài liệu vào kho cá nhân thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu tài liệu vào kho', 'error');
    }
  };

  const handleSearchMessages = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await communityChatApi.searchMessages(groupId, searchQuery.trim());
      setSearchResults(results || []);
    } catch (err) {
      console.error('Lỗi tìm kiếm tin nhắn:', err);
    }
  };

  const handleShareStudyDoc = async (docId, caption) => {
    try {
      await communityChatApi.shareStudyDocument(groupId, docId, caption);
      showToast('Đã chia sẻ tài liệu vào nhóm chat!', 'success');
    } catch (err) {
      console.error('Lỗi chia sẻ tài liệu:', err);
      showToast(err.message || 'Lỗi khi chia sẻ tài liệu', 'error');
    }
  };

  const currentRole = groupDetail?.group?.currentUserRole;
  const currentStatus = groupDetail?.group?.currentUserStatus;
  const currentUserMutedUntil = groupDetail?.group?.currentUserMutedUntil;
  const isMuted = currentStatus === 'MUTED';
  const isModOrAbove = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'MODERATOR';

  const formatMutedUntil = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="relative flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Dropzone Backdrop Overlay */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-indigo-950/80 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none backdrop-blur-sm"
          >
            <Paperclip className="w-12 h-12 text-indigo-400 animate-bounce mb-3" />
            <p className="text-sm font-bold text-indigo-200">{t('drop_files_here')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== HEADER ==================== */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title="Quay lại danh sách nhóm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-500 dark:text-indigo-300 overflow-hidden shadow-xs">
              {groupDetail?.group?.avatarUrl ? (
                <img src={getFullAvatarUrl(groupDetail.group.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(groupDetail?.group?.name || 'G').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-md">
                  {groupDetail?.group?.name || 'Đang tải...'}
                </h2>
                {groupDetail?.group?.privacy === 'PUBLIC' ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                    {t('privacy_public')}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                    {t('privacy_private')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-400">
                  {groupDetail?.group?.memberCount || 0} {t('members_count')}
                </p>
                {groupCountdowns.length > 0 && (
                  <button
                    onClick={() => setIsCountdownsModalOpen(true)}
                    className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold transition-all cursor-pointer truncate max-w-[200px]"
                    title={t('group_countdowns')}
                  >
                    <Calendar className="w-3 h-3 flex-shrink-0 text-indigo-400" />
                    <span className="truncate">{groupCountdowns[0].title}:</span>
                    <span className="font-bold text-indigo-300 flex-shrink-0">
                      {groupCountdowns[0].daysRemaining === 0
                        ? t('today_is_event')
                        : t('days_remaining_label').replace('{count}', groupCountdowns[0].daysRemaining)}
                    </span>
                    {groupCountdowns.length > 1 && (
                      <span className="text-[9px] px-1 bg-indigo-500/30 rounded-full font-bold flex-shrink-0">
                        +{groupCountdowns.length - 1}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Group Countdowns Button */}
          <button
            onClick={() => setIsCountdownsModalOpen(true)}
            className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
              groupCountdowns.length > 0
                ? 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:text-indigo-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-slate-300 hover:text-slate-100'
            }`}
            title={t('group_countdowns')}
          >
            <Calendar className="w-4 h-4" />
            {groupCountdowns.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {groupCountdowns.length}
              </span>
            )}
          </button>

          {/* Pinned Messages Button */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedDropdown(!showPinnedDropdown)}
              className="relative p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
              title={t('pinned_messages')}
            >
              <Pin className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            </button>
          )}

          {/* Search messages */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title={t('search_messages')}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Share from Drive */}
          <button
            onClick={() => setIsShareDocOpen(true)}
            className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors hidden sm:flex cursor-pointer"
            title={t('share_document_from_drive')}
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Invite links */}
          {isModOrAbove && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
              title={t('invite_link')}
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}

          {/* Multimedia & Files Gallery */}
          <button
            onClick={() => setIsMediaModalOpen(true)}
            className="p-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Kho ảnh, video & tài liệu nhóm"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden md:inline text-xs font-semibold">Tệp & Media</span>
          </button>

          {/* Members list & Moderation */}
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
            title={t('group_members_list')}
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Group Settings / Edit Info (Owner & Admin only) */}
          {(currentRole === 'OWNER' || currentRole === 'ADMIN') && (
            <button
              onClick={() => setIsEditGroupModalOpen(true)}
              className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              title={t('edit_group_info')}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ==================== SEARCH BAR POPOVER ==================== */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-800 bg-slate-900 p-3 flex items-center gap-2 overflow-hidden"
          >
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={t('search_messages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== PINNED MESSAGES DRAWER ==================== */}
      <AnimatePresence>
        {showPinnedDropdown && pinnedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-800 bg-slate-900/95 max-h-48 overflow-y-auto p-3 space-y-2"
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-500 dark:text-amber-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" />
                {t('pinned_messages')} ({pinnedMessages.length})
              </span>
              <button onClick={() => setShowPinnedDropdown(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {pinnedMessages.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-indigo-500 dark:text-indigo-400 mr-2">{pm.sender?.displayName}:</span>
                  <span className="text-slate-300">{pm.messageContent}</span>
                </div>
                {isModOrAbove && (
                  <button
                    onClick={() => handleTogglePin(pm.messageId)}
                    className="text-slate-400 hover:text-rose-400 p-1 flex-shrink-0 cursor-pointer"
                    title={t('unpin')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== MESSAGES LIST ==================== */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs">
            <p>{t('no_messages_yet')}</p>
          </div>
        ) : (
          <>
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.sender?.id === currentUser?.id;
              const isSystem = msg.messageType === 'SYSTEM';

              if (isSystem) {
                const isCountdownBroadcast = msg.content?.includes('[BẢN TIN ĐẾM NGƯỢC HÔM NAY]');
                const cleanedContent = msg.content
                  ? msg.content.replace(/\*\*/g, '').replace(/[🎯🗑️🔔🔥⏰💪📅]/gu, '').replace(/\s+/g, ' ').trim()
                  : '';

                if (isCountdownBroadcast) {
                  const bodyContent = msg.content
                    ? msg.content.replace('[BẢN TIN ĐẾM NGƯỢC HÔM NAY]', '').replace(/\*\*/g, '').replace(/[🎯🗑️🔔🔥⏰💪📅]/gu, '').trim()
                    : '';
                  return (
                    <div key={msg.id} className="flex justify-center my-3 px-3">
                      <div className="max-w-md w-full p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/20 text-slate-200 shadow-sm">
                        <div className="text-indigo-400 font-semibold text-xs mb-2 pb-1.5 border-b border-slate-800">
                          {t('daily_countdown_reminder_badge') || 'Bản tin đếm ngược mục tiêu'}
                        </div>
                        <div className="text-xs leading-relaxed text-slate-300 whitespace-pre-line">
                          {bodyContent}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex justify-center my-2 px-3">
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-900/60 px-3.5 py-1 rounded-full border border-slate-800/60 max-w-lg text-center leading-relaxed">
                      {cleanedContent}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`group relative flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <div
                    onClick={() => msg.sender?.id && onSelectUser && onSelectUser(msg.sender.id)}
                    className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 border border-slate-800 flex items-center justify-center text-xs font-bold text-indigo-500 dark:text-indigo-300 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all mt-1 shadow-sm"
                    title="Bấm để xem hồ sơ cá nhân"
                  >
                    {msg.sender?.avatarUrl ? (
                      <img
                        src={getFullAvatarUrl(msg.sender.avatarUrl)}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.displayName || 'User'}`;
                        }}
                      />
                    ) : (
                      <span>{(msg.sender?.displayName || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col ${editingMessage?.id === msg.id ? 'w-full max-w-full sm:max-w-xl md:max-w-2xl' : 'max-w-[85%] sm:max-w-lg'} ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Header info (Name & Time) */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-xs text-slate-400">
                      <span
                        onClick={() => msg.sender?.id && onSelectUser && onSelectUser(msg.sender.id)}
                        className="font-semibold text-slate-200 hover:text-indigo-500 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {msg.sender?.displayName}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>

                    {/* Reply To Reference Bubble */}
                    {msg.replyTo && (
                      <div className="flex items-center gap-1 text-xs text-slate-300 bg-slate-900/80 border-l-2 border-indigo-500 px-2.5 py-1 rounded mb-1 max-w-full truncate">
                        <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-200">{msg.replyTo.senderDisplayName}:</span>
                        <span className="truncate">{msg.replyTo.content}</span>
                      </div>
                    )}

                    {/* Main Bubble or Spacious Edit Box */}
                    {editingMessage?.id === msg.id ? (
                      <div className="w-full bg-slate-900 border-2 border-indigo-500/60 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs text-indigo-500 dark:text-indigo-400 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{t('edit_message_title')}</span>
                          </div>
                          <button
                            onClick={() => setEditingMessage(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                            title="Esc"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              setEditingMessage(null);
                            }
                          }}
                          autoFocus
                          rows={4}
                          placeholder={t('chat_input_placeholder')}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 leading-relaxed resize-y min-h-[96px] sm:min-h-[120px] max-h-[320px]"
                        />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-slate-400">
                            {t('edit_message_hint')}
                          </span>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMessage(null)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              {t('drive_btn_cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={savingEdit || !editContent.trim()}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                            >
                              {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>{t('drive_btn_save')}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative p-3 sm:p-3.5 rounded-2xl text-[13.5px] sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                            : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none shadow-sm'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                          {msg.isEdited && (
                            <span className="text-[11px] opacity-60 ml-1.5 italic">
                              {t('edited_tag')}
                            </span>
                          )}
                        </div>

                          {/* Attachments rendering */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((att) => {
                                if (att.attachmentType === 'IMAGE') {
                                  return (
                                    <div key={att.id} className="rounded-xl overflow-hidden border border-slate-800 max-h-60 shadow-xs">
                                      <img
                                        src={getFullMediaUrl(att.fileUrl)}
                                        alt={att.fileName}
                                        onClick={() => setPreviewImage(getFullMediaUrl(att.fileUrl))}
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                      />
                                    </div>
                                  );
                                }
                                if (att.attachmentType === 'VIDEO') {
                                  return (
                                    <video key={att.id} controls className="rounded-xl max-h-60 w-full bg-black">
                                      <source src={getFullMediaUrl(att.fileUrl)} type={att.mimeType} />
                                    </video>
                                  );
                                }
                                if (att.attachmentType === 'AUDIO') {
                                  return (
                                    <audio key={att.id} controls className="w-full mt-1">
                                      <source src={getFullMediaUrl(att.fileUrl)} type={att.mimeType} />
                                    </audio>
                                  );
                                }

                                // Study Document or Generic File
                                return (
                                  <div
                                    key={att.id}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border gap-2 ${
                                      isMe
                                        ? 'bg-indigo-700/50 border-indigo-400/30 text-white'
                                        : 'bg-slate-950/80 border-slate-800 text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText className={`w-4 h-4 flex-shrink-0 ${isMe ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-300'}`} />
                                      <div className="truncate">
                                        <div className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-slate-100'}`}>
                                          {att.fileName}
                                        </div>
                                        <div className="text-[9px] opacity-70">
                                          {(att.fileSize / 1024).toFixed(1)} KB
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <a
                                        href={getFullMediaUrl(att.fileUrl)}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className={`p-1 rounded transition-colors ${
                                          isMe
                                            ? 'hover:bg-white/10 text-white'
                                            : 'hover:bg-slate-800 text-slate-300'
                                        }`}
                                        title={t('drive_download')}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        onClick={() => handleSaveToDrive(att.id)}
                                        className={`p-1 rounded transition-colors cursor-pointer ${
                                          isMe
                                            ? 'text-amber-300 hover:bg-white/10'
                                            : 'text-amber-500 dark:text-amber-300 hover:bg-amber-500/10'
                                        }`}
                                        title={t('save_to_drive')}
                                      >
                                        <Pin className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Floating Message Action Toolbar on Hover */}
                          {!msg.isDeleted && (
                            <div
                              className={`absolute -bottom-3.5 ${
                                isMe ? 'right-2' : 'left-2'
                              } opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-0.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-slate-400 rounded-full px-2 py-0.5 shadow-xl z-20 pointer-events-none group-hover:pointer-events-auto`}
                            >
                              {/* Standard Reactions Picker */}
                              {STANDARD_REACTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleReaction(msg.id, emoji);
                                  }}
                                  className="hover:scale-125 transition-transform text-xs p-1 leading-none cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}

                              <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />

                              {/* Reply */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(msg);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                                title={t('reply')}
                              >
                                <CornerDownRight className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit (if author) */}
                              {isMe && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(msg);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                                  title={t('edit')}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Pin/Unpin (if mod/admin) */}
                              {isModOrAbove && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(msg.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                                  title={msg.isPinned ? t('unpin') : t('pin')}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete */}
                              {(isMe || isModOrAbove) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(msg.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title={t('delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                    {/* Reactions Pill Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer shadow-xs ${
                              r.hasReacted
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-500 dark:text-indigo-300 font-bold'
                                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-semibold text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ==================== FLOATING NEW MESSAGE BANNER ==================== */}
      <AnimatePresence>
        {!isAtBottom && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
          >
            <span>{t('new_messages_badge')} ({unreadCount})</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-1 text-[11px] text-indigo-500 dark:text-indigo-400 italic bg-slate-950/80 border-t border-slate-800">
          {Array.from(typingUsers.values()).map((u) => u.displayName).join(', ')} đang nhập...
        </div>
      )}

      {/* ==================== INPUT AREA & CONTROLS ==================== */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md relative">
        {/* Muted Warning Banner */}
        {isMuted && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 mb-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-500 dark:text-rose-300">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="font-bold text-rose-600 dark:text-rose-200">Bạn đang bị tắt quyền chat</span>
                <span className="text-slate-400 ml-1.5 truncate">
                  {currentUserMutedUntil ? `(đến ${formatMutedUntil(currentUserMutedUntil)})` : ''} - Bạn chỉ có thể đọc tin nhắn và xem tài liệu
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-500 dark:text-rose-300 border border-rose-500/30 flex-shrink-0">
              Bị Mute
            </span>
          </div>
        )}

        {/* Reply preview banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
              <span className="text-slate-400">{t('reply')}</span>
              <span className="font-semibold text-slate-100 truncate">{replyingTo.sender?.displayName}:</span>
              <span className="text-slate-400 truncate">{replyingTo.content}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2">
            {pendingAttachments.map((att, idx) => (
              <div key={idx} className="relative flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs text-slate-200 flex-shrink-0 shadow-xs">
                <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span className="truncate max-w-[120px]">{att.fileName}</span>
                <button
                  onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-rose-500 ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* @Mention Autocomplete Popover */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30">
            <div className="p-2 text-[10px] font-bold text-slate-400 border-b border-slate-800">Gợi ý tag thành viên</div>
            {mentionSuggestions.map((m) => (
              <div
                key={m.id}
                onClick={() => handleSelectMention(m)}
                className="flex items-center gap-2 p-2 hover:bg-indigo-600/20 cursor-pointer transition-colors text-xs text-slate-100"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-600/20 flex items-center justify-center text-[10px] font-bold text-indigo-500 dark:text-indigo-300">
                  {m.user.avatarUrl ? (
                    <img src={getFullAvatarUrl(m.user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(m.user.displayName || 'U').charAt(0)}</span>
                  )}
                </div>
                <span className="font-semibold">{m.user.displayName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main Input Control Bar */}
        <div className="flex items-end gap-2">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(Array.from(e.target.files))}
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isMuted || uploadingFiles}
            className={`h-[42px] w-[42px] flex items-center justify-center flex-shrink-0 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer ${
              isMuted ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={isMuted ? 'Bạn đang bị tắt quyền chat' : 'Đính kèm tệp / ảnh'}
          >
            {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Paperclip className="w-4 h-4" />}
          </button>

          {/* Textarea */}
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              value={inputText}
              disabled={isMuted}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isMuted ? 'Bạn đang bị tắt quyền gửi tin nhắn trong nhóm này...' : t('chat_input_placeholder')}
              rows={1}
              className={`w-full min-h-[42px] max-h-32 bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-[9px] text-[13.5px] sm:text-sm leading-snug text-slate-100 placeholder-slate-400 focus:outline-none resize-none transition-colors shadow-inner ${
                isMuted ? 'bg-slate-950/40 text-slate-500 border-rose-500/20 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={isMuted || (!inputText.trim() && pendingAttachments.length === 0) || uploadingFiles}
            className={`h-[42px] w-[42px] flex items-center justify-center flex-shrink-0 rounded-xl transition-all shadow-md cursor-pointer disabled:cursor-not-allowed ${
              isMuted
                ? 'bg-slate-800 text-slate-500 opacity-40 shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 disabled:opacity-40'
            }`}
            title={isMuted ? 'Bạn đang bị tắt quyền chat' : t('send')}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ==================== SUB-MODALS ==================== */}
      <ShareDocumentModal
        isOpen={isShareDocOpen}
        onClose={() => setIsShareDocOpen(false)}
        onShare={handleShareStudyDoc}
      />

      <GroupMembersModal
        groupId={groupId}
        currentRole={currentRole}
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        onSelectUser={(userId) => {
          setIsMembersModalOpen(false);
          if (onSelectUser) onSelectUser(userId);
        }}
      />

      <GroupInviteModal
        groupId={groupId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <GroupMediaModal
        groupId={groupId}
        groupName={groupDetail?.group?.name}
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
      />

      <EditGroupModal
        group={groupDetail?.group}
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        onGroupUpdated={(updated) => {
          setGroupDetail(prev => prev ? { ...prev, group: updated } : null);
          showToast(t('group_update_success') || 'Cập nhật thông tin nhóm thành công!', 'success');
          loadGroupDetail();
        }}
        onGroupDeleted={() => {
          showToast(t('delete_group_success') || 'Đã xóa nhóm thành công', 'info');
          onBack();
        }}
        isOwner={currentRole === 'OWNER'}
      />

      <GroupCountdownsModal
        isOpen={isCountdownsModalOpen}
        onClose={() => {
          setIsCountdownsModalOpen(false);
          loadGroupCountdowns();
        }}
        group={groupDetail?.group}
        isOwnerOrMod={isModOrAbove}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

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
    </div>
  );
}
