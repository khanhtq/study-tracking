import React, { useState, useEffect, useRef } from 'react';
import { communityChatApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import {
  X, Settings, Camera, Globe, Lock, ShieldCheck,
  Check, Loader2, Trash2, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

export default function EditGroupModal({
  group,
  isOpen,
  onClose,
  onGroupUpdated,
  onGroupDeleted,
  isOwner = false
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [joinPolicy, setJoinPolicy] = useState('OPEN');
  const [maxMembers, setMaxMembers] = useState(1000);
  const [avatarUrl, setAvatarUrl] = useState('');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name || '');
      setDescription(group.description || '');
      setPrivacy(group.privacy || 'PUBLIC');
      setJoinPolicy(group.joinPolicy || 'OPEN');
      setMaxMembers(group.maxMembers || 1000);
      setAvatarUrl(group.avatarUrl || '');
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, group]);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP, ...).');
      return;
    }

    try {
      setUploadingAvatar(true);
      setError(null);
      const res = await communityChatApi.uploadChatFile(group.id, file);
      if (res?.fileUrl) {
        setAvatarUrl(res.fileUrl);
      }
    } catch (err) {
      console.error('Lỗi upload avatar nhóm:', err);
      setError(err.message || 'Lỗi tải ảnh đại diện lên máy chủ.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên nhóm không được để trống.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        privacy,
        joinPolicy,
        maxMembers: Number(maxMembers) || 1000,
        avatarUrl: avatarUrl || null,
      };

      const updated = await communityChatApi.updateGroup(group.id, payload);
      if (onGroupUpdated) {
        onGroupUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi cập nhật nhóm:', err);
      setError(err.message || 'Lỗi khi cập nhật thông tin nhóm.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setDeleting(true);
      await communityChatApi.deleteGroup(group.id);
      if (onGroupDeleted) {
        onGroupDeleted(group.id);
      }
      onClose();
    } catch (err) {
      console.error('Lỗi xóa nhóm:', err);
      setError(err.message || 'Lỗi khi xóa nhóm.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Chỉnh sửa thông tin nhóm</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Avatar upload */}
            <div className="flex flex-col items-center justify-center gap-2 pb-2">
              <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-indigo-600/20 border-2 border-slate-700 hover:border-indigo-500 transition-all shadow-inner">
                {avatarUrl ? (
                  <img
                    src={getFullAvatarUrl(avatarUrl)}
                    alt="Group Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-indigo-300">
                    {(name || 'G').charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Upload hover overlay */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] gap-1"
                >
                  <Camera className="w-5 h-5" />
                  <span>Đổi ảnh</span>
                </div>

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Tải ảnh mới
                </button>
                {avatarUrl && (
                  <>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Gỡ ảnh
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_name')} *</label>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nhóm Ôn Thi THPT Quốc Gia..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_desc')}</label>
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục tiêu học tập, lịch thảo luận của nhóm..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none transition-colors"
              />
            </div>

            {/* Privacy & Join policy */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('group_privacy')}</label>
                <select
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="PUBLIC">{t('privacy_public')}</option>
                  <option value="PRIVATE">{t('privacy_private')}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('join_policy')}</label>
                <select
                  value={joinPolicy}
                  onChange={(e) => setJoinPolicy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="OPEN">{t('join_policy_open')}</option>
                  <option value="APPROVAL_REQUIRED">{t('join_policy_approval')}</option>
                </select>
              </div>
            </div>

            {/* Max members */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">{t('max_members')}</label>
              <select
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              >
                <option value={50}>50 thành viên</option>
                <option value={100}>100 thành viên</option>
                <option value={200}>200 thành viên</option>
                <option value={500}>500 thành viên</option>
                <option value={1000}>1,000 thành viên</option>
                <option value={2000}>2,000 thành viên</option>
                <option value={5000}>5,000 thành viên</option>
              </select>
              {group.memberCount > maxMembers && (
                <p className="text-[11px] text-amber-400 mt-1">
                  * Nhóm hiện có {group.memberCount} thành viên. Giới hạn phải lớn hơn hoặc bằng số thành viên hiện tại.
                </p>
              )}
            </div>

            {/* Danger Zone (Owner only) */}
            {isOwner && (
              <div className="pt-4 border-t border-slate-800/80">
                <div className="text-xs font-bold text-rose-400 mb-2">Vùng nguy hiểm</div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa nhóm vĩnh viễn</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 space-y-2">
                    <p className="text-xs text-rose-200 font-semibold">
                      Bạn có chắc chắn muốn xóa nhóm này? Toàn bộ tin nhắn và tài liệu trong nhóm sẽ bị xóa vĩnh viễn và không thể khôi phục.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        disabled={deleting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors disabled:opacity-50"
                      >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span>Xác nhận xóa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {t('drive_btn_cancel')}
              </button>
              <button
                type="submit"
                disabled={saving || uploadingAvatar || !name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{t('drive_btn_save')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
