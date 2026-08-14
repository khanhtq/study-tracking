import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { X, Plus, Check, Trash2, Calendar, Bell, ExternalLink, ShieldCheck, Users, Search, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountdownModal({ isOpen, onClose, activeCountdown, presets = [], events = [], onSaveEvent, onDeleteEvent, onPinEvent }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    presetExamCode: '',
    title: '',
    targetDate: '',
    note: '',
    emailNotify: true,
    isPinned: false,
    isCommunityEvent: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsFormOpen(false);
      setSearchQuery('');
      setFormData({
        presetExamCode: '',
        title: '',
        targetDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        note: '',
        emailNotify: true,
        isPinned: false,
        isCommunityEvent: false
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmitCustom = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.targetDate) return;

    setSubmitting(true);
    try {
      const payload = {
        presetExamCode: formData.presetExamCode || null,
        title: formData.title,
        targetDate: new Date(formData.targetDate).toISOString(),
        note: formData.note,
        emailNotify: formData.emailNotify,
        isPinned: formData.isPinned,
        isCommunityEvent: formData.isCommunityEvent
      };
      await onSaveEvent(payload);
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPreset = (preset) => {
    const payload = {
      presetExamCode: preset.examCode,
      title: preset.title,
      targetDate: preset.targetDate,
      category: preset.category,
      color: preset.color,
      isPinned: true,
      emailNotify: true
    };
    onSaveEvent(payload);
    onClose();
  };

  const handleUntrackPreset = (preset) => {
    const trackedEvent = events.find(e => e.presetExamCode === preset.examCode || e.title === preset.title);
    if (trackedEvent) {
      onDeleteEvent(trackedEvent.id);
    } else if (activeCountdown?.presetExamCode === preset.examCode || activeCountdown?.title === preset.title) {
      if (activeCountdown.id) {
        onDeleteEvent(activeCountdown.id);
      } else {
        onDeleteEvent(preset.examCode);
      }
    }
  };

  const filteredPresets = presets.filter(preset => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = preset.title?.toLowerCase().includes(q);
    const descMatch = preset.description?.toLowerCase().includes(q);
    const creatorMatch = preset.creatorDisplayName?.toLowerCase().includes(q);
    return titleMatch || descMatch || creatorMatch;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                {t('countdown_manage_btn')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('countdown_subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-6">
            <button
              onClick={() => { setActiveTab('presets'); setIsFormOpen(false); }}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'presets'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('countdown_tab_presets')}
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'custom'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('countdown_tab_custom')} ({events.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 flex-1">
                    {t('countdown_presets_desc')}
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('countdown_search_placeholder')}
                    className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {filteredPresets.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">Không tìm thấy kỳ thi hoặc sự kiện nào phù hợp.</p>
                ) : (
                  filteredPresets.map((preset) => {
                    const isTracking = events.some(e => e.presetExamCode === preset.examCode) || 
                      (activeCountdown?.presetExamCode === preset.examCode || activeCountdown?.title === preset.title);

                    const examTitle = preset.examCode && t(`${preset.examCode}_title`) !== `${preset.examCode}_title`
                      ? t(`${preset.examCode}_title`)
                      : preset.title;

                    const examDesc = preset.examCode && t(`${preset.examCode}_desc`) !== `${preset.examCode}_desc`
                      ? t(`${preset.examCode}_desc`)
                      : preset.description;

                    return (
                      <div
                        key={preset.examCode}
                        className={`p-4 border rounded-xl flex items-start justify-between gap-4 transition-all group ${
                          isTracking
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Title */}
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug">
                            {examTitle}
                          </h4>

                          {/* Badges Row - Clean inline wrap with Tracker Count */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTracking && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap">
                                {t('countdown_btn_tracking')}
                              </span>
                            )}
                            {preset.isOfficialDate ? (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap">
                                <ShieldCheck className="w-3 h-3" /> {t('countdown_official_badge')}
                              </span>
                            ) : preset.isCommunityEvent ? (
                              <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap">
                                <Globe className="w-3 h-3 text-purple-400" />
                                {t('countdown_created_by')} {preset.creatorDisplayName ? `@${preset.creatorDisplayName}` : 'Thành viên'}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                {t('countdown_estimated_badge')}
                              </span>
                            )}

                            {/* Tracker count badge */}
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap">
                              <Users className="w-3 h-3 text-indigo-400" />
                              {preset.trackerCount || 0} {t('countdown_trackers_count')}
                            </span>
                          </div>

                          {examDesc && <p className="text-xs text-slate-400 line-clamp-2">{examDesc}</p>}
                          <p className="text-xs font-mono text-indigo-400">
                            {new Date(preset.targetDate).toLocaleDateString('vi-VN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <div className="shrink-0 self-center">
                          {isTracking ? (
                            <button
                              disabled={submitting}
                              onClick={() => handleUntrackPreset(preset)}
                              className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap group/untrack transition-all cursor-pointer shrink-0"
                              title={t('countdown_btn_untrack')}
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400 group-hover/untrack:hidden" />
                              <X className="w-3.5 h-3.5 text-rose-400 hidden group-hover/untrack:inline" />
                              <span className="group-hover/untrack:hidden">{t('countdown_btn_tracking')}</span>
                              <span className="hidden group-hover/untrack:inline">{t('countdown_btn_untrack')}</span>
                            </button>
                          ) : (
                            <button
                              disabled={submitting}
                              onClick={() => handleSelectPreset(preset)}
                              className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0"
                            >
                              {t('countdown_btn_track')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}


            {activeTab === 'custom' && (
              <div className="space-y-4">
                {!isFormOpen ? (
                  <>
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-dashed border-indigo-500/40 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {t('countdown_add_new')}
                    </button>

                    {events.length === 0 ? (
                      <p className="text-center text-slate-500 text-sm py-6">{t('countdown_empty')}</p>
                    ) : (
                      <div className="space-y-2.5">
                        {events.map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 border rounded-xl flex items-center justify-between transition-all ${
                              item.isPinned
                                ? 'bg-indigo-950/20 border-indigo-500/40'
                                : 'bg-slate-950/60 border-slate-800'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-100">{item.title}</h4>
                                {item.isPinned && (
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-medium">
                                    Đang ghim
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-slate-400 mt-1">
                                {new Date(item.targetDate).toLocaleString('vi-VN')}
                              </p>
                              {item.note && <p className="text-xs text-slate-500 italic mt-0.5">{item.note}</p>}
                            </div>

                            <div className="flex items-center gap-2">
                              {!item.isPinned && (
                                <button
                                  onClick={() => onPinEvent(item.id)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                                >
                                  {t('countdown_pin')}
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteEvent(item.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title={t('countdown_delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleSubmitCustom} className="space-y-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-slate-200">{t('countdown_add_new')}</h3>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_event_title')}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Thi cuối kỳ môn Giải Tích"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_target_date')}
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_note')}
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú mục tiêu hoặc kết quả mong muốn..."
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isCommunityEvent"
                          checked={formData.isCommunityEvent}
                          onChange={(e) => setFormData({ ...formData, isCommunityEvent: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="isCommunityEvent" className="text-xs text-purple-300 font-semibold cursor-pointer flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-purple-400" />
                          {t('countdown_share_community')}
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="emailNotify"
                          checked={formData.emailNotify}
                          onChange={(e) => setFormData({ ...formData, emailNotify: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="emailNotify" className="text-xs text-slate-300 cursor-pointer">
                          {t('countdown_email_notify')} (30d, 14d, 7d, 1d)
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {t('countdown_save')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}



