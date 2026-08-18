import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, getErrorMessage } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Users, Search, Edit3, Trash2, Archive, ArchiveRestore, Globe, Lock,
  Plus, CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles, MessageSquare, ShieldCheck, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminGroupsManager() {
  const { t } = useLanguage();
  const { toast, confirm } = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArchived, setFilterArchived] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'ARCHIVED'

  // Modal State for Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    privacy: 'PUBLIC',
    joinPolicy: 'OPEN',
    maxMembers: 5000,
    avatarUrl: '',
    coverUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const isArchivedParam = filterArchived === 'ALL' ? null : filterArchived === 'ARCHIVED';
      const data = await adminApi.getAllGroups(searchQuery, isArchivedParam);
      setGroups(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách nhóm:', err);
      toast.error('Không thể tải danh sách nhóm học');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterArchived, toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleOpenEditModal = (group) => {
    setEditingGroup(group);
    setEditFormData({
      name: group.name || '',
      description: group.description || '',
      privacy: group.privacy || 'PUBLIC',
      joinPolicy: group.joinPolicy || 'OPEN',
      maxMembers: group.maxMembers || 5000,
      avatarUrl: group.avatarUrl || '',
      coverUrl: group.coverUrl || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      toast.error('Tên nhóm không được để trống.');
      return;
    }
    try {
      setSubmitting(true);
      await adminApi.updateGroup(editingGroup.id, editFormData);
      toast.success(`Đã cập nhật thông tin nhóm "${editFormData.name}"!`);
      setIsEditModalOpen(false);
      fetchGroups();
    } catch (err) {
      console.error('Lỗi cập nhật nhóm:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (group) => {
    const isCurrentlyArchived = Boolean(group.isArchived);
    const actionText = isCurrentlyArchived ? 'Bỏ ẩn / Kích hoạt lại' : 'Ẩn / Lưu trữ';
    const isConfirmed = await confirm({
      title: `${actionText} Nhóm Học`,
      message: `Bạn có chắc chắn muốn ${actionText.toLowerCase()} nhóm "${group.name}" không?`,
      confirmText: actionText,
      cancelText: 'Hủy bỏ',
      type: isCurrentlyArchived ? 'info' : 'warning',
    });
    if (!isConfirmed) return;

    try {
      await adminApi.archiveGroup(group.id, !isCurrentlyArchived);
      toast.success(`Đã ${actionText.toLowerCase()} nhóm "${group.name}" thành công.`);
      fetchGroups();
    } catch (err) {
      console.error('Lỗi lưu trữ nhóm:', err);
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteGroup = async (group) => {
    const isConfirmed = await confirm({
      title: 'Xóa Vĩnh Viễn Nhóm Học',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn nhóm "${group.name}" không? Toàn bộ tin nhắn và dữ liệu nhóm sẽ bị xóa và không thể khôi phục!`,
      confirmText: 'Xóa Vĩnh Viễn',
      cancelText: 'Hủy',
      type: 'danger',
    });
    if (!isConfirmed) return;

    try {
      await adminApi.deleteGroup(group.id);
      toast.success(`Đã xóa vĩnh viễn nhóm "${group.name}".`);
      fetchGroups();
    } catch (err) {
      console.error('Lỗi xóa nhóm:', err);
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="glass-panel p-5 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Quản Lý Nhóm Học ({groups.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Xem toàn bộ nhóm trong hệ thống, chỉnh sửa metadata, ẩn/lưu trữ hoặc xóa cưỡng chế.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên nhóm, slug, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-700/70 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterArchived}
            onChange={(e) => setFilterArchived(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/70 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="ARCHIVED">Đã ẩn / Lưu trữ</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={fetchGroups}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-300 rounded-xl transition-all cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Groups Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-5">Nhóm Học</th>
                <th className="py-4 px-4">Trưởng Nhóm</th>
                <th className="py-4 px-4">Thành Viên</th>
                <th className="py-4 px-4">Tin Nhắn</th>
                <th className="py-4 px-4">Quyền Riêng Tư</th>
                <th className="py-4 px-4">Trạng Thái</th>
                <th className="py-4 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Đang tải danh sách nhóm...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    Không tìm thấy nhóm học nào.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Group Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {group.avatarUrl ? (
                            <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-sm">{group.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">@{group.slug}</div>
                          {group.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-4 px-4">
                      {group.owner ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {group.owner.avatarUrl ? (
                              <img src={group.owner.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              group.owner.displayName?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-200 text-xs">{group.owner.displayName}</div>
                            <div className="text-[10px] text-slate-400">{group.owner.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Không có chủ nhóm</span>
                      )}
                    </td>

                    {/* Members */}
                    <td className="py-4 px-4 font-bold text-slate-200">
                      {group.memberCount || 0} / {group.maxMembers || 5000}
                    </td>

                    {/* Messages */}
                    <td className="py-4 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        {group.messageCount || 0}
                      </div>
                    </td>

                    {/* Privacy */}
                    <td className="py-4 px-4">
                      {group.privacy === 'PUBLIC' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Công Khai
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Riêng Tư
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {group.isArchived ? (
                        <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                          <Archive className="w-3 h-3" /> Đã Ẩn
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-[11px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Hoạt Động
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(group)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="Chỉnh sửa thông tin nhóm"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(group)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            group.isArchived
                              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30'
                          }`}
                          title={group.isArchived ? 'Bỏ ẩn / Kích hoạt lại nhóm' : 'Ẩn / Lưu trữ nhóm'}
                        >
                          {group.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group)}
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                          title="Xóa vĩnh viễn nhóm"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
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
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-white">Chỉnh Sửa Nhóm Học (Admin)</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Tên Nhóm *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Mô Tả</label>
                  <textarea
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Mô tả mục tiêu của nhóm học..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Quyền Riêng Tư</label>
                    <select
                      value={editFormData.privacy}
                      onChange={(e) => setEditFormData({ ...editFormData, privacy: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="PUBLIC">Công khai (Public)</option>
                      <option value="PRIVATE">Riêng tư (Private)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Chính Sách Gia Nhập</label>
                    <select
                      value={editFormData.joinPolicy}
                      onChange={(e) => setEditFormData({ ...editFormData, joinPolicy: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="OPEN">Tự do vào ngay</option>
                      <option value="APPROVAL_REQUIRED">Cần duyệt đơn</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Số Thành Viên Tối Đa</label>
                    <input
                      type="number"
                      min={10}
                      max={20000}
                      value={editFormData.maxMembers}
                      onChange={(e) => setEditFormData({ ...editFormData, maxMembers: parseInt(e.target.value) || 5000 })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Ảnh Avatar URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={editFormData.avatarUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, avatarUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
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
                    Lưu Thay Đổi
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
