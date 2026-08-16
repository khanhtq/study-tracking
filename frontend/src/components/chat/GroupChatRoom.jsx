import React, { useState, useEffect, useRef, useCallback } from 'react';
import { communityChatApi } from '../../api';
import { subscribeToGroup, publishGroupMessage, publishGroupReaction, publishGroupTyping } from '../../websocket';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ShareDocumentModal from './ShareDocumentModal';
import GroupMembersModal from './GroupMembersModal';
import GroupInviteModal from './GroupInviteModal';
import {
  ArrowLeft, Search, Pin, Users, Link2, FileText, Send, Paperclip,
  Smile, CornerDownRight, X, Edit2, Trash2, ChevronDown, Check,
  Download, Loader2, Play, Image as ImageIcon, Volume2, ShieldCheck,
  Shield, Crown, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STANDARD_REACTIONS = ['👍', '❤️', '🔥', '💡', '👏', '🎉'];

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

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
  const [isShareDocOpen, setIsShareDocOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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
    } finally {
      setLoadingDetail(false);
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
    } finally {
      setLoadingMessages(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupDetail();
    loadInitialMessages();
  }, [loadGroupDetail, loadInitialMessages]);

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
    } finally {
      setUploadingFiles(false);
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

  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setEditContent(msg.content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      await communityChatApi.editMessage(groupId, editingMessage.id, editContent.trim());
      setEditingMessage(null);
      setEditContent('');
    } catch (err) {
      console.error('Lỗi sửa tin nhắn:', err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await communityChatApi.deleteMessage(groupId, msgId);
    } catch (err) {
      console.error('Lỗi xóa tin nhắn:', err);
    }
  };

  const handleToggleReaction = async (msgId, emoji) => {
    publishGroupReaction(groupId, msgId, emoji);
  };

  const handleTogglePin = async (msgId) => {
    try {
      await communityChatApi.togglePinMessage(groupId, msgId);
      await loadGroupDetail();
    } catch (err) {
      console.error('Lỗi ghim tin nhắn:', err);
    }
  };

  const handleSaveToDrive = async (attachmentId) => {
    try {
      await communityChatApi.saveSharedDocumentToMyLibrary(groupId, attachmentId);
      alert(t('saved_to_drive_success'));
    } catch (err) {
      console.error('Lỗi lưu tài liệu vào kho:', err);
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
    } catch (err) {
      console.error('Lỗi chia sẻ tài liệu:', err);
    }
  };

  const currentRole = groupDetail?.group?.currentUserRole;
  const isModOrAbove = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'MODERATOR';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="relative flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl"
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
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Quay lại danh sách nhóm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-300 overflow-hidden">
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
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {t('privacy_public')}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {t('privacy_private')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {groupDetail?.group?.memberCount || 0} {t('members_count')}
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Pinned Messages Button */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedDropdown(!showPinnedDropdown)}
              className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
              title={t('pinned_messages')}
            >
              <Pin className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                {pinnedMessages.length}
              </span>
            </button>
          )}

          {/* Search messages */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={t('search_messages')}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Share from Drive */}
          <button
            onClick={() => setIsShareDocOpen(true)}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition-colors hidden sm:flex"
            title={t('share_document_from_drive')}
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Invite links */}
          {isModOrAbove && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition-colors"
              title={t('invite_link')}
            >
              <Link2 className="w-4 h-4" />
            </button>
          )}

          {/* Members list & Moderation */}
          <button
            onClick={() => setIsMembersModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={t('group_members_list')}
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pinned Messages Drawer / Banner */}
      {showPinnedDropdown && pinnedMessages.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2 z-20 shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5" />
              {t('pinned_messages')} ({pinnedMessages.length})
            </span>
            <button onClick={() => setShowPinnedDropdown(false)} className="text-slate-400 hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {pinnedMessages.map((pm) => (
            <div key={pm.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <div className="truncate pr-2">
                <span className="font-semibold text-slate-300 mr-2">{pm.sender?.displayName}:</span>
                <span className="text-slate-400">{pm.messageContent}</span>
              </div>
              {isModOrAbove && (
                <button
                  onClick={() => handleTogglePin(pm.messageId)}
                  className="text-slate-500 hover:text-rose-400 flex-shrink-0"
                  title={t('unpin')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* In-room Search Bar Popover */}
      {isSearchOpen && (
        <div className="bg-slate-900 border-b border-slate-800 p-3 space-y-2 z-20">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('search_messages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchMessages()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSearchMessages}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              {t('search_messages').split(' ')[0]}
            </button>
            <button onClick={() => { setIsSearchOpen(false); setSearchResults([]); }} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
              {searchResults.map((sm) => (
                <div key={sm.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
                  <span className="font-semibold text-indigo-300 mr-2">{sm.sender?.displayName}:</span>
                  <span className="text-slate-300">{sm.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== MESSAGES LIST ==================== */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 text-xs">
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
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <span className="text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                      {msg.content}
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
                    className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/30 flex items-center justify-center text-xs font-bold text-indigo-300 border border-slate-800 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all mt-1"
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
                  <div className={`flex flex-col max-w-[80%] sm:max-w-md ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Header info (Name & Time) */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span
                        onClick={() => msg.sender?.id && onSelectUser && onSelectUser(msg.sender.id)}
                        className="font-semibold text-slate-300 hover:text-indigo-400 cursor-pointer transition-colors"
                      >
                        {msg.sender?.displayName}
                      </span>
                      <span>•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.isPinned && <Pin className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                    </div>

                    {/* Reply To Reference Bubble */}
                    {msg.replyTo && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/80 border-l-2 border-indigo-500 px-2 py-1 rounded mb-1 max-w-full truncate">
                        <CornerDownRight className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span className="font-semibold text-slate-300">{msg.replyTo.senderDisplayName}:</span>
                        <span className="truncate">{msg.replyTo.content}</span>
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div
                      className={`relative p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {/* Editing state */}
                      {editingMessage?.id === msg.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingMessage(null)}
                              className="text-[10px] text-slate-300 hover:text-white"
                            >
                              {t('drive_btn_cancel')}
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              className="px-2.5 py-1 bg-white text-indigo-900 rounded font-bold text-[10px]"
                            >
                              {t('drive_btn_save')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content}
                            {msg.isEdited && (
                              <span className="text-[10px] opacity-60 ml-1.5 italic">
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
                                    <div key={att.id} className="rounded-xl overflow-hidden border border-white/10 max-h-60">
                                      <img
                                        src={att.fileUrl}
                                        alt={att.fileName}
                                        onClick={() => setPreviewImage(att.fileUrl)}
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                      />
                                    </div>
                                  );
                                }
                                if (att.attachmentType === 'VIDEO') {
                                  return (
                                    <video key={att.id} controls className="rounded-xl max-h-60 w-full bg-black">
                                      <source src={att.fileUrl} type={att.mimeType} />
                                    </video>
                                  );
                                }
                                if (att.attachmentType === 'AUDIO') {
                                  return (
                                    <audio key={att.id} controls className="w-full mt-1">
                                      <source src={att.fileUrl} type={att.mimeType} />
                                    </audio>
                                  );
                                }

                                // Study Document or Generic File
                                return (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/10 gap-2"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText className="w-4 h-4 text-indigo-300 flex-shrink-0" />
                                      <div className="truncate">
                                        <div className="text-[11px] font-semibold truncate">{att.fileName}</div>
                                        <div className="text-[9px] opacity-70">
                                          {(att.fileSize / 1024).toFixed(1)} KB
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <a
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="p-1 rounded hover:bg-white/10 text-white transition-colors"
                                        title={t('drive_download')}
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        onClick={() => handleSaveToDrive(att.id)}
                                        className="p-1 rounded hover:bg-white/10 text-amber-300 transition-colors"
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
                        </>
                      )}
                    </div>

                    {/* Reactions Pill Display */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {msg.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => handleToggleReaction(msg.id, r.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-all ${
                              r.hasReacted
                                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{r.emoji}</span>
                            <span className="font-semibold text-[10px]">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message Action Toolbar on Hover */}
                  {!msg.isDeleted && (
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-1.5 py-1 shadow-lg self-center ${
                        isMe ? 'mr-1' : 'ml-1'
                      }`}
                    >
                      {/* Standard Reactions Picker */}
                      {STANDARD_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform text-xs p-1"
                        >
                          {emoji}
                        </button>
                      ))}

                      <div className="w-[1px] h-3 bg-slate-800 mx-0.5" />

                      {/* Reply */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                        title={t('reply')}
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit (if author) */}
                      {isMe && (
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Pin/Unpin (if mod/admin) */}
                      {isModOrAbove && (
                        <button
                          onClick={() => handleTogglePin(msg.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          title={msg.isPinned ? t('unpin') : t('pin')}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      {(isMe || isModOrAbove) && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
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
        <div className="px-4 py-1 text-[11px] text-indigo-400 italic bg-slate-950/80">
          {Array.from(typingUsers.values()).map((u) => u.displayName).join(', ')} đang nhập...
        </div>
      )}

      {/* ==================== INPUT AREA & CONTROLS ==================== */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md relative">
        {/* Reply preview banner */}
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-slate-400">{t('reply')}</span>
              <span className="font-semibold text-slate-200 truncate">{replyingTo.sender?.displayName}:</span>
              <span className="text-slate-400 truncate">{replyingTo.content}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2">
            {pendingAttachments.map((att, idx) => (
              <div key={idx} className="relative flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs text-slate-300 flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate max-w-[120px]">{att.fileName}</span>
                <button
                  onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-slate-500 hover:text-rose-400 ml-1"
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
                className="flex items-center gap-2 p-2 hover:bg-indigo-600/20 cursor-pointer transition-colors text-xs text-slate-200"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-600/40 flex items-center justify-center text-[10px]">
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
            disabled={uploadingFiles}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
            title="Đính kèm tệp / ảnh"
          >
            {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Paperclip className="w-4 h-4" />}
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t('chat_input_placeholder')}
              rows={1}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-32 transition-colors"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!inputText.trim() && pendingAttachments.length === 0) || uploadingFiles}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={t('send')}
          >
            <Send className="w-4 h-4" />
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
        >
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
