const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Custom API error with HTTP status and i18n key for friendly UI messages.
 */
export class ApiError extends Error {
  constructor(message, status, errorKey) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorKey = errorKey; // translation key for LanguageContext
  }
}

/**
 * Helper to extract a user-facing error message from an error object.
 * Gives precedence to explicit server/client error messages over generic translation keys.
 *
 * @param {Error|ApiError|object} err - The caught error
 * @param {string} fallbackKey - Key in LanguageContext translations to use as fallback
 * @param {Function} [t] - Translation function from LanguageContext
 * @returns {string} - Clear error string for display
 */
export const getErrorMessage = (err, fallbackKey = 'error_unknown', t = (k) => k) => {
  if (!err) return t ? t(fallbackKey) : fallbackKey;

  if (typeof err === 'string') return err;

  // If explicit message exists from backend or client validation
  if (err.message && typeof err.message === 'string' && !err.message.startsWith('API error:')) {
    return err.message;
  }

  // Fallback to errorKey translation if available
  if (err.errorKey && t) {
    const translated = t(err.errorKey);
    if (translated && translated !== err.errorKey) {
      return translated;
    }
  }

  return t ? t(fallbackKey) : fallbackKey;
};

/**
 * Map an HTTP status code + endpoint context to a translation key.
 * Falls back to generic keys so every error has a human-readable message.
 *
 * @param {number} status - HTTP response status code
 * @param {string} endpoint - The API endpoint string (e.g. '/auth/login')
 * @returns {string} - A key present in LanguageContext translations
 */
export const getErrorKey = (status, endpoint = '') => {
  // Auth-specific errors
  if (endpoint.includes('/auth/login')) {
    if (status === 401 || status === 403) return 'error_invalid_credentials';
    if (status === 404) return 'error_account_not_found';
    if (status === 429) return 'error_too_many_requests';
  }
  if (endpoint.includes('/auth/register')) {
    if (status === 409) return 'error_email_already_exists';
    if (status === 422 || status === 400) return 'error_invalid_input';
    if (status === 429) return 'error_too_many_requests';
  }
  // Session errors
  if (endpoint.includes('/study-sessions')) {
    if (status === 409) return 'error_session_already_active';
    if (status === 404) return 'error_session_not_found';
  }
  // Generic status-based fallbacks
  if (status === 400) return 'error_bad_request';
  if (status === 401) return 'error_unauthorized';
  if (status === 403) return 'error_forbidden';
  if (status === 404) return 'error_not_found';
  if (status === 429) return 'error_too_many_requests';
  if (status >= 500) return 'error_server';
  return 'error_unknown';
};

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

let serverClientOffset = 0;

export const getServerClientOffset = () => serverClientOffset;

