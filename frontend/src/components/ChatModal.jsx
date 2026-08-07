import React, { useState, useEffect, useCallback, useRef } from 'react';
import { messageApi, friendsApi, getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { subscribeToMessages } from '../websocket';
import {
  MessageSquare, X, Send, Search, Smile, ShieldAlert, UserPlus, CheckCheck,
  ChevronLeft, Loader2, Sparkles, Circle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_EMOJIS = ['😊', '👍', '🔥', '📚', '💪', '✨', '❤️', '🎯', '🎉', '🚀', '💡', '👏', '💯', '🙌', '✍️', '🧠'];

export default function ChatModal({ isOpen, onClose, activeTargetUser = null, onSelectProfile = null }) {
  const { user, refreshProgress } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [restrictionNotice, setRestrictionNotice] = useState(null);
  const [canSend, setCanSend] = useState(true);
  const [loadedPartnerId, setLoadedPartnerId] = useState(null);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations list
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const data = await messageApi.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.warn('Lỗi tải danh sách cuộc trò chuyện:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Fetch conversations when modal opens or user/activeTargetUser changes
  useEffect(() => {
    if (!user) return;
    if (isOpen) {
      fetchConversations();
    }
  }, [user, isOpen, fetchConversations]);

  // Global WebSocket listener to update conversations & unread count in real-time
  useEffect(() => {
    if (!user) return;
    const unsubscribeWs = subscribeToMessages(() => {
      fetchConversations();
    });
    return () => unsubscribeWs();
  }, [user, fetchConversations]);

  // Handle pre-selected target user from props
  useEffect(() => {
    const targetId = activeTargetUser?.userId || activeTargetUser?.id;
    if (!targetId) return;

    if (selectedPartner?.partnerId === targetId) return;

    const existing = conversations.find(c => c.partnerId === targetId);
    if (existing) {
      setSelectedPartner(existing);
    } else {
      const tempPartner = {
        partnerId: targetId,
        partnerDisplayName: activeTargetUser.displayName || activeTargetUser.partnerDisplayName || 'Người dùng',
        partnerAvatarUrl: activeTargetUser.avatarUrl || activeTargetUser.partnerAvatarUrl,
        partnerSelectedTitle: activeTargetUser.selectedTitle || activeTargetUser.partnerSelectedTitle || 'Tân Binh Tập Trung',
        partnerLevel: activeTargetUser.currentLevel || activeTargetUser.partnerLevel || 1,
        isPartnerOnline: activeTargetUser.isOnline || false,
        canSendMessage: true,
        restrictionReason: '',
      };
      setSelectedPartner(tempPartner);
    }
  }, [activeTargetUser, conversations, selectedPartner?.partnerId]);

  // Load messages for selected partner
  useEffect(() => {
    if (!selectedPartner?.partnerId || !user) return;

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        if (loadedPartnerId !== selectedPartner.partnerId) {
          setLoadingMessages(true);
        }
        const data = await messageApi.getConversationMessages(selectedPartner.partnerId, 0, 50);
        if (isMounted) {
          const list = (data?.content || []).reverse();
          setMessages(list);
          setLoadedPartnerId(selectedPartner.partnerId);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.warn('Lỗi tải tin nhắn:', err);
        if (isMounted) {
          setMessages([]);
          setLoadedPartnerId(selectedPartner.partnerId);
        }
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    const checkPermission = async () => {
      try {
        const perm = await messageApi.checkCanSend(selectedPartner.partnerId);
        if (isMounted) {
          setCanSend(perm.canSend);
          setRestrictionNotice(perm.reason || null);
        }
      } catch (err) {
        if (isMounted) {
          setCanSend(false);
          setRestrictionNotice(getErrorMessage(err));
        }
      }
    };

    fetchMessages();
    checkPermission();
    messageApi.markAsRead(selectedPartner.partnerId)
      .then(() => {
        if (refreshProgress) refreshProgress();
        fetchConversations();
      })
      .catch(() => {});

    // Real-time message listener via WebSocket for the active chat conversation
    const unsubscribeWs = subscribeToMessages((incomingMsg) => {
      fetchConversations();
      if (incomingMsg.senderId === selectedPartner.partnerId) {
        setMessages((prev) => [...prev, incomingMsg]);
        setTimeout(scrollToBottom, 50);
        messageApi.markAsRead(selectedPartner.partnerId).then(() => {
          if (refreshProgress) refreshProgress();
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubscribeWs();
    };
  }, [selectedPartner?.partnerId, user, fetchConversations, loadedPartnerId, refreshProgress]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedPartner || !canSend || sending) return;

    const text = inputText.trim();
    setInputText('');
    setShowEmojiPicker(false);
    setSending(true);

    // Optimistic UI Message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      senderId: user.userId || user.id,
      senderName: user.displayName,
      senderAvatar: user.avatarUrl,
      recipientId: selectedPartner.partnerId,
      content: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      isMine: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const realMsg = await messageApi.sendMessage(selectedPartner.partnerId, text);
      setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
      fetchConversations();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setCanSend(false);
      setRestrictionNotice(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!selectedPartner?.partnerId) return;
    try {
      await friendsApi.sendRequest(selectedPartner.partnerId);
      setRestrictionNotice('Đã gửi lời mời kết bạn! Vui lòng chờ đối phương chấp nhận để bắt đầu nhắn tin.');
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  const filteredConversations = conversations.filter(c =>
    (c.partnerDisplayName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div 
        className="fixed right-6 bottom-6 z-50 font-sans transition-all duration-300"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-[92vw] sm:w-[380px] md:w-[620px] h-[480px] md:h-[520px] bg-slate-900/95 backdrop-blur-2xl border border-slate-800/90 rounded-3xl shadow-2xl flex overflow-hidden relative"
        >
            {/* Left Sidebar: Conversations List */}
            <div className={`w-full md:w-72 bg-slate-950/80 border-r border-slate-800/80 flex flex-col ${selectedPartner ? 'hidden md:flex' : 'flex'}`}>
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">Hộp Thư Thoại</h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm hội thoại..."
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2 outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
                {loadingConversations && conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    <span className="text-xs">Đang tải hộp thư...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    Chưa có cuộc trò chuyện nào. Hãy nhấn vào hồ sơ bạn bè để bắt đầu nhắn tin!
                  </div>
                ) : (
                  filteredConversations.map((item) => {
                    const isSelected = selectedPartner?.partnerId === item.partnerId;
                    return (
                      <button
                        key={item.partnerId}
                        onClick={() => setSelectedPartner(item)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all cursor-pointer text-left relative ${
                          isSelected
                            ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                            : 'hover:bg-slate-900/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.partnerAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={item.partnerDisplayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700"
                          />
                          {item.isPartnerOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate text-slate-100">{item.partnerDisplayName}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.lastMessageContent || 'Đã khởi tạo hội thoại'}
                          </p>
                        </div>
                        {item.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                            {item.unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Main Chat Panel */}
            <div className={`flex-1 flex flex-col bg-slate-900/90 ${!selectedPartner ? 'hidden md:flex' : 'flex'}`}>
              {selectedPartner ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3.5 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedPartner(null)}
                        className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <img
                        src={selectedPartner.partnerAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={selectedPartner.partnerDisplayName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700 cursor-pointer"
                        onClick={() => onSelectProfile && onSelectProfile(selectedPartner.partnerId)}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => onSelectProfile && onSelectProfile(selectedPartner.partnerId)}
                            className="text-xs font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            {selectedPartner.partnerDisplayName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold border border-indigo-500/20">
                            {selectedPartner.partnerSelectedTitle || 'Lv.' + (selectedPartner.partnerLevel || 1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Circle className={`w-2 h-2 fill-current ${selectedPartner.isPartnerOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
                          {selectedPartner.isPartnerOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Đóng"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Stream */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        <span className="text-xs">Đang tải tin nhắn...</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center gap-2">
                        <Sparkles className="w-8 h-8 text-indigo-400 animate-bounce" />
                        <p className="text-xs font-semibold text-slate-300">Hãy gửi lời chào đầu tiên!</p>
                        <p className="text-[11px] text-slate-500 max-w-xs">Giao lưu bài học, tạo động lực học tập cùng nhau.</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.isMine;
                        const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isMine && (
                              <img
                                src={selectedPartner.partnerAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-slate-700 mb-1 flex-shrink-0"
                              />
                            )}
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs shadow-md relative ${
                              isMine
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                                : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-none'
                            }`}>
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-1 text-[9px] ${isMine ? 'text-indigo-200 justify-end' : 'text-slate-400'}`}>
                                <span>{timeStr}</span>
                                {isMine && (
                                  <CheckCheck className={`w-3 h-3 ${msg.isRead ? 'text-emerald-300' : 'text-indigo-300/70'}`} />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Privacy Restriction Banner */}
                  {!canSend && restrictionNotice && (
                    <div className="m-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{restrictionNotice}</span>
                      </div>
                      {restrictionNotice.includes('bạn bè') && (
                        <button
                          type="button"
                          onClick={handleSendFriendRequest}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md flex-shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Kết bạn</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Input Bar */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/80 relative">
                    {/* Emoji Picker Popup */}
                    {showEmojiPicker && canSend && (
                      <div className="absolute bottom-16 left-3 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl grid grid-cols-8 gap-2 z-20">
                        {PRESET_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setInputText(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-lg hover:scale-125 transition-transform cursor-pointer p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canSend}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        disabled={!canSend || sending}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={canSend ? "Nhập tin nhắn..." : "Không thể nhắn tin..."}
                        className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:opacity-50 transition-all"
                      />

                      <button
                        type="submit"
                        disabled={!canSend || !inputText.trim() || sending}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:brightness-110 disabled:opacity-40 transition-all shadow-md cursor-pointer flex-shrink-0"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                // Empty state when no conversation is selected
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 gap-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">Chọn cuộc trò chuyện để bắt đầu</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Giao lưu, trao đổi kinh nghiệm và cùng nhau bứt phá mục tiêu học tập!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
      </div>
    </AnimatePresence>
  );
}
