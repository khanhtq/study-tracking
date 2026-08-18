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
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (success) => {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
};

export const getServerClientOffset = () => serverClientOffset;

export const apiCall = async (endpoint, options = {}, isRetry = false) => {
  const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;
  const headers = { ...getHeaders(), ...options.headers };
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
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

  const errorData = !response.ok ? await response.json().catch(() => ({})) : {};
  const shouldTryRefresh = !isRetry && isAuthExpiryResponse(response.status, cleanEndpoint, errorData);

  // Handle auth-expiry responses with silent refresh
  if (shouldTryRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${cleanBaseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json().catch(() => ({}));
          if (refreshData?.token) {
            localStorage.setItem('token', refreshData.token);
            // Keep React auth state in sync with the token used by future API calls.
            window.dispatchEvent(new CustomEvent('auth-token-refreshed', {
              detail: { token: refreshData.token }
            }));
          }
          isRefreshing = false;
          onRefreshed(true);
          return apiCall(endpoint, options, true);
        } else {
          localStorage.removeItem('token');
          isRefreshing = false;
          onRefreshed(false);
        }
      } catch (err) {
        localStorage.removeItem('token');
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      const refreshSuccess = await new Promise((resolve) => {
        subscribeTokenRefresh((success) => resolve(success));
      });
      if (refreshSuccess) {
        return apiCall(endpoint, options, true);
      }
    }
  }

  if (!response.ok) {
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

    // Notify listeners only when the response looks like an auth-expiry, not a real permission denial.
    if (shouldTryRefresh && !isGuestMode()) {
      // If a refresh is currently running and this request is not already a retry,
      // wait for the refresh result so route guards / middleware don't redirect prematurely.
      if (isRefreshing && !isRetry) {
        const refreshSuccess = await new Promise((resolve) => {
          subscribeTokenRefresh((s) => resolve(s));
        });
        if (refreshSuccess) {
          // Retry original request once after a successful refresh
          return apiCall(endpoint, options, true);
        }
        // fallthrough to trigger auth-expired if refresh failed
      }

      // No refresh in progress or refresh failed — notify listeners and clear user state
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


const isGuestMode = () => localStorage.getItem('isGuest') === 'true' || !localStorage.getItem('token');


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

const isAuthExpiryResponse = (status, endpoint, errorData) => {
  if (endpoint.startsWith('/auth/')) return false;
  if (errorData && errorData.banned) return false;
  if (status === 401) return true;
  if (status === 403 && endpoint.includes('/study-sessions')) return true;

  const message = (errorData && errorData.message ? String(errorData.message) : '').toLowerCase();
  return message.includes('access token has expired') || message.includes('authentication is required') || message.includes('unauthorized');
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
  logout: () =>
    apiCall('/auth/logout', {
      method: 'POST',
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
  uploadAvatar: (file, onProgress = null) => {
    if (isGuestMode()) {
      return new Promise((resolve) => {
        if (onProgress) onProgress(50, file.size / 2, file.size);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onProgress) onProgress(100, file.size, file.size);
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
    const token = localStorage.getItem('token');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/users/avatar`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || 'Lỗi khi tải ảnh đại diện'));
          } catch (e) {
            reject(new Error('Lỗi khi tải ảnh đại diện'));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải ảnh đại diện'));
      xhr.send(formData);
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
  getPackages: () => apiCall('/admin/packages'),
  createPackage: (data) => apiCall('/admin/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id, data) => apiCall(`/admin/packages/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePackage: (id) => apiCall(`/admin/packages/${id}`, { method: 'DELETE' }),

  // Group Management APIs
  getAllGroups: (search = '', isArchived = null) => {
    let url = '/admin/groups?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (isArchived !== null) url += `isArchived=${isArchived}&`;
    return apiCall(url.replace(/&$/, ''));
  },
  updateGroup: (groupId, data) => apiCall(`/admin/groups/${groupId}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveGroup: (groupId, isArchived) => apiCall(`/admin/groups/${groupId}/archive?isArchived=${isArchived}`, { method: 'PUT' }),
  deleteGroup: (groupId) => apiCall(`/admin/groups/${groupId}`, { method: 'DELETE' }),

  // Countdown & Preset Management APIs
  getAllPresetCountdowns: () => apiCall('/admin/countdowns/presets'),
  createPresetCountdown: (data) => apiCall('/admin/countdowns/presets', { method: 'POST', body: JSON.stringify(data) }),
  updatePresetCountdown: (examCode, data) => apiCall(`/admin/countdowns/presets/${examCode}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePresetCountdown: (examCode) => apiCall(`/admin/countdowns/presets/${examCode}`, { method: 'DELETE' }),
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
  getActivePackages: () => apiCall('/payment/packages'),
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

/**
 * Document Drive API Endpoints (Azure Blob / Multi-Provider Storage)
 */
export const documentApi = {
  getDocuments: (parentId = null) => {
    if (isGuestMode()) return Promise.resolve([]);
    const query = parentId ? `?parentId=${parentId}` : '';
    return apiCall(`/documents${query}`);
  },
  uploadFile: (file, parentId = null, onProgress = null) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để sử dụng bộ nhớ tài liệu.'));
    const formData = new FormData();
    formData.append('file', file);
    if (parentId) formData.append('parentId', parentId);

    const token = localStorage.getItem('token');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/documents/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent, e.loaded, e.total);
          }
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || 'Lỗi khi tải file lên'));
          } catch (e) {
            reject(new Error('Lỗi khi tải file lên'));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải file lên'));
      xhr.send(formData);
    });
  },
  createFolder: (name, parentId = null) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để sử dụng bộ nhớ tài liệu.'));
    return apiCall('/documents/folder', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  },
  getDownloadUrl: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}/download-url`);
  },
  getStreamUrl: (id) => {
    return `${BASE_URL}/documents/${id}/stream`;
  },
  downloadDocumentBlob: async (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${cleanBaseUrl}/documents/${id}/stream`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    return await response.blob();
  },
  renameDocument: (id, name) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}/rename`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },
  toggleFavorite: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}/favorite`, { method: 'POST' });
  },
  softDelete: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}`, { method: 'DELETE' });
  },
  restoreDocument: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}/restore`, { method: 'POST' });
  },
  permanentDelete: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/documents/${id}/permanent`, { method: 'DELETE' });
  },
  getTrash: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/documents/trash');
  },
  getFavorites: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/documents/favorites');
  },
  searchDocuments: (query) => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall(`/documents/search?q=${encodeURIComponent(query)}`);
  },
  getStorageQuota: () => {
    if (isGuestMode()) return Promise.resolve({ usedBytes: 0, maxBytes: 1048576000, usagePercentage: 0, formattedUsed: '0 MB', formattedMax: '1 GB' });
    return apiCall('/documents/storage');
  },
};

export const presenceApi = {
  sendBatch: (batchData) => {
    if (isGuestMode()) return Promise.resolve({ success: true, savedCount: 0 });
    return apiCall('/presence/batch', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  },
};

/**
 * Countdown API Endpoints
 */
export const countdownApi = {
  getPresets: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiCall(`/countdowns/presets${query}`);
  },

  getEvents: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/countdowns');
  },
  createEvent: (data) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để lưu đếm ngược.'));
    return apiCall('/countdowns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateEvent: (id, data) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/countdowns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  pinEvent: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/countdowns/${id}/pin`, {
      method: 'PATCH',
    });
  },
  deleteEvent: (id) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/countdowns/${id}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Community Group Chat API Endpoints
 */
