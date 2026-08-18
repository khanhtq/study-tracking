import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { communityChatApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const GroupCountdownsModal = ({ isOpen, onClose, group, isOwnerOrMod }) => {
  const { t } = useLanguage();
  const { toast, confirm } = useToast();

  const [countdowns, setCountdowns] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [selectedEventKey, setSelectedEventKey] = useState('');

  useEffect(() => {
    if (isOpen && group?.id) {
      loadData();
    }
  }, [isOpen, group?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linkedData, availableData] = await Promise.all([
        communityChatApi.getGroupCountdowns(group.id),
        isOwnerOrMod
          ? communityChatApi.getAvailableCountdownsToLink(group.id).catch(() => [])
          : Promise.resolve([]),
      ]);
      setCountdowns(Array.isArray(linkedData) ? linkedData : []);
      setAvailableEvents(Array.isArray(availableData) ? availableData : []);
    } catch (err) {
      toast?.error(err.message || 'Lỗi tải danh sách đếm ngược');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCountdown = async () => {
    if (!selectedEventKey) {
      toast?.warning(t('select_event_to_link'));
      return;
    }

    try {
      setActionLoading(true);
      const [type, id] = selectedEventKey.split(':');
      const payload = {};
      if (type === 'PRESET' && id && id !== 'null') {
        payload.presetExamId = Number(id);
      } else if (type === 'CUSTOM' && id && id !== 'null' && id !== 'undefined') {
        payload.customCountdownId = id;
      }

      await communityChatApi.linkCountdownToGroup(group.id, payload);
      toast?.success(t('link_countdown_success'));
      setSelectedEventKey('');
      setShowAddSection(false);
      await loadData();
    } catch (err) {
      toast?.error(err.message || 'Không thể liên kết sự kiện');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkCountdown = async (linkId, title) => {
    const isConfirmed = confirm ? await confirm({
      title: t('unlink_countdown_btn'),
      message: `${t('unlink_countdown_confirm')} "${title}"?`,
      confirmText: t('delete'),
      type: 'danger',
    }) : window.confirm(`${t('unlink_countdown_confirm')} "${title}"?`);

    if (!isConfirmed) return;

    try {
      setActionLoading(true);
      await communityChatApi.unlinkCountdownFromGroup(group.id, linkId);
      toast?.success(t('unlink_countdown_success'));
      setCountdowns((prev) => prev.filter((c) => c.linkId !== linkId));
      await loadData();
    } catch (err) {
      toast?.error(err.message || 'Không thể hủy liên kết sự kiện');
    } finally {
      setActionLoading(false);
    }
  };

  const unlinkedAvailable = availableEvents.filter((ev) => !ev.isAlreadyLinked);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {t('group_countdowns')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('group_countdowns_desc')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Đang tải dữ liệu mục tiêu...</span>
                </div>
              ) : countdowns.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="text-sm font-medium text-slate-300">
                    {t('no_linked_countdowns')}
                  </div>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {isOwnerOrMod
                      ? t('group_countdowns_empty_owner_hint')
                      : t('group_countdowns_empty_member_hint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {countdowns.map((item, idx) => {
                    const isToday = item.daysRemaining === 0;
                    const isPast = item.daysRemaining < 0;

                    return (
                      <div
                        key={item.linkId || item.id || `countdown-${idx}`}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold text-slate-100 truncate">
                              {item.title}
                            </span>
                            {item.isOfficialDate && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {t('countdown_official_badge') || 'Chính thức'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>
                              {new Date(item.targetDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                isToday
                                  ? 'text-rose-400 font-bold'
                                  : isPast
                                  ? 'text-slate-500'
                                  : 'text-indigo-400'
                              }`}
                            >
                              {isToday
                                ? t('today_is_event')
                                : t('days_remaining_label').replace('{count}', item.daysRemaining)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        {isOwnerOrMod && (
                          <button
                            onClick={() => handleUnlinkCountdown(item.linkId, item.title)}
                            disabled={actionLoading}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                            title={t('unlink_countdown_btn')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Countdown Section (Owner/Mod Only) */}
              {isOwnerOrMod && (
                <div className="pt-2 border-t border-slate-800/80">
                  {!showAddSection ? (
                    <button
                      onClick={() => setShowAddSection(true)}
                      className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>{t('link_countdown_btn')}</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">
                          {t('select_event_to_link')}
                        </label>
                        <button
                          onClick={() => setShowAddSection(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-200"
                        >
                          {t('btn_cancel')}
                        </button>
                      </div>

                      {unlinkedAvailable.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2 text-center">
                          {t('no_available_countdowns')}
                        </div>
                      ) : (
                        <select
                          value={selectedEventKey}
                          onChange={(e) => setSelectedEventKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="">{t('select_event_to_link')}</option>
                          {unlinkedAvailable
                            .filter((ev) => (ev.isPreset && ev.presetExamId) || (!ev.isPreset && ev.customCountdownId))
                            .map((ev, idx) => {
                              const key = ev.isPreset
                                ? `PRESET:${ev.presetExamId}`
                                : `CUSTOM:${ev.customCountdownId}`;
                              return (
                                <option key={key || `ev-${idx}`} value={key}>
                                  {ev.title} ({t('days_remaining_label').replace('{count}', ev.daysRemaining)})
                                </option>
                              );
                            })}
                        </select>
                      )}

                      {unlinkedAvailable.length > 0 && (
                        <button
                          onClick={handleLinkCountdown}
                          disabled={actionLoading || !selectedEventKey}
                          className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>{t('link_countdown_btn')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('btn_close')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GroupCountdownsModal;
