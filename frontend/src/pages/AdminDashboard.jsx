import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminApi } from '../api';
import AdminOverviewCards from '../components/admin/AdminOverviewCards';
import AdminOnlineTable from '../components/admin/AdminOnlineTable';
import AdminUserStatsTable from '../components/admin/AdminUserStatsTable';
import AdminSuspiciousAlerts from '../components/admin/AdminSuspiciousAlerts';
import AdminPaymentPackages from '../components/admin/AdminPaymentPackages';
import AdminGroupsManager from '../components/admin/AdminGroupsManager';
import AdminCountdownsManager from '../components/admin/AdminCountdownsManager';
import UserSessionDetailModal from '../components/admin/UserSessionDetailModal';
import UserSearchModal from '../components/UserSearchModal';
import PublicProfileModal from '../components/PublicProfileModal';
import ChatModal from '../components/ChatModal';
import Footer from '../components/Footer';
import { ShieldCheck, Radio, BarChart3, RefreshCw, MessageSquare, Search, LogOut, ChevronDown, CreditCard, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'stats'
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  // Admin Account Menu Dropdown state
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Modals for Direct Messaging, User Search, Public Profile
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoadingOverview(true);
      const data = await adminApi.getOverviewStats();
      setOverviewStats(data);
    } catch (err) {
      console.error('Lỗi tải overview stats admin:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Lighting Gradients */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-6">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 border border-indigo-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300">
                {t('admin_dashboard')}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('admin_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Action Tools for Admin: Direct Messaging & Search Users */}
            <button
              onClick={() => { setActiveChatUser(null); setIsChatOpen(true); }}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-200 text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              title={t('admin_btn_chat')}
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>{t('admin_btn_chat')}</span>
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              title={t('admin_btn_search_user')}
            >
              <Search className="w-4 h-4 text-indigo-400" />
              <span>{t('admin_btn_search_user')}</span>
            </button>

            <button
              onClick={fetchOverview}
              className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
              title="Làm mới dữ liệu Admin"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
            </button>

            {/* Interactive Admin Account Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="px-3.5 py-2 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                title={t('admin_account_menu_title')}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{user?.displayName || 'Admin'} ({user?.email})</span>
                <ChevronDown className={`w-3.5 h-3.5 text-indigo-400 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isAccountMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 space-y-1"
                  >
                    <button
                      onClick={() => { setIsAccountMenuOpen(false); logout(); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>{t('admin_account_menu_logout')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <AdminOverviewCards stats={overviewStats} loading={loadingOverview} />

        {/* Suspicious Activity Alerts Widget */}
        <AdminSuspiciousAlerts onSelectUser={(u) => setSelectedUserForModal(u)} />

        {/* Main Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 w-fit">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'online'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Radio className={`w-4 h-4 ${activeTab === 'online' ? 'animate-pulse text-emerald-300' : ''}`} />
            {t('admin_tab_online')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t('admin_tab_users_stats')}
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            {t('admin_tab_groups') || 'Quản Lý Nhóm Học'}
          </button>
          <button
            onClick={() => setActiveTab('countdowns')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'countdowns'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            {t('admin_tab_countdowns') || 'Quản Lý Sự Kiện & Lịch Thi'}
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            {t('admin_tab_packages') || 'Quản Lý Gói VIP'}
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'online' ? (
            <AdminOnlineTable
              onSelectUser={(u) => setSelectedUserForModal(u)}
              onOpenChat={(targetUser) => {
                setActiveChatUser(targetUser);
                setIsChatOpen(true);
              }}
            />
          ) : activeTab === 'stats' ? (
            <AdminUserStatsTable
              onSelectUser={(u) => setSelectedUserForModal(u)}
              onOpenChat={(targetUser) => {
                setActiveChatUser(targetUser);
                setIsChatOpen(true);
              }}
            />
          ) : activeTab === 'groups' ? (
            <AdminGroupsManager />
          ) : activeTab === 'countdowns' ? (
            <AdminCountdownsManager />
          ) : (
            <AdminPaymentPackages />
          )}
        </motion.div>
      </div>

      {/* Modal for User Session / Task History */}
      {selectedUserForModal && (
        <UserSessionDetailModal
          user={selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
        />
      )}

      {/* User Search Modal */}
      <UserSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectUser={(userId) => setSelectedProfileUserId(userId)}
      />

      {/* Public Profile Modal */}
      <PublicProfileModal
        userId={selectedProfileUserId}
        onClose={() => setSelectedProfileUserId(null)}
        onOpenChat={(targetUser) => {
          setActiveChatUser(targetUser);
          setIsChatOpen(true);
        }}
      />

      {/* Direct Messaging Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        activeTargetUser={activeChatUser}
        onSelectProfile={(userId) => setSelectedProfileUserId(userId)}
      />

      <Footer />
    </div>
  );
}
