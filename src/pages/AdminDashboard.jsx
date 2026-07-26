import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { adminApi } from '../api';
import AdminOverviewCards from '../components/admin/AdminOverviewCards';
import AdminOnlineTable from '../components/admin/AdminOnlineTable';
import AdminUserStatsTable from '../components/admin/AdminUserStatsTable';
import AdminSuspiciousAlerts from '../components/admin/AdminSuspiciousAlerts';
import UserSessionDetailModal from '../components/admin/UserSessionDetailModal';
import Footer from '../components/Footer';
import { ShieldCheck, ArrowLeft, Radio, BarChart3, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard({ onBackToDashboard }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleBack = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    }
  };

  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'stats'
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

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
            <button
              onClick={handleBack}
              className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-400 transition-all shadow-sm group"
              title="Quay lại Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-emerald-300">
                  {t('admin_dashboard')}
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('admin_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOverview}
              className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
            </button>
            <div className="px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              {user?.displayName || 'Admin'} ({user?.email})
            </div>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <AdminOverviewCards stats={overviewStats} loading={loadingOverview} />

        {/* Suspicious Activity Alerts Widget */}
        <AdminSuspiciousAlerts onSelectUser={(u) => setSelectedUserForModal(u)} />

        {/* Main Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 w-fit">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
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
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            {t('admin_tab_users_stats')}
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
            <AdminOnlineTable onSelectUser={(u) => setSelectedUserForModal(u)} />
          ) : (
            <AdminUserStatsTable onSelectUser={(u) => setSelectedUserForModal(u)} />
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

      <Footer />
    </div>
  );
}
