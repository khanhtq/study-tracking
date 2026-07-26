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

import { MusicProvider } from './context/MusicContext';
import MusicWidget from './components/music/MusicWidget';
import MusicModal from './components/music/MusicModal';

function MainApp() {
  const { user, token, loading } = useAuth();
  const [view, setView] = useState('landing');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const { t } = useLanguage();
  const canShowMusic = Boolean(token) && !user?.isGuest;

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
        view === 'admin' && user?.role === 'ROLE_ADMIN' ? (
          <AdminDashboard onBackToDashboard={() => setView('dashboard')} />
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
      {canShowMusic && <MusicWidget />}
      {canShowMusic && <MusicModal />}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MusicProvider>
            <MainApp />
          </MusicProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