export const apiCall = async (endpoint, options = {}) => {
  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;
  const headers = { ...getHeaders(), ...options.headers };
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Extract server date header for clock synchronization to resolve timezone/clock drift
  const serverDate = response.headers.get('Date');
  if (serverDate) {
    try {
      const serverTime = new Date(serverDate).getTime();
      const clientTime = Date.now();
      if (!isNaN(serverTime)) {
        serverClientOffset = clientTime - serverTime;
      }
    } catch (e) {
      console.warn('Failed to parse server Date header:', e);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const isBanError = errorData.banned || (errorData.message && (
      errorData.message.toLowerCase().includes('banned') ||
      errorData.message.toLowerCase().includes('cấm') ||
      errorData.message.toLowerCase().includes('khóa')
    ));

    if (isBanError) {
      const banNotice = {
        banned: true,
        reason: errorData.banReason || errorData.message || 'Tài khoản của bạn đã bị khóa do vi phạm quy chuẩn cộng đồng.'
      };
      localStorage.setItem('ban_notice', JSON.stringify(banNotice));
      window.dispatchEvent(new CustomEvent('ban-notice-trigger', { detail: banNotice }));
    }

    if ((response.status === 403 || response.status === 401) && !isGuestMode() && !cleanEndpoint.startsWith('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth-expired', {
        detail: isBanError ? {
          banned: true,
          reason: errorData.banReason || errorData.message
        } : null
      }));
    }

    const errorKey = getErrorKey(response.status, cleanEndpoint);
    throw new ApiError(
      errorData.message || `API error: ${response.status}`,
      response.status,
      errorKey
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
};


const isGuestMode = () => localStorage.getItem('isGuest') === 'true';

const getGuestProgress = () => {
  const saved = localStorage.getItem('guest_progress');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  const guestUserStr = localStorage.getItem('guest_user');
  let displayName = 'Khách';
  if (guestUserStr) {
    try { displayName = JSON.parse(guestUserStr).displayName || displayName; } catch(e) {}
  }
  return {
    userId: 'guest',
    displayName,
    currentLevel: 1,
    currentXp: 0,
    totalXp: 0,
    xpRequiredForNextLevel: 100,
    isGuest: true
  };
};

const updateGuestProgressWithXp = (xpEarned) => {
  const progress = getGuestProgress();
  let totalXp = progress.totalXp + xpEarned;
  let currentXp = progress.currentXp + xpEarned;
  let currentLevel = progress.currentLevel;

  const getXpRequiredForNextLevel = (level) => Math.round(100 * Math.pow(level, 1.5));

  while (true) {
    const xpReq = getXpRequiredForNextLevel(currentLevel);
    if (currentXp >= xpReq) {
      currentXp -= xpReq;
      currentLevel++;
    } else {
      break;
    }
  }

  const updatedProgress = {
    ...progress,
    currentLevel,
    currentXp,
    totalXp,
    xpRequiredForNextLevel: getXpRequiredForNextLevel(currentLevel)
  };

  localStorage.setItem('guest_progress', JSON.stringify(updatedProgress));
  return updatedProgress;
};

export const authApi = {
  register: (email, password, displayName) => 
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  verifyOtp: (email, otp) =>
    apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  resendOtp: (email) =>
    apiCall('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  forgotPassword: (email) =>
    apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyResetOtp: (email, otp) =>
    apiCall('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  resetPassword: (email, otp, newPassword) =>
    apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    }),
  login: (email, password) => 
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  loginWithGoogle: (idToken) =>
    apiCall('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),
};

export const userApi = {
  getMe: () => {
    if (isGuestMode()) {
      return Promise.resolve(getGuestProgress());
    }
    return apiCall('/users/me');
  },
  updateProfile: (profileData) => {
    if (isGuestMode()) {
      const current = getGuestProgress();
      const updated = { ...current, ...profileData };
      localStorage.setItem('guest_progress', JSON.stringify(updated));
      return Promise.resolve(updated);
    }
    return apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
  uploadAvatar: (file) => {
    if (isGuestMode()) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const avatarUrl = reader.result;
          const current = getGuestProgress();
          const updated = { ...current, avatarUrl };
          localStorage.setItem('guest_progress', JSON.stringify(updated));
          resolve(updated);
        };
        reader.readAsDataURL(file);
      });
    }
    const formData = new FormData();
    formData.append('file', file);
    return apiCall('/users/avatar', {
      method: 'POST',
      body: formData,
    });
  },
  changePassword: (currentPassword, newPassword, confirmPassword) => {
    if (isGuestMode()) {
      return Promise.reject(new ApiError('Tài khoản Khách không thể thay đổi mật khẩu.', 400));
    }
    return apiCall('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  },
  getAvailableTitles: () => {
    if (isGuestMode()) {
      const current = getGuestProgress();
      const level = current.currentLevel || 1;
      return Promise.resolve([
        { title: 'Tân Binh Tập Trung', description: 'Dành cho mọi thành viên mới bắt đầu hành trình học tập', minLevelRequired: 1, unlocked: true },
        { title: 'Học Giả Bền Bỉ', description: 'Đạt Level 3 - Tinh thần kiên trì', minLevelRequired: 3, unlocked: level >= 3 },
        { title: 'Chiến Binh Pomodoro', description: 'Đạt Level 5 - Làm chủ kỹ năng quản lý thời gian', minLevelRequired: 5, unlocked: level >= 5 },
      ]);
    }
    return apiCall('/users/titles');
  },
  getOnline: () => {
    if (isGuestMode()) {
      return apiCall('/users/online').catch(() => []);
    }
    return apiCall('/users/online');
  },
  searchUsers: (query) => {
    if (!query || !query.trim()) return Promise.resolve([]);
    if (isGuestMode()) {
      return apiCall(`/users/search?q=${encodeURIComponent(query)}`).catch(() => []);
    }
    return apiCall(`/users/search?q=${encodeURIComponent(query)}`);
  },
  getPublicProfile: (userId) => {
    if (!userId || userId === 'guest') {
      return Promise.reject(new Error('Tài khoản khách không có hồ sơ công khai'));
    }
    return apiCall(`/users/${userId}/public-profile`);
  },
  togglePremium: () => {
    if (isGuestMode()) {
      const current = getGuestProgress();
      const updated = { ...current, isPremium: !current.isPremium };
      localStorage.setItem('guest_progress', JSON.stringify(updated));
      return Promise.resolve(updated);
    }
    return apiCall('/users/premium/toggle', { method: 'POST' });
  },
};

export const sessionApi = {
  start: (subject, studyMethod, targetDurationSeconds) => {
    if (isGuestMode()) {
      const session = {
        id: 'guest-session-' + Date.now(),
        subject: subject || '',
        studyMethod: studyMethod || 'FREE_MODE',
        targetDurationSeconds: targetDurationSeconds || null,
        startedAt: new Date().toISOString(),
        source: 'TIMER'
      };
      localStorage.setItem('guest_active_session', JSON.stringify(session));
      return Promise.resolve(session);
    }
    return apiCall('/study-sessions/start', {
      method: 'POST',
      body: JSON.stringify({ subject, studyMethod, targetDurationSeconds }),
    });
  },
  stop: (id) => {
    if (isGuestMode()) {
      const activeStr = localStorage.getItem('guest_active_session');
      const active = activeStr ? JSON.parse(activeStr) : {};
      const start = active.startedAt ? new Date(active.startedAt).getTime() : Date.now();
      const now = Date.now();
      const durationSeconds = Math.max(0, Math.floor((now - start) / 1000));
      const minutes = durationSeconds / 60;
      const baseXp = minutes * 10;
      let finalXp = durationSeconds >= 1500 ? Math.round(baseXp * 1.1) : Math.round(baseXp);
      let isCompleted = false;

      if (active.targetDurationSeconds && durationSeconds >= (active.targetDurationSeconds - 5)) {
        isCompleted = true;
        finalXp = Math.round(finalXp * 1.15);
      }

      const finishedSession = {
        id: active.id || ('guest-session-' + Date.now()),
        subject: active.subject || '',
        studyMethod: active.studyMethod || 'FREE_MODE',
        targetDurationSeconds: active.targetDurationSeconds || null,
        isCompleted,
        startedAt: active.startedAt || new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds,
        xpEarned: finalXp,
        source: 'TIMER'
      };

      const historyStr = localStorage.getItem('guest_sessions');
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.unshift(finishedSession);
      localStorage.setItem('guest_sessions', JSON.stringify(history));
      localStorage.removeItem('guest_active_session');

      updateGuestProgressWithXp(finalXp);

      return Promise.resolve(finishedSession);
    }
    return apiCall(`/study-sessions/${id}/stop`, {
      method: 'POST',
    });
  },
  createManual: (subject, durationSeconds, startedAt) => {
    if (isGuestMode()) {
      const durationSecs = parseInt(durationSeconds, 10);
      const minutes = durationSecs / 60;
      const baseXp = minutes * 10;
      const xpEarned = durationSecs >= 1500 ? Math.round(baseXp * 1.1) : Math.round(baseXp);

      const finishedSession = {
        id: 'guest-session-' + Date.now(),
        subject: subject || '',
        startedAt: startedAt || new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: durationSecs,
        xpEarned,
        source: 'MANUAL'
      };

      const historyStr = localStorage.getItem('guest_sessions');
      const history = historyStr ? JSON.parse(historyStr) : [];
      history.unshift(finishedSession);
      localStorage.setItem('guest_sessions', JSON.stringify(history));

      updateGuestProgressWithXp(xpEarned);

      return Promise.resolve(finishedSession);
    }
    return apiCall('/study-sessions/manual', {
      method: 'POST',
      body: JSON.stringify({ subject, durationSeconds, startedAt }),
    });
  },
  getActive: () => {
    if (isGuestMode()) {
      const activeStr = localStorage.getItem('guest_active_session');
      return Promise.resolve(activeStr ? JSON.parse(activeStr) : null);
    }
    return apiCall('/study-sessions/active');
  },
  getHistory: () => {
    if (isGuestMode()) {
      const historyStr = localStorage.getItem('guest_sessions');
      return Promise.resolve(historyStr ? JSON.parse(historyStr) : []);
    }
    return apiCall('/study-sessions');
  },
  sendHeartbeat: (id) => {
    if (isGuestMode()) {
      return Promise.resolve();
    }
    return apiCall(`/study-sessions/${id}/heartbeat`, {
      method: 'POST',
    });
  },
};

export const adminApi = {
  getOverviewStats: () => apiCall('/admin/stats/overview'),
  getOnlineUsersDetailed: () => apiCall('/admin/users/online'),
  getUserStatsList: (range = 'all') => apiCall(`/admin/users/stats?range=${range}`),
  getSuspiciousUsers: () => apiCall('/admin/users/suspicious'),
  getUserSessions: (userId) => apiCall(`/admin/users/${userId}/sessions`),
  banUser: (userId, reason) => apiCall(`/admin/users/${userId}/ban`, { method: 'PUT', body: JSON.stringify({ reason }) }),
  unbanUser: (userId) => apiCall(`/admin/users/${userId}/unban`, { method: 'PUT' }),
  resetUserProgress: (userId) => apiCall(`/admin/users/${userId}/reset-progress`, { method: 'PUT' }),
};

export const friendsApi = {
  getFriends: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/friends');
  },
  getPendingRequestsReceived: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/friends/requests/received');
  },
  getPendingRequestsSent: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/friends/requests/sent');
  },
  sendRequest: (userId) => {
    if (isGuestMode()) return Promise.reject(new Error('Chức năng yêu cầu đăng nhập'));
    return apiCall(`/friends/request/${userId}`, { method: 'POST' });
  },
  acceptRequest: (friendshipId) => {
    if (isGuestMode()) return Promise.reject(new Error('Chức năng yêu cầu đăng nhập'));
    return apiCall(`/friends/accept/${friendshipId}`, { method: 'PUT' });
  },
  declineRequest: (friendshipId) => {
    if (isGuestMode()) return Promise.reject(new Error('Chức năng yêu cầu đăng nhập'));
    return apiCall(`/friends/decline/${friendshipId}`, { method: 'PUT' });
  },
  unfriend: (friendId) => {
    if (isGuestMode()) return Promise.reject(new Error('Chức năng yêu cầu đăng nhập'));
    return apiCall(`/friends/${friendId}`, { method: 'DELETE' });
  },
  getStatus: (userId) => {
    if (isGuestMode()) return Promise.resolve({ status: 'NONE' });
    return apiCall(`/friends/status/${userId}`);
  },
};

