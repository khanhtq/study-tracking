import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi, sessionApi, messageApi, apiCall } from '../api';
import { initWebSocket, subscribeToMessages, disconnectWebSocket } from '../websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [progress, setProgress] = useState(null);
  const [activeSession, setActiveSessionState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (isGuest) return;
      setUser(null);
      setToken(null);
      setProgress(null);
      setActiveSessionState(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const refreshProgress = async () => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (!token && !isGuest) return;
    try {
      const data = await userApi.getMe();
      setProgress(data);
      if (data.preferredLanguage && (data.preferredLanguage === 'vi' || data.preferredLanguage === 'en' || data.preferredLanguage === 'zh')) {
        const savedLang = localStorage.getItem('language');
        if (savedLang !== data.preferredLanguage) {
          localStorage.setItem('language', data.preferredLanguage);
          window.dispatchEvent(new CustomEvent('language-change', { detail: data.preferredLanguage }));
        }
      }
      if (!isGuest) {
        setUser({
          id: data.userId,
          email: data.email,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          dailyGoalMinutes: data.dailyGoalMinutes,
          favoriteSubjects: data.favoriteSubjects,
          selectedTitle: data.selectedTitle,
          themeAccent: data.themeAccent,
          soundEnabled: data.soundEnabled,
          preferredLanguage: data.preferredLanguage || 'en',
          activityStatusVisibility: data.activityStatusVisibility || 'EVERYONE',
          authProvider: data.authProvider,
          role: data.role || 'ROLE_USER',
          currentLevel: data.currentLevel,
          currentXp: data.currentXp,
          totalXp: data.totalXp,
        });
      } else {
        const guestUserStr = localStorage.getItem('guest_user');
        const guestUser = guestUserStr ? JSON.parse(guestUserStr) : { id: 'guest', displayName: 'Khách', role: 'ROLE_GUEST', isGuest: true };
        setUser({
          ...guestUser,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          dailyGoalMinutes: data.dailyGoalMinutes,
          favoriteSubjects: data.favoriteSubjects,
          selectedTitle: data.selectedTitle,
          themeAccent: data.themeAccent,
          soundEnabled: data.soundEnabled,
          preferredLanguage: data.preferredLanguage || 'en',
          activityStatusVisibility: data.activityStatusVisibility || 'EVERYONE',
          currentLevel: data.currentLevel,
          currentXp: data.currentXp,
          totalXp: data.totalXp,
        });
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const fetchActiveSession = async () => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (!token && !isGuest) return;
    try {
      const session = await sessionApi.getActive();
      if (session) {
        setActiveSessionState(session);
      } else {
        setActiveSessionState(null);
      }
    } catch (err) {
      console.error('Error fetching active session:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (token || isGuest) {
        await refreshProgress();
        await fetchActiveSession();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  // Real-time WebSocket + Background Polling + Focus event for 100% reliable message notifications
  useEffect(() => {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (!token || isGuest || !user?.id) return;

    // 1. Initialize WebSocket
    initWebSocket(user.id);

    const fetchUnreadCount = async () => {
      try {
        const res = await messageApi.getUnreadCount();
        if (res && res.unreadCount !== undefined) {
          setProgress(prev => prev ? { ...prev, unreadMessagesCount: res.unreadCount } : prev);
        }
      } catch (ignored) {}
    };

    fetchUnreadCount();

    // 2. Real-time message listener via WebSocket
    const unsubscribeWs = subscribeToMessages(() => {
      fetchUnreadCount();
    });

    // 3. Window focus event listener (instant sync when user switches back to tab)
    const handleFocus = () => {
      fetchUnreadCount();
    };
    window.addEventListener('focus', handleFocus);

    // 4. Fallback interval polling every 5 seconds
    const interval = setInterval(fetchUnreadCount, 5000);

    return () => {
      unsubscribeWs();
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [token, user?.id]);

  const login = async (email, password) => {
    // Clear any guest flags
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guest_user');
    
    const res = await authApi.login(email, password);

    if (res.requiresVerification) {
      return res;
    }

    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify({
      id: res.userId,
      email: res.email,
      displayName: res.displayName,
      role: res.role || 'ROLE_USER',
    }));
    setToken(res.token);
    setUser({
      id: res.userId,
      email: res.email,
      displayName: res.displayName,
      role: res.role || 'ROLE_USER',
    });
    return res;
  };

  const loginWithGoogle = async (idToken) => {
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guest_user');
    
    const res = await authApi.loginWithGoogle(idToken);

    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify({
      id: res.userId,
      email: res.email,
      displayName: res.displayName,
      role: res.role || 'ROLE_USER',
    }));
    setToken(res.token);
    setUser({
      id: res.userId,
      email: res.email,
      displayName: res.displayName,
      role: res.role || 'ROLE_USER',
    });
    return res;
  };

  const loginAsGuest = async (displayName) => {
    const nameToUse = (displayName && displayName.trim()) ? displayName.trim() : 'Khách';
    const guestUser = {
      id: 'guest',
      displayName: nameToUse,
      role: 'ROLE_GUEST',
      isGuest: true,
    };
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('guest_user', JSON.stringify(guestUser));
    
    setUser(guestUser);
    await refreshProgress();
    await fetchActiveSession();
  };

  const register = async (email, password, displayName) => {
    const wasGuest = localStorage.getItem('isGuest') === 'true';
    const guestSessionsStr = localStorage.getItem('guest_sessions');
    const guestActiveStr = localStorage.getItem('guest_active_session');

    let guestSessions = [];
    if (wasGuest && guestSessionsStr) {
      try { guestSessions = JSON.parse(guestSessionsStr); } catch (e) {}
    }

    // Auto-stop active guest session if running and include it in guestSessions migration
    if (wasGuest && (guestActiveStr || activeSession)) {
      try {
        const activeObj = guestActiveStr ? JSON.parse(guestActiveStr) : activeSession;
        if (activeObj && activeObj.startedAt) {
          const start = new Date(activeObj.startedAt).getTime();
          const now = Date.now();
          const durationSeconds = Math.max(0, Math.floor((now - start) / 1000));
          if (durationSeconds > 0) {
            guestSessions.push({
              id: activeObj.id || ('guest-session-' + Date.now()),
              subject: activeObj.subject || '',
              startedAt: activeObj.startedAt,
              endedAt: new Date().toISOString(),
              durationSeconds,
              source: 'TIMER'
            });
          }
        }
      } catch (e) {
        console.warn('Error auto-stopping active guest session during registration:', e);
      }
    }

    const res = await authApi.register(email, password, displayName);

    if (res.requiresVerification) {
      // Store pending guest sessions if any for migration post-OTP verification
      if (guestSessions.length > 0) {
        localStorage.setItem('pending_guest_sessions', JSON.stringify(guestSessions));
      }
      return res;
    }

    // Save token if verified immediately
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        id: res.userId,
        email: res.email,
        displayName: res.displayName,
        role: res.role || 'ROLE_USER',
      }));

      // Clear guest state
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guest_user');
      localStorage.removeItem('guest_progress');
      localStorage.removeItem('guest_active_session');
      localStorage.removeItem('guest_sessions');

      setActiveSessionState(null);

      setToken(res.token);
      setUser({
        id: res.userId,
        email: res.email,
        displayName: res.displayName,
        role: res.role || 'ROLE_USER',
      });
    }

    return res;
  };

  const verifyOtp = async (email, otp) => {
    const res = await authApi.verifyOtp(email, otp);
    
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify({
        id: res.userId,
        email: res.email,
        displayName: res.displayName,
        role: res.role || 'ROLE_USER',
      }));

      // Sync guest sessions if pending
      const pendingGuestStr = localStorage.getItem('pending_guest_sessions');
      if (pendingGuestStr) {
        try {
          const guestSessions = JSON.parse(pendingGuestStr);
          if (guestSessions.length > 0) {
            const sorted = [...guestSessions].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
            for (const s of sorted) {
              try {
                await apiCall('/study-sessions/manual', {
                  method: 'POST',
                  body: JSON.stringify({
                    subject: s.subject || '',
                    durationSeconds: s.durationSeconds,
                    startedAt: s.startedAt,
                  }),
                });
              } catch (err) {
                console.warn('Failed to migrate guest session:', err);
              }
            }
          }
        } catch (e) {}
        localStorage.removeItem('pending_guest_sessions');
      }

      // Clear guest state
      localStorage.removeItem('isGuest');
      localStorage.removeItem('guest_user');
      localStorage.removeItem('guest_progress');
      localStorage.removeItem('guest_active_session');
      localStorage.removeItem('guest_sessions');

      setActiveSessionState(null);
      setToken(res.token);
      setUser({
        id: res.userId,
        email: res.email,
        displayName: res.displayName,
        role: res.role || 'ROLE_USER',
      });
    }

    return res;
  };

  const resendOtp = async (email) => {
    return await authApi.resendOtp(email);
  };

  const forgotPassword = async (email) => {
    return await authApi.forgotPassword(email);
  };

  const verifyResetOtp = async (email, otp) => {
    return await authApi.verifyResetOtp(email, otp);
  };

  const resetPassword = async (email, otp, newPassword) => {
    return await authApi.resetPassword(email, otp, newPassword);
  };

  const logout = async () => {
    if (activeSession) {
      try {
        await sessionApi.stop(activeSession.id);
      } catch (err) {
        console.warn('Failed to stop active session during logout:', err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('guest_user');
    localStorage.removeItem('guest_sessions');
    localStorage.removeItem('guest_active_session');
    localStorage.removeItem('guest_progress');
    localStorage.removeItem('pending_guest_sessions');
    setToken(null);
    setUser(null);
    setProgress(null);
    setActiveSessionState(null);
  };

  useEffect(() => {
    const handleAuthExpired = (e) => {
      setToken(null);
      setUser(null);
      setProgress(null);
      setActiveSessionState(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const updateActiveSession = (session) => {
    setActiveSessionState(session);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      progress,
      activeSession,
      loading,
      login,
      loginWithGoogle,
      loginAsGuest,
      register,
      verifyOtp,
      resendOtp,
      forgotPassword,
      verifyResetOtp,
      resetPassword,
      logout,
      refreshProgress,
      refreshUserProgress: refreshProgress,
      setActiveSession: updateActiveSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

