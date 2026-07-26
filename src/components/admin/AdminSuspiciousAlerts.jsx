import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { AlertTriangle, ShieldAlert, Eye, RefreshCw, CheckCircle2, Flame, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminSuspiciousAlerts({ onSelectUser }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getSuspiciousUsers();
      setAlerts(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách cảnh báo bất thường:', err);
      setError('Không thể tải danh sách cảnh báo bất thường');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-950">
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
            HIGH ALERT
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
            WARNING
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-center gap-3 text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
        Đang quét và kiểm tra các hoạt động bất thường...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-4 rounded-3xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={fetchAlerts}
          className="px-3 py-1.5 rounded-xl bg-rose-900/50 hover:bg-rose-900 border border-rose-500/40 transition-all font-semibold"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Hệ thống an toàn (No Suspicious Activities)</h4>
            <p className="text-xs text-slate-400 mt-0.5">Không phát hiện tài khoản nào có dấu hiệu cày XP hoặc gian lận trong 24h qua.</p>
          </div>
        </div>
        <button
          onClick={fetchAlerts}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
          title="Quét lại"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-slate-950/60 to-slate-950/80 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              🚨 Cảnh Báo Hoạt Động Bất Thường (Suspicious Activity Alerts)
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                {alerts.length} tài khoản
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Phát hiện tự động dựa trên thời gian học 24h qua, tần suất manual session và đột biến XP.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Quét lại
        </button>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.userId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                      Lv.{alert.currentLevel}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 leading-tight">{alert.displayName}</h4>
                      <p className="text-xs text-slate-400">{alert.email}</p>
                    </div>
                  </div>
                  {getSeverityBadge(alert.severity)}
                </div>

                {/* Reasons List */}
                <div className="space-y-1 pt-1">
                  {alert.reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>XP 24h qua: <strong className="text-amber-400">+{alert.xpEarned24h} XP</strong></span>
                <button
                  onClick={() => onSelectUser({ userId: alert.userId, displayName: alert.displayName, email: alert.email })}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-semibold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Xem chi tiết session
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