export const messageApi = {
  sendMessage: (recipientId, content) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để gửi tin nhắn.'));
    return apiCall('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content }),
    });
  },
  getConversations: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/messages/conversations');
  },
  getConversationMessages: (partnerId, page = 0, size = 30) => {
    if (isGuestMode()) return Promise.resolve({ content: [], totalPages: 0 });
    return apiCall(`/messages/conversations/${partnerId}?page=${page}&size=${size}`);
  },
  markAsRead: (partnerId) => {
    if (isGuestMode()) return Promise.resolve();
    return apiCall(`/messages/conversations/${partnerId}/read`, { method: 'PUT' });
  },
  getUnreadCount: () => {
    if (isGuestMode()) return Promise.resolve({ unreadCount: 0 });
    return apiCall('/messages/unread-count');
  },
  checkCanSend: (partnerId) => {
    if (isGuestMode()) return Promise.resolve({ canSend: false, reason: 'Chức năng yêu cầu đăng nhập.' });
    return apiCall(`/messages/check-permission/${partnerId}`);
  },
};

/**
 * Music API Endpoints (YouTube Ad-Free Player)
 */
export const getSuggestedPlaylists = async () => {
  try {
    return await apiCall('/music/playlists');
  } catch (err) {
    console.warn('Backend music playlists API unavailable, using fallback:', err);
    return [];
  }
};

export const searchMusicTracks = async (query, options = {}) => {
  if (!query || !query.trim()) return [];
  try {
    return await apiCall(`/music/search?query=${encodeURIComponent(query)}`, options);
  } catch (err) {
    console.warn('Backend music search API failed:', err);
    return [];
  }
};

export const getMusicStreamUrl = async (youtubeId, options = {}) => {
  if (!youtubeId) return null;
  try {
    return await apiCall(`/music/stream/${youtubeId}`, options);
  } catch (err) {
    console.warn('Backend music stream URL API failed:', err);
    return { streamUrl: null };
  }
};

/**
 * Leaderboard API Endpoints (Redis ZSET)
 */
export const leaderboardApi = {
  getTop: (limit = 10) => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall(`/leaderboard/top?limit=${limit}`);
  },
  getMyRank: () => {
    if (isGuestMode()) {
      return Promise.resolve({ rank: 1, totalUsers: 1, totalXp: 0 });
    }
    return apiCall('/leaderboard/me');
  },
};

/**
 * Payment API Endpoints (VNPay Gateway)
 */
export const paymentApi = {
  createVnPayUrl: (packageId = '1_MONTH') => {
    return apiCall('/payment/vnpay/create', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  },
  getHistory: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/payment/history');
  },
};
