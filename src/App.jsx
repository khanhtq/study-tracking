import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import SEO from './components/SEO';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';

import BannedUserNoticeModal from './components/BannedUserNoticeModal';
import PaymentResultModal from './components/PaymentResultModal';

function MainApp() {
  const { user, token, loading, logout, refreshProgress } = useAuth();
  const [view, setView] = useState(() => {
    if (localStorage.getItem('ban_notice')) return 'login';
    return 'landing';
  });
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const { t } = useLanguage();

  const [paymentResult, setPaymentResult] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('paymentStatus');
    const orderId = params.get('orderId');
    if (status) {
      return { isOpen: true, status, orderId };
    }
    return { isOpen: false, status: null, orderId: null };
  });

  const [banNotice, setBanNotice] = useState(() => {
    const saved = localStorage.getItem('ban_notice');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return { reason: saved }; }
    }
    return null;
  });

  React.useEffect(() => {
    const handleAuthExpired = (e) => {
      setView('login');
      let notice = e.detail;
      const saved = localStorage.getItem('ban_notice');
      if (saved) {
        try { notice = JSON.parse(saved); } catch (err) { notice = { reason: saved }; }
      }
      if (notice) {
        setBanNotice(notice);
      }
    };

    const handleBanTrigger = (e) => {
      setView('login');
      if (e.detail) {
        setBanNotice(e.detail);
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    window.addEventListener('ban-notice-trigger', handleBanTrigger);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('ban-notice-trigger', handleBanTrigger);
    };
  }, []);

  const handleLogoutFromBanScreen = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ban_notice');
    setBanNotice(null);
    if (logout) logout();
    setView('login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <SEO view="landing" />
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{t('loading_account')}</span>
        </div>
      </div>
    );
  }

  const handleNavigateVerifyOtp = (email) => {
    setPendingVerifyEmail(email);
    setView('verify-otp');
  };

  const handleVerifySuccess = () => {
    setView('dashboard');
    setPendingVerifyEmail('');
  };

  const activeView = token
    ? (view === 'admin' ? 'admin' : 'dashboard')
    : (user?.isGuest
        ? (view === 'register' ? 'register' : 'dashboard')
        : view);

  return (
    <>
      <SEO view={activeView} />
      {token ? (
        user?.role === 'ROLE_ADMIN' ? (
          <AdminDashboard />
        ) : view === 'profile' ? (
          <Profile onBackToDashboard={() => setView('dashboard')} />
        ) : (
          <Dashboard 
            onNavigateAdmin={() => setView('admin')} 
            onNavigateRegister={() => setView('register')}
            onNavigateProfile={() => setView('profile')}
          />
        )
      ) : user?.isGuest ? (
        view === 'register' ? (
          <Register 
            onToggleView={() => setView('login')} 
            onBackToLanding={() => setView('dashboard')} 
            onNavigateVerifyOtp={handleNavigateVerifyOtp}
          />
        ) : view === 'profile' ? (
          <Profile onBackToDashboard={() => setView('dashboard')} />
        ) : (
          <Dashboard 
            onNavigateAdmin={() => setView('admin')} 
            onNavigateRegister={() => setView('register')}
            onNavigateProfile={() => setView('profile')}
          />
        )
      ) : (
        view === 'verify-otp' ? (
          <VerifyOtp 
            email={pendingVerifyEmail} 
            onBackToLogin={() => { setPendingVerifyEmail(''); setView('login'); }} 
            onBackToRegister={() => { setPendingVerifyEmail(''); setView('register'); }} 
            onSuccess={handleVerifySuccess}
          />
        ) : view === 'forgot-password' ? (
          <ForgotPassword 
            onBackToLogin={() => setView('login')} 
          />
        ) : view === 'login' ? (
          <Login 
            onToggleView={() => setView('register')} 
            onBackToLanding={() => setView('landing')} 
            onNavigateVerifyOtp={handleNavigateVerifyOtp}
            onNavigateForgotPassword={() => setView('forgot-password')}
          />
        ) : view === 'register' ? (
          <Register 
            onToggleView={() => setView('login')} 
            onBackToLanding={() => setView('landing')} 
            onNavigateVerifyOtp={handleNavigateVerifyOtp}
          />
        ) : (
          <Landing onNavigate={setView} />
        )
      )}
      <BannedUserNoticeModal banNotice={banNotice} onLogout={handleLogoutFromBanScreen} />

      <PaymentResultModal
        isOpen={paymentResult.isOpen}
        status={paymentResult.status}
        orderId={paymentResult.orderId}
        onClose={() => {
          setPaymentResult({ isOpen: false, status: null, orderId: null });
          window.history.replaceState({}, document.title, window.location.pathname);
          if (refreshProgress) refreshProgress();
        }}
        onGoHome={() => {
          setView('dashboard');
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
