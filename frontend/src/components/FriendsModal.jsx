import React, { useState, useEffect, useCallback } from 'react';
import { friendsApi, userApi, getErrorMessage } from '../api';
import { X, Users, UserPlus, Check, Trash2, Search, UserCheck, Shield, Clock, Flame, MessageSquare } from 'lucide-react';

export default function FriendsModal({ isOpen, onClose, onViewProfile, onRefreshUserProgress, onOpenChat }) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadFriendsData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [friendsList, received, sent] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequestsReceived(),
        friendsApi.getPendingRequestsSent(),
      ]);
      setFriends(friendsList || []);
      setReceivedRequests(received || []);
      setSentRequests(sent || []);
    } catch (err) {
      console.error('Error loading friends data:', err);
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadFriendsData();
    }
  }, [isOpen, loadFriendsData]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await userApi.searchUsers(searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await friendsApi.sendRequest(userId);
      setSuccessMsg('Đã gửi lời mời kết bạn!');
      loadFriendsData();
      if (searchQuery) handleSearch();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await friendsApi.acceptRequest(friendshipId);
      setSuccessMsg('Đã đồng ý kết bạn!');
      loadFriendsData();
      if (onRefreshUserProgress) onRefreshUserProgress();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      await friendsApi.declineRequest(friendshipId);
      setSuccessMsg('Đã từ chối/hủy lời mời.');
      loadFriendsData();
      if (onRefreshUserProgress) onRefreshUserProgress();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  const handleUnfriend = async (friendId, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy kết bạn với ${name}?`)) return;
    try {
      await friendsApi.unfriend(friendId);
      setSuccessMsg(`Đã hủy kết bạn với ${name}.`);
      loadFriendsData();
      if (onRefreshUserProgress) onRefreshUserProgress();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Danh Sách Bạn Bè</h2>
              <p className="text-xs text-slate-400">Kết nối và cùng nhau cày XP học tập</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3.5 px-4 text-xs font-bold transition-all relative border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'friends'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Bạn bè ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3.5 px-4 text-xs font-bold transition-all relative border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Lời mời</span>
            {receivedRequests.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-rose-500 text-white font-extrabold rounded-full">
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`py-3.5 px-4 text-xs font-bold transition-all relative border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'search'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Tìm bạn mới</span>
          </button>
        </div>

        {/* Notifications & Status Messages */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: Friends List */}
          {activeTab === 'friends' && (
            <div>
              {isLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Đang tải danh sách bạn bè...</div>
              ) : friends.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Bạn chưa có bạn bè nào</p>
                  <p className="text-xs text-slate-500 mt-1">Chuyển sang tab "Tìm bạn mới" để kết nối với các bạn học khác nhé!</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    Tìm bạn ngay
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.userId}
                      className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group"
                    >
                      <div
                        onClick={() => onViewProfile && onViewProfile(friend.userId)}
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={friend.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.userId}`}
                            alt={friend.displayName}
                            className="w-11 h-11 rounded-full object-cover border border-slate-700 bg-slate-800"
                          />
                          {friend.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100 truncate group-hover:text-indigo-400 transition-colors">
                              {friend.displayName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-950 border border-indigo-800/80 text-[10px] text-indigo-300 font-extrabold rounded-md flex-shrink-0">
                              Lvl {friend.currentLevel}
                            </span>
                          </div>
                          
                          {/* Activity Tag */}
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                            {friend.isStudying ? (
                              <span className="text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                                <Flame className="w-3 h-3 text-amber-500" />
                                <span>Đang học: {friend.currentSubject || 'Tự do'}</span>
                              </span>
                            ) : friend.isOnline ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                <span>Đang Online</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Ngoại tuyến</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {onOpenChat && (
                          <button
                            onClick={() => {
                              onOpenChat({
                                userId: friend.userId,
                                displayName: friend.displayName,
                                avatarUrl: friend.avatarUrl,
                                selectedTitle: friend.selectedTitle,
                                currentLevel: friend.currentLevel,
                                isOnline: friend.isOnline,
                              });
                              onClose();
                            }}
                            title="Nhắn tin"
                            className="p-2 text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 rounded-xl transition-all cursor-pointer border border-indigo-500/20"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleUnfriend(friend.userId, friend.displayName)}
                          title="Hủy kết bạn"
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Friend Requests (Received & Sent) */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              
              {/* Received Requests */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lời mời nhận được ({receivedRequests.length})</span>
                </h3>

                {receivedRequests.length === 0 ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center text-xs text-slate-500">
                    Không có lời mời kết bạn nào đang chờ.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {receivedRequests.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div
                          onClick={() => onViewProfile && onViewProfile(req.userId)}
                          className="flex items-center gap-3 cursor-pointer min-w-0"
                        >
                          <img
                            src={req.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.userId}`}
                            alt={req.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-100 block truncate hover:text-indigo-400">
                              {req.displayName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Level {req.currentLevel} • {req.selectedTitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req.friendshipId)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Đồng ý</span>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.friendshipId)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lời mời đã gửi ({sentRequests.length})</span>
                </h3>

                {sentRequests.length === 0 ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl text-center text-xs text-slate-500">
                    Bạn chưa gửi lời mời kết bạn nào.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentRequests.map((req) => (
                      <div
                        key={req.friendshipId}
                        className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div
                          onClick={() => onViewProfile && onViewProfile(req.userId)}
                          className="flex items-center gap-3 cursor-pointer min-w-0"
                        >
                          <img
                            src={req.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.userId}`}
                            alt={req.displayName}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate hover:text-indigo-400">
                              {req.displayName}
                            </span>
                            <span className="text-[11px] text-slate-400">Level {req.currentLevel}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeclineRequest(req.friendshipId)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          Hủy lời mời
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: Search & Add Friends */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tên hoặc email bạn học..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow transition-all cursor-pointer flex-shrink-0"
                >
                  {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.userId}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => onViewProfile && onViewProfile(user.userId)}
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                      >
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-100 truncate hover:text-indigo-400">
                              {user.displayName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-950 border border-indigo-800/80 text-[10px] text-indigo-300 font-bold rounded-md">
                              Lvl {user.currentLevel}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {user.selectedTitle || 'Tân Binh Tập Trung'}
                          </span>
                        </div>
                      </div>

                      {user.friendshipStatus === 'FRIENDS' && (
                        <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1 flex-shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Bạn bè</span>
                        </span>
                      )}

                      {user.friendshipStatus === 'PENDING_SENT' && (
                        <span className="px-3 py-1 bg-slate-800 text-amber-300 text-xs font-semibold rounded-xl flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Đã gửi lời mời</span>
                        </span>
                      )}

                      {user.friendshipStatus === 'PENDING_RECEIVED' && (
                        <button
                          onClick={() => handleAcceptRequest(user.friendshipId)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1 flex-shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Chấp nhận</span>
                        </button>
                      )}

                      {user.friendshipStatus === 'SELF' && (
                        <span className="px-2.5 py-1 text-xs text-slate-500 font-semibold flex-shrink-0">
                          Bạn
                        </span>
                      )}

                      {(!user.friendshipStatus || user.friendshipStatus === 'NONE') && (
                        <button
                          onClick={() => handleSendRequest(user.userId)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Kết bạn</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
