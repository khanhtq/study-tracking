import React, { useState, useEffect } from 'react';
import { documentApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { X, Search, FileText, Folder, Check, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareDocumentModal({ isOpen, onClose, onShare }) {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [caption, setCaption] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
      setSelectedDoc(null);
      setCaption('');
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentApi.getDocuments(null);
      // Filter out folders and deleted items
      const filesOnly = (res || []).filter(d => !d.isFolder && !d.isDeleted);
      setDocuments(filesOnly);
    } catch (err) {
      console.error('Lỗi tải danh sách tài liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShare = async () => {
    if (!selectedDoc || sharing) return;
    try {
      setSharing(true);
      await onShare(selectedDoc.id, caption);
      onClose();
    } catch (err) {
      console.error('Lỗi chia sẻ tài liệu:', err);
    } finally {
      setSharing(false);
    }
  };

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">{t('share_document_from_drive')}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('search_messages')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[220px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">{t('loading_account')}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
                {t('no_groups_found')}
              </div>
            ) : (
              filtered.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-4 h-4 flex-shrink-0" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{doc.name}</div>
                        <div className="text-[10px] text-slate-500">{doc.formattedSize || 'Document'}</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Caption & Submit */}
          {selectedDoc && (
            <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-3">
              <input
                type="text"
                placeholder="Thêm lời nhắn (tùy chọn)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('drive_btn_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmShare}
                  disabled={sharing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{t('send')}</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
