import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, getErrorMessage } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar, Search, Plus, Edit3, Trash2, ShieldCheck, Sparkles,
  CheckCircle2, Users, ExternalLink, RefreshCw, Loader2, Award, Clock, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'exam', label: 'Kỳ thi chính thức' },
  { id: 'university', label: 'Đại học' },
  { id: 'certificate', label: 'Chứng chỉ (IELTS, TOEIC...)' },
  { id: 'event', label: 'Sự kiện / Lễ hội' },
  { id: 'personal', label: 'Khác' },
];

const COLORS = ['indigo', 'emerald', 'amber', 'rose', 'purple', 'sky', 'cyan'];

export default function AdminCountdownsManager() {
  const { t } = useLanguage();
  const { toast, confirm } = useToast();

  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OFFICIAL' | 'COMMUNITY'

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [formData, setFormData] = useState({
    examCode: '',
    title: '',
    targetDate: '',
    category: 'exam',
    isOfficialDate: true,
    sourceUrl: '',
    description: '',
    color: 'indigo',
    isCommunityEvent: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllPresetCountdowns();
      setPresets(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách sự kiện:', err);
      toast.error('Không thể tải danh sách sự kiện đếm ngược');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const handleOpenCreateModal = () => {
    setEditingPreset(null);
    setFormData({
      examCode: '',
      title: '',
      targetDate: '',
      category: 'exam',
      isOfficialDate: true,
      sourceUrl: '',
      description: '',
      color: 'indigo',
      isCommunityEvent: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (preset) => {
    setEditingPreset(preset);
    let formattedDate = '';
    if (preset.targetDate) {
      try {
        const d = new Date(preset.targetDate);
        formattedDate = d.toISOString().slice(0, 16);
      } catch (e) {
        console.error('Date parsing error', e);
      }
    }

    setFormData({
      examCode: preset.examCode,
      title: preset.title || '',
      targetDate: formattedDate,
      category: preset.category || 'exam',
      isOfficialDate: Boolean(preset.isOfficialDate),
      sourceUrl: preset.sourceUrl || '',
      description: preset.description || '',
      color: preset.color || 'indigo',
      isCommunityEvent: Boolean(preset.isCommunityEvent),
    });
    setIsModalOpen(true);
  };

  const handleSavePreset = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.targetDate) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và ngày giờ thi.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        targetDate: new Date(formData.targetDate).toISOString(),
      };

      if (editingPreset) {
        await adminApi.updatePresetCountdown(editingPreset.examCode, payload);
        toast.success(`Đã cập nhật sự kiện "${formData.title}" và đồng bộ đến người theo dõi!`);
      } else {
        await adminApi.createPresetCountdown(payload);
        toast.success(`Đã tạo mới sự kiện "${formData.title}" thành công!`);
      }

      setIsModalOpen(false);
      fetchPresets();
    } catch (err) {
      console.error('Lỗi lưu sự kiện:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePreset = async (preset) => {
    const isConfirmed = await confirm({
      title: 'Xóa Cưỡng Chế Sự Kiện (Admin)',
      message: `Bạn có chắc chắn muốn xóa sự kiện "${preset.title}" (${preset.examCode})? Sự kiện này đang có ${preset.trackerCount || 0} người theo dõi và sẽ bị gỡ bỏ toàn bộ khỏi hệ thống!`,
      confirmText: 'Xóa Cưỡng Chế',
      cancelText: 'Hủy bỏ',
      type: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await adminApi.deletePresetCountdown(preset.examCode);
      toast.success(`Đã xóa sự kiện "${preset.title}" thành công.`);
      fetchPresets();
    } catch (err) {
      console.error('Lỗi xóa sự kiện:', err);
      toast.error(getErrorMessage(err));
    }
  };

  const filteredPresets = presets.filter((p) => {
    const matchesSearch =
      (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.examCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'OFFICIAL') return Boolean(p.isOfficialDate);
    if (filterType === 'COMMUNITY') return Boolean(p.isCommunityEvent);
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Quản Lý Sự Kiện & Lịch Thi ({presets.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Toàn quyền tạo, sửa thông tin, ngày giờ hoặc xóa cưỡng chế bất kỳ sự kiện nào trong hệ thống.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên sự kiện, mã..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tất cả loại sự kiện</option>
            <option value="OFFICIAL">Sự kiện chính thức</option>
            <option value="COMMUNITY">Sự kiện cộng đồng</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={fetchPresets}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-300 rounded-xl transition-all cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Create Button */}
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Sự Kiện Mới</span>
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-5">Sự Kiện / Kỳ Thi</th>
                <th className="py-4 px-4">Mã Sự Kiện</th>
                <th className="py-4 px-4">Ngày Giờ Diễn Ra</th>
                <th className="py-4 px-4">Phân Loại</th>
                <th className="py-4 px-4">Người Tạo</th>
                <th className="py-4 px-4">Người Theo Dõi</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && presets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Đang tải danh sách sự kiện...
                  </td>
                </tr>
              ) : filteredPresets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    Không tìm thấy sự kiện nào.
                  </td>
                </tr>
              ) : (
                filteredPresets.map((preset) => {
                  const targetTime = new Date(preset.targetDate);
                  const isExpired = targetTime.getTime() < Date.now();

                  return (
                    <tr key={preset.examCode} className="hover:bg-slate-800/30 transition-colors">
                      {/* Title & Description */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-sm border ${
                              preset.color === 'emerald'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : preset.color === 'amber'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : preset.color === 'rose'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : preset.color === 'purple'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            }`}
                          >
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm flex items-center gap-2">
                              <span>{preset.title}</span>
                              {preset.isOfficialDate && (
                                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-black rounded-lg flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Chính Thức
                                </span>
                              )}
                            </div>
                            {preset.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                {preset.description}
                              </p>
                            )}
                            {preset.sourceUrl && (
                              <a
                                href={preset.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>Nguồn thông tin</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Exam Code */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-300">
                        {preset.examCode}
                      </td>

                      {/* Target Date */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-200 text-xs">
                          {targetTime.toLocaleDateString('vi-VN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {targetTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          {isExpired && <span className="ml-1.5 text-rose-400 font-bold">(Đã qua)</span>}
                        </div>
                      </td>

                      {/* Classification */}
                      <td className="py-4 px-4">
                        {preset.isOfficialDate ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-400" /> Thi Quốc Gia
                          </span>
                        ) : preset.isCommunityEvent ? (
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> Cộng Đồng
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Hệ Thống
                          </span>
                        )}
                      </td>

                      {/* Creator */}
                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {preset.creatorDisplayName ? (
                          <span className="text-slate-200 font-bold">{preset.creatorDisplayName}</span>
                        ) : (
                          <span className="text-indigo-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Admin Hệ Thống
                          </span>
                        )}
                      </td>

                      {/* Trackers */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{preset.trackerCount || 0}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(preset)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="Chỉnh sửa sự kiện"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                          <button
                            onClick={() => handleDeletePreset(preset)}
                            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                            title="Xóa cưỡng chế sự kiện"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Preset Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white">
                    {editingPreset ? 'Chỉnh Sửa Sự Kiện (Admin)' : 'Tạo Sự Kiện Mới (Admin)'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePreset} className="p-6 space-y-4">
                {!editingPreset && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Mã Kỳ Thi / Sự Kiện (Tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: THPT_QG_2027, DGNL_2027..."
                      value={formData.examCode}
                      onChange={(e) => setFormData({ ...formData, examCode: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white uppercase focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Tiêu Đề Sự Kiện *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kỳ thi Tốt nghiệp THPT Quốc Gia 2027"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Ngày & Giờ Diễn Ra *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.targetDate}
                      onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Danh Mục</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Tông Màu Giao Diện</label>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {COLORS.map((col) => (
                        <option key={col} value={col}>
                          {col.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Nguồn Chính Thức (URL)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.sourceUrl}
                      onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Mô Tả Chi Tiết</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Mô tả tóm tắt về lịch thi hoặc sự kiện này..."
                  />
                </div>

                {/* Flags: isOfficialDate & isCommunityEvent */}
                <div className="p-3.5 bg-slate-800/50 border border-slate-800 rounded-2xl space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOfficialDate}
                      onChange={(e) => setFormData({ ...formData, isOfficialDate: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 bg-slate-800 border-slate-700 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-white">Đánh dấu là Kỳ thi / Sự kiện Chính Thức</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCommunityEvent}
                      onChange={(e) => setFormData({ ...formData, isCommunityEvent: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                    />
                    <span>Hiển thị trong Danh mục Khám Phá Cộng Đồng</span>
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingPreset ? 'Lưu Cập Nhật' : 'Tạo Sự Kiện'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
