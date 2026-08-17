import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Image as ImageIcon, FileText, Film, Music, Download, BookmarkPlus,
  Search, Loader2, ExternalLink, Calendar, User, Eye, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { communityChatApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import ChatToast from './ChatToast';

const getFullAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  const backendOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8080';
  return `${backendOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function GroupMediaModal({ groupId, groupName, isOpen, onClose }) {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const [activeType, setActiveType] = useState('ALL'); // 'ALL' | 'MEDIA' | 'DOCUMENTS' | 'AUDIO'
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingDocId, setSavingDocId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', title = null) => {
    setToast({ message, type, title });
  };

  const loadAttachments = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await communityChatApi.getGroupAttachments(groupId, activeType);
      setAttachments(data || []);
    } catch (err) {
      console.error('Lỗi tải multimedia nhóm:', err);
      showToast(err.message || 'Không thể tải danh sách tệp.', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, activeType]);

  useEffect(() => {
    if (isOpen && groupId) {
      loadAttachments();
    }
  }, [isOpen, groupId, activeType, loadAttachments]);

  const handleSaveToDrive = async (e, att) => {
    e.stopPropagation();
    try {
      setSavingDocId(att.id);
      await communityChatApi.saveSharedDocumentToMyLibrary(groupId, att.id);
      showToast(`Đã lưu "${att.fileName}" vào kho tài liệu cá nhân!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu tài liệu.', 'error');
    } finally {
      setSavingDocId(null);
    }
  };

  const filteredAttachments = attachments.filter((att) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = att.fileName?.toLowerCase().includes(q);
    const matchSender = att.senderName?.toLowerCase().includes(q);
    return matchName || matchSender;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      {/* Toast */}
      {toast && (
        <ChatToast
          message={toast.message}
          type={toast.type}
          title={toast.title}
          onClose={() => setToast(null)}
        />
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4"
          >
            <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
              <a
                href={getFullAvatarUrl(previewImage.fileUrl)}
                download={previewImage.fileName}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors flex items-center gap-1 text-xs font-bold"
                title="Tải xuống tệp gốc"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Tải xuống</span>
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2.5 rounded-full bg-slate-800/80 hover:bg-rose-600 text-white transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={getFullAvatarUrl(previewImage.fileUrl)}
              alt={previewImage.fileName}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="mt-3 text-center text-xs text-slate-300">
              <p className="font-semibold">{previewImage.fileName}</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Chia sẻ bởi {previewImage.senderName} • {formatFileSize(previewImage.fileSize)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[750px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Kho Multimedia & Tài liệu</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                  {attachments.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                Tất cả tệp, hình ảnh, video và tài liệu đã chia sẻ trong nhóm <strong className="text-slate-700 dark:text-slate-300">{groupName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Tabs & Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'Tất cả', icon: Sparkles },
              { id: 'MEDIA', label: 'Ảnh & Video', icon: ImageIcon },
              { id: 'DOCUMENTS', label: 'Tài liệu', icon: FileText },
              { id: 'AUDIO', label: 'Âm thanh', icon: Music },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên tệp hoặc người gửi..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span>Đang tải danh sách multimedia...</span>
            </div>
          ) : filteredAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-300">Không có multimedia nào</p>
              <p className="text-slate-500 max-w-sm">
                {searchQuery
                  ? 'Không tìm thấy tệp phù hợp với từ khóa tìm kiếm của bạn.'
                  : 'Chưa có ảnh, video hay tài liệu nào được chia sẻ trong nhóm.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredAttachments.map((att) => {
                const isImage = att.attachmentType === 'IMAGE';
                const isVideo = att.attachmentType === 'VIDEO';
                const isAudio = att.attachmentType === 'AUDIO';
                const isDoc = att.attachmentType === 'DOCUMENT' || att.attachmentType === 'STUDY_DOCUMENT';
                const isSaving = savingDocId === att.id;

                return (
                  <div
                    key={att.id}
                    className="group relative flex flex-col bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/40 rounded-2xl overflow-hidden transition-all shadow-xs hover:shadow-sm"
                  >
                    {/* Media Preview Box */}
                    <div
                      className="relative w-full aspect-video sm:aspect-square bg-slate-200/50 dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (isImage) {
                          setPreviewImage(att);
                        } else {
                          window.open(getFullAvatarUrl(att.fileUrl), '_blank');
                        }
                      }}
                    >
                      {isImage ? (
                        <img
                          src={getFullAvatarUrl(att.thumbnailUrl || att.fileUrl)}
                          alt={att.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : isVideo ? (
                        <div className="flex flex-col items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                          <Film className="w-8 h-8" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Video</span>
                        </div>
                      ) : isAudio ? (
                        <div className="flex flex-col items-center gap-1.5 text-amber-500 dark:text-amber-400">
                          <Music className="w-8 h-8" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Âm thanh</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                          <FileText className="w-8 h-8" />
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase">
                            {att.fileName.split('.').pop() || 'Tệp'}
                          </span>
                        </div>
                      )}

                      {/* Quick Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-xs">
                        {isImage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(att);
                            }}
                            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                            title="Xem kích thước lớn"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <a
                          href={getFullAvatarUrl(att.fileUrl)}
                          download={att.fileName}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-white transition-colors"
                          title="Tải xuống tệp"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={(e) => handleSaveToDrive(e, att)}
                          disabled={isSaving}
                          className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 cursor-pointer"
                          title="Lưu vào kho tài liệu cá nhân"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate" title={att.fileName}>
                        {att.fileName}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatFileSize(att.fileSize)}</span>
                        {att.createdAt && (
                          <span>
                            {new Date(att.createdAt).toLocaleDateString([], {
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Sender details */}
                      <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[100px]" title={att.senderName}>
                          bởi <strong className="text-slate-700 dark:text-slate-300 font-semibold">{att.senderName}</strong>
                        </span>
                        <button
                          onClick={(e) => handleSaveToDrive(e, att)}
                          disabled={isSaving}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-0.5 font-bold cursor-pointer"
                          title="Lưu vào Drive cá nhân"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          <span>Lưu</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