export const communityChatApi = {
  // Groups Management
  getMyGroups: () => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall('/v1/chat/groups/my');
  },
  getPopularGroups: (page = 0, size = 20) => {
    return apiCall(`/v1/chat/groups/popular?page=${page}&size=${size}`);
  },
  searchGroups: (query = '', page = 0, size = 20) => {
    return apiCall(`/v1/chat/groups/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`);
  },
  createGroup: (data) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để tạo nhóm.'));
    return apiCall('/v1/chat/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateGroup: (groupId, data) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  deleteGroup: (groupId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}`, {
      method: 'DELETE',
    });
  },
  getGroupDetail: (groupId) => {
    return apiCall(`/v1/chat/groups/${groupId}`);
  },
  joinGroup: (groupId, data = {}) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để tham gia nhóm.'));
    return apiCall(`/v1/chat/groups/${groupId}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  leaveGroup: (groupId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/leave`, {
      method: 'POST',
    });
  },
  getPendingJoinRequests: (groupId) => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall(`/v1/chat/groups/${groupId}/join-requests`);
  },
  reviewJoinRequest: (groupId, requestId, approved) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/join-requests/${requestId}?approved=${approved}`, {
      method: 'PUT',
    });
  },
  inviteFriends: (groupId, friendIds) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/invite-friends`, {
      method: 'POST',
      body: JSON.stringify({ friendIds }),
    });
  },
  getMembers: (groupId, page = 0, size = 50) => {
    return apiCall(`/v1/chat/groups/${groupId}/members?page=${page}&size=${size}`);
  },
  kickMember: (groupId, userId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  },
  muteMember: (groupId, userId, durationMinutes = 60) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/members/${userId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ durationMinutes }),
    });
  },
  unmuteMember: (groupId, userId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/members/${userId}/unmute`, {
      method: 'POST',
    });
  },
  updateMemberRole: (groupId, userId, role) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
  createInviteLink: (groupId, data = {}) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getInviteLinks: (groupId) => {
    if (isGuestMode()) return Promise.resolve([]);
    return apiCall(`/v1/chat/groups/${groupId}/invites`);
  },
  revokeInviteLink: (groupId, inviteId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/invites/${inviteId}`, {
      method: 'DELETE',
    });
  },
  previewInvite: (code) => {
    return apiCall(`/v1/chat/invites/${code}`);
  },
  joinViaInvite: (code) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/invites/${code}/join`, {
      method: 'POST',
    });
  },

  // Messages, Reactions, Pinned & Media
  getMessages: (groupId, before = null, limit = 30) => {
    const query = before ? `?before=${encodeURIComponent(before)}&limit=${limit}` : `?limit=${limit}`;
    return apiCall(`/v1/chat/groups/${groupId}/messages${query}`);
  },
  sendMessage: (groupId, data) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập để gửi tin nhắn.'));
    return apiCall(`/v1/chat/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  searchMessages: (groupId, query, limit = 20) => {
    return apiCall(`/v1/chat/groups/${groupId}/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },
  getPinnedMessages: (groupId) => {
    return apiCall(`/v1/chat/groups/${groupId}/messages/pinned`);
  },
  editMessage: (groupId, messageId, newContent) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ messageId, newContent }),
    });
  },
  deleteMessage: (groupId, messageId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
  toggleReaction: (groupId, messageId, emoji) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
      method: 'POST',
    });
  },
  togglePinMessage: (groupId, messageId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/messages/${messageId}/pin`, {
      method: 'POST',
    });
  },
  uploadChatFile: (groupId, file) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    const formData = new FormData();
    formData.append('file', file);
    return apiCall(`/v1/chat/groups/${groupId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  },
  shareStudyDocument: (groupId, documentId, caption) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/share-document`, {
      method: 'POST',
      body: JSON.stringify({ documentId, caption }),
    });
  },
  saveSharedDocumentToMyLibrary: (groupId, attachmentId) => {
    if (isGuestMode()) return Promise.reject(new Error('Vui lòng đăng nhập.'));
    return apiCall(`/v1/chat/groups/${groupId}/save-document/${attachmentId}`, {
      method: 'POST',
    });
  },
  getGroupAttachments: (groupId, type = null) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return apiCall(`/v1/chat/groups/${groupId}/attachments${query}`);
  },
};


