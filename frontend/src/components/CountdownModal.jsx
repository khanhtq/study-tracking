import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { 
  X, 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Bell, 
  ShieldCheck, 
  Users, 
  Search, 
  Globe, 
  Pin, 
  Sparkles,
  Layers,
  ChevronRight,
  Pencil,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountdownModal({ 
  isOpen, 
  onClose, 
  activeCountdown, 
  presets = [], 
  events = [], 
  currentUser,
  onSaveEvent, 
  onUpdateEvent,
  onDeleteEvent, 
  onPinEvent 
}) {
  const { t } = useLanguage();
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'my_events'
  const [presetFilter, setPresetFilter] = useState('all'); // 'all' | 'official' | 'community'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
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

  const formatDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const pad = (num) => String(num).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsFormOpen(false);
      setEditingEventId(null);
      setSearchQuery('');
      setPresetFilter('all');
      setFormData({
        presetExamCode: '',
        title: '',
        targetDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        note: '',
        emailNotify: true,
        isPinned: events.length === 0,
        isCommunityEvent: false
      });
    }
  }, [isOpen, events.length]);

  if (!isOpen) return null;

  const isEventOwner = (item) => {
    if (!item) return false;
    if (item.canEdit !== undefined) return Boolean(item.canEdit);
    if (item.isOwner !== undefined) return Boolean(item.isOwner);

    // Private custom events without preset code are created by the user
    if (!item.presetExamCode) return true;

    // Check against preset list
    const matchedPreset = presets.find(p => p.examCode === item.presetExamCode);
    if (!matchedPreset) return false;
    if (matchedPreset.isOfficialDate || !matchedPreset.isCommunityEvent) return false;

    if (currentUser) {
      if (matchedPreset.createdByUserId && currentUser.id && matchedPreset.createdByUserId === currentUser.id) return true;
      if (matchedPreset.creatorDisplayName && currentUser.displayName && matchedPreset.creatorDisplayName === currentUser.displayName) return true;
    }
    return false;
  };

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormData({
      presetExamCode: '',
      title: '',
      targetDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
      note: '',
      emailNotify: true,
      isPinned: events.length === 0,
      isCommunityEvent: false
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (!isEventOwner(item)) return;

    setEditingEventId(item.id || item.presetExamCode);
    const matchedPreset = presets.find(p => p.examCode === item.presetExamCode);
    const isCommunity = Boolean(matchedPreset?.isCommunityEvent || item.isCommunityEvent);

    setFormData({
      presetExamCode: item.presetExamCode || '',
      title: item.title || '',
      targetDate: formatDateTimeLocal(item.targetDate),
      note: item.note || '',
      emailNotify: item.emailNotify ?? true,
      isPinned: Boolean(item.isPinned),
      isCommunityEvent: isCommunity
    });
    setIsFormOpen(true);
  };

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
      if (editingEventId && onUpdateEvent) {
        await onUpdateEvent(editingEventId, payload);
      } else {
        await onSaveEvent(payload);
      }
      setIsFormOpen(false);
      setEditingEventId(null);
      setActiveTab('my_events');
    } catch (err) {
      console.error('Submit event failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPreset = (preset, pinImmediately = false) => {
    const payload = {
      presetExamCode: preset.examCode,
      title: preset.title,
      targetDate: preset.targetDate,
      category: preset.category || 'exam',
      color: preset.color || 'indigo',
      isOfficialDate: Boolean(preset.isOfficialDate),
      isPinned: pinImmediately || events.length === 0,
      emailNotify: true
    };
    onSaveEvent(payload);
  };

  const handleUntrackPreset = (preset) => {
    const trackedEvent = events.find(e => 
      (preset.examCode && e.presetExamCode === preset.examCode) || 
      (preset.title && e.title === preset.title)
    );
    if (trackedEvent) {
      onDeleteEvent(trackedEvent.id);
    } else {
      onDeleteEvent(preset.examCode);
    }
  };

  const getTranslatedTitle = (item) => {
    if (item?.presetExamCode) {
      const key = `${item.presetExamCode}_title`;
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return item?.title || '';
  };

  const nowMs = Date.now();
  const activeEvents = events.filter(e => new Date(e.targetDate).getTime() > nowMs);

  const filteredPresets = presets.filter(preset => {
    // Hide presets that have already passed
    if (preset.targetDate && new Date(preset.targetDate).getTime() <= nowMs) return false;

    if (presetFilter === 'official' && !preset.isOfficialDate) return false;
    if (presetFilter === 'community' && !preset.isCommunityEvent) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (preset.title || '').toLowerCase().includes(q);
    const descMatch = (preset.description || '').toLowerCase().includes(q);
    const creatorMatch = (preset.creatorDisplayName || '').toLowerCase().includes(q);
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
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                {t('countdown_manage_btn')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t('countdown_subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-6">
            <button
              onClick={() => { setActiveTab('presets'); setIsFormOpen(false); }}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'presets'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {t('countdown_tab_presets')}
            </button>
            <button
              onClick={() => setActiveTab('my_events')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
                activeTab === 'my_events'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              {t('countdown_my_events')} ({activeEvents.length})
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* TAB 1: PRESETS & COMMUNITY EXAMS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                {/* Description & Search */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-slate-400">
                    {t('countdown_presets_desc')}
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('countdown_search_placeholder')}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-950/60 p-1 border border-slate-800 rounded-xl shrink-0">
                      <button
                        onClick={() => setPresetFilter('all')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          presetFilter === 'all'
                            ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('countdown_filter_all')}
                      </button>
                      <button
                        onClick={() => setPresetFilter('official')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          presetFilter === 'official'
                            ? 'bg-emerald-600/30 text-emerald-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('countdown_filter_official')}
                      </button>
                      <button
                        onClick={() => setPresetFilter('community')}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          presetFilter === 'community'
                            ? 'bg-purple-600/30 text-purple-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('countdown_filter_community')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Presets List */}
                {filteredPresets.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">Không tìm thấy kỳ thi hoặc sự kiện nào phù hợp.</p>
                ) : (
                  filteredPresets.map((preset) => {
                    const trackedEvent = events.find(e => 
                      (preset.examCode && e.presetExamCode === preset.examCode) || 
                      (preset.title && e.title === preset.title)
                    );
                    const isTracking = Boolean(trackedEvent);
                    const isPinned = Boolean(trackedEvent?.isPinned);
                    const displayTrackerCount = isTracking ? Math.max(1, preset.trackerCount || 0) : (preset.trackerCount || 0);

                    const examTitle = preset.examCode && t(`${preset.examCode}_title`) !== `${preset.examCode}_title`
                      ? t(`${preset.examCode}_title`)
                      : preset.title;

                    const examDesc = preset.examCode && t(`${preset.examCode}_desc`) !== `${preset.examCode}_desc`
                      ? t(`${preset.examCode}_desc`)
                      : preset.description;

                    return (
                      <div
                        key={preset.examCode}
                        className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group ${
                          isPinned
                            ? 'bg-indigo-950/20 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                            : isTracking
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors leading-snug">
                              {examTitle}
                            </h4>
                            {isPinned && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                                <Pin className="w-3 h-3 fill-amber-300 text-amber-300" />
                                {t('countdown_pinned_to_widget')}
                              </span>
                            )}
                          </div>

                          {/* Badges Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {isTracking && !isPinned && (
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

                            <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 whitespace-nowrap">
                              <Users className="w-3 h-3 text-indigo-400" />
                              {displayTrackerCount} {t('countdown_trackers_count')}
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

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isTracking ? (
                            <>
                              {!isPinned && (
                                <button
                                  onClick={() => onPinEvent(trackedEvent?.id || preset.examCode)}
                                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                                  title={t('countdown_pin_tooltip')}
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>{t('countdown_pin_to_widget')}</span>
                                </button>
                              )}
                              <button
                                disabled={submitting}
                                onClick={() => handleUntrackPreset(preset)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 group/untrack transition-all cursor-pointer"
                                title={t('countdown_btn_untrack')}
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400 group-hover/untrack:hidden" />
                                <X className="w-3.5 h-3.5 text-rose-400 hidden group-hover/untrack:inline" />
                                <span className="group-hover/untrack:hidden">{t('countdown_btn_tracking')}</span>
                                <span className="hidden group-hover/untrack:inline">{t('countdown_btn_untrack')}</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                disabled={submitting}
                                onClick={() => handleSelectPreset(preset, false)}
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              >
                                {t('countdown_btn_track')}
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleSelectPreset(preset, true)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1 shadow-md shadow-indigo-600/20 cursor-pointer"
                                title={t('countdown_pin_tooltip')}
                              >
                                <Pin className="w-3 h-3" />
                                <span>{t('countdown_track_and_pin')}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: MY COUNTDOWNS (TRACKED PRESETS + CUSTOM EVENTS) */}
            {activeTab === 'my_events' && (
              <div className="space-y-4">
                {!isFormOpen ? (
                  <>
                    <button
                      onClick={handleOpenCreate}
                      className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-dashed border-indigo-500/40 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> {t('countdown_add_new')}
                    </button>

                    {activeEvents.length === 0 ? (
                      <div className="text-center py-10 space-y-3">
                        <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-slate-400 text-sm">{t('countdown_empty')}</p>
                        <button
                          onClick={() => setActiveTab('presets')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          {t('countdown_select_event_btn')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeEvents.map((item) => {
                          const isPinned = Boolean(item.isPinned);
                          const isPreset = Boolean(item.presetExamCode);

                          return (
                            <div
                              key={item.id || item.presetExamCode || item.title}
                              className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                                isPinned
                                  ? 'bg-indigo-950/20 border-indigo-500/50 shadow-sm shadow-indigo-500/10'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-semibold text-slate-100">
                                    {getTranslatedTitle(item)}
                                  </h4>
                                  {isPinned && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                                      <Pin className="w-3 h-3 fill-amber-300 text-amber-300" />
                                      {t('countdown_pinned_to_widget')}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                  <span className="font-mono text-indigo-400">
                                    {new Date(item.targetDate).toLocaleString('vi-VN', {
                                      year: 'numeric',
                                      month: 'numeric',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>

                                  {isPreset ? (
                                    <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                      {item.isOfficialDate ? t('countdown_official_badge') : 'Preset'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                                      {t('countdown_filter_custom')}
                                    </span>
                                  )}
                                </div>

                                {item.note && (
                                  <p className="text-xs text-slate-400 italic line-clamp-1">
                                    {item.note}
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {isEventOwner(item) && (
                                  <button
                                    onClick={() => handleOpenEdit(item)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                    title={t('countdown_edit')}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                )}
                                {!isPinned && (
                                  <button
                                    onClick={() => onPinEvent(item.id)}
                                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                                    title={t('countdown_pin_tooltip')}
                                  >
                                    <Pin className="w-3.5 h-3.5" />
                                    <span>{t('countdown_pin_to_widget')}</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteEvent(item.id)}
                                  className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                                  title={t('countdown_unfollow')}
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  /* Custom Event Creation / Editing Form */
                  <form onSubmit={handleSubmitCustom} className="space-y-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-sm font-bold text-slate-200">
                        {editingEventId ? t('countdown_edit_title') : t('countdown_add_new')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => { setIsFormOpen(false); setEditingEventId(null); }}
                        className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_event_title')} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Thi cuối kỳ môn Giải Tích"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_target_date')} *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t('countdown_note')}
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú mục tiêu hoặc điểm số mong muốn..."
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isPinned"
                          checked={formData.isPinned}
                          onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="isPinned" className="text-xs text-amber-300 font-semibold cursor-pointer flex items-center gap-1.5">
                          <Pin className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                          {t('countdown_pin_to_widget')} (Sự kiện chính)
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isCommunityEvent"
                          checked={formData.isCommunityEvent}
                          onChange={(e) => setFormData({ ...formData, isCommunityEvent: e.target.checked })}
                          className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
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
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor="emailNotify" className="text-xs text-slate-300 cursor-pointer">
                          {t('countdown_email_notify')} (30d, 14d, 7d, 1d)
                        </label>
                      </div>
                    </div>

                    {(() => {
                      const matchedPresetForEdit = formData.presetExamCode ? presets.find(p => p.examCode === formData.presetExamCode) : null;
                      const isCommunityPreset = Boolean(matchedPresetForEdit?.isCommunityEvent || formData.isCommunityEvent);
                      const otherTrackersCount = matchedPresetForEdit?.trackerCount ? Math.max(0, matchedPresetForEdit.trackerCount - 1) : 0;
                      const isExpired = formData.targetDate ? new Date(formData.targetDate).getTime() <= Date.now() : false;
                      const canDeleteEvent = !isCommunityPreset || otherTrackersCount === 0 || isExpired;

                      return (
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 flex-wrap">
                          {editingEventId ? (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={!canDeleteEvent || submitting}
                                onClick={async () => {
                                  if (!canDeleteEvent) {
                                    toast.warning(`${t('countdown_cannot_delete_has_trackers')} (${otherTrackersCount} ${t('countdown_trackers_count')})`);
                                    return;
                                  }
                                  const isConfirmed = await confirm({
                                    title: t('countdown_delete_event'),
                                    message: t('countdown_delete_event_confirm'),
                                    confirmText: t('countdown_delete_event'),
                                    cancelText: t('countdown_cancel_edit'),
                                    type: 'danger'
                                  });
                                  if (isConfirmed) {
                                    onDeleteEvent(editingEventId);
                                    setIsFormOpen(false);
                                    setEditingEventId(null);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                  canDeleteEvent
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-pointer'
                                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
                                }`}
                                title={canDeleteEvent ? t('countdown_delete_event') : `${t('countdown_cannot_delete_has_trackers')} (${otherTrackersCount} ${t('countdown_trackers_count')})`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('countdown_delete_event')}</span>
                              </button>
                              {!canDeleteEvent && (
                                <span className="text-[11px] text-amber-400/90 italic">
                                  {t('countdown_cannot_delete_has_trackers')} ({otherTrackersCount} {t('countdown_trackers_count')})
                                </span>
                              )}
                            </div>
                          ) : <div />}

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => { setIsFormOpen(false); setEditingEventId(null); }}
                              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              {editingEventId ? t('countdown_cancel_edit') : 'Hủy'}
                            </button>
                            <button
                              type="submit"
                              disabled={submitting}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
                            >
                              {editingEventId ? t('countdown_update_btn') : t('countdown_save')}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
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
