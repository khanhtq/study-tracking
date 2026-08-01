import React, { useState, useEffect, useRef } from 'react';
import { documentApi, getErrorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function DocumentDrive({ onBackToDashboard }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Navigation & State
  const [activeTab, setActiveTab] = useState('mydrive'); // 'mydrive' | 'favorites' | 'trash'
  const [folderHistory, setFolderHistory] = useState([{ id: null, name: 'Drive' }]);
  const currentFolder = folderHistory[folderHistory.length - 1];

  const [documents, setDocuments] = useState([]);
  const [quota, setQuota] = useState({ usedBytes: 0, maxBytes: 1048576000, usagePercentage: 0, formattedUsed: '0 B', formattedMax: '1 GB' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Notification & Errors
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch Storage Quota & Documents
  const loadQuota = async () => {
    try {
      const q = await documentApi.getStorageQuota();
      setQuota(q);
    } catch (err) {
      console.error('Error loading storage quota:', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      let data = [];
      if (searchQuery.trim()) {
        data = await documentApi.searchDocuments(searchQuery);
      } else if (activeTab === 'trash') {
        data = await documentApi.getTrash();
      } else if (activeTab === 'favorites') {
        data = await documentApi.getFavorites();
      } else {
        data = await documentApi.getDocuments(currentFolder.id);
      }
      setDocuments(data);
    } catch (err) {
      setError(getErrorMessage(err, 'error_load_documents', t));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuota();
    loadDocuments();
  }, [currentFolder.id, activeTab, searchQuery]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  // Folder Navigation
  const handleOpenFolder = (folder) => {
    setSearchQuery('');
    setFolderHistory((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (index) => {
    setSearchQuery('');
    setFolderHistory((prev) => prev.slice(0, index + 1));
  };

  // Upload File logic (Checks < 200MB)
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    
    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
    for (const f of fileList) {
      if (f.size > MAX_FILE_SIZE) {
        showError(`File "${f.name}" max size limit 200 MB!`);
        return;
      }
    }

    setUploading(true);
    setError('');
    let successCount = 0;

    for (const file of fileList) {
      try {
        await documentApi.uploadFile(file, currentFolder.id);
        successCount++;
      } catch (err) {
        showError(getErrorMessage(err, 'error_upload_failed', t));
      }
    }

    setUploading(false);
    if (successCount > 0) {
      showSuccess(`Uploaded ${successCount} file(s) successfully!`);
      loadDocuments();
      loadQuota();
    }
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Create Folder
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await documentApi.createFolder(newFolderName.trim(), currentFolder.id);
      setIsFolderModalOpen(false);
      setNewFolderName('');
      showSuccess('Created folder successfully!');
      loadDocuments();
    } catch (err) {
      showError(getErrorMessage(err, 'error_create_folder', t));
    }
  };

  // Rename
  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await documentApi.renameDocument(renameTarget.id, renameValue.trim());
      setRenameTarget(null);
      setRenameValue('');
      showSuccess('Renamed successfully!');
      loadDocuments();
    } catch (err) {
      showError(getErrorMessage(err, 'error_rename', t));
    }
  };

  // Actions
  const handleToggleFavorite = async (doc) => {
    try {
      await documentApi.toggleFavorite(doc.id);
      loadDocuments();
    } catch (err) {
      showError(getErrorMessage(err, 'error_favorite', t));
    }
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { doc, isPermanent: boolean }

  const handleSoftDelete = (doc) => {
    setDeleteConfirmTarget({ doc, isPermanent: false });
  };

  const handlePermanentDelete = (doc) => {
    setDeleteConfirmTarget({ doc, isPermanent: true });
  };

  const executeDelete = async () => {
    if (!deleteConfirmTarget || !deleteConfirmTarget.doc) return;
    const { doc, isPermanent } = deleteConfirmTarget;
    setDeleteConfirmTarget(null);

    try {
      if (isPermanent) {
        await documentApi.permanentDelete(doc.id);
        showSuccess('Permanently deleted from storage.');
      } else {
        await documentApi.softDelete(doc.id);
        showSuccess('Moved to trash.');
      }
      loadDocuments();
      loadQuota();
    } catch (err) {
      showError(getErrorMessage(err, 'error_delete', t));
    }
  };

  const handleRestore = async (doc) => {
    try {
      await documentApi.restoreDocument(doc.id);
      showSuccess('Restored document.');
      loadDocuments();
      loadQuota();
    } catch (err) {
      showError(getErrorMessage(err, 'error_restore', t));
    }
  };

  // Download & Preview
  const handleDownload = async (doc) => {
    try {
      const res = await documentApi.getDownloadUrl(doc.id);
      const targetUrl = (res && res.downloadUrl) ? res.downloadUrl : documentApi.getStreamUrl(doc.id);

      // Fetch file as blob byte stream to create same-origin blob URL (forces browser to download instead of opening image/PDF in tab)
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const localBlobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = localBlobUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(localBlobUrl);
    } catch (err) {
      // Fallback: direct stream download via backend
      const streamUrl = documentApi.getStreamUrl(doc.id);
      window.location.href = streamUrl;
    }
  };

  const handlePreview = async (doc) => {
    if (doc.isFolder) {
      handleOpenFolder(doc);
      return;
    }
    setPreviewDoc(doc);
    try {
      const res = await documentApi.getDownloadUrl(doc.id);
      if (res && res.downloadUrl) {
        setPreviewUrl(res.downloadUrl);
      } else {
        setPreviewUrl(documentApi.getStreamUrl(doc.id));
      }
    } catch (err) {
      setPreviewUrl(documentApi.getStreamUrl(doc.id));
    }
  };

  // File Icon Helper
  const getFileIcon = (doc) => {
    if (doc.isFolder) {
      return (
        <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.5 21a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3h-7.5l-2-2.5A2.25 2.25 0 0 0 8.25 3.5H4.5a3 3 0 0 0-3 3v11.5a3 3 0 0 0 3 3h15z" />
        </svg>
      );
    }
    const ct = (doc.contentType || '').toLowerCase();
    const ext = (doc.name.split('.').pop() || '').toLowerCase();

    if (ct.includes('pdf') || ext === 'pdf') {
      return (
        <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15h6m-6 3h3" />
        </svg>
      );
    }
    if (ct.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
      return (
        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      );
    }
    if (ct.includes('word') || ['doc', 'docx'].includes(ext)) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
        </svg>
      );
    }
    if (ct.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.75 7.5h16.5M6.75 4.5h10.5a.75.75 0 01.75.75v2.25H6V5.25a.75.75 0 01.75-.75z" />
        </svg>
      );
    }
    if (ct.includes('video') || ['mp4', 'mkv', 'avi', 'mov'].includes(ext)) {
      return (
        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
      </svg>
    );
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(e.target.files)}
        multiple
        className="hidden"
      />

      {/* Top Header Navbar */}
      <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-2 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {t('drive_back_dashboard')}
          </button>
          <div className="h-5 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                {t('drive_title')}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">{t('drive_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('drive_search_placeholder')}
              className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('drive_create_folder')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
            {t('drive_upload_file')}
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/40 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-1.5">
            <button
              onClick={() => { setActiveTab('mydrive'); setFolderHistory([{ id: null, name: t('drive_tab_mydrive') }]); setSearchQuery(''); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'mydrive' && !searchQuery
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              {t('drive_tab_mydrive')}
            </button>

            <button
              onClick={() => { setActiveTab('favorites'); setSearchQuery(''); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'favorites' && !searchQuery
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.415.871-.84.617L12 17.653l-4.717 2.893c-.425.254-.956-.129-.84-.617l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              {t('drive_tab_favorites')}
            </button>

            <button
              onClick={() => { setActiveTab('trash'); setSearchQuery(''); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-3 ${
                activeTab === 'trash' && !searchQuery
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t('drive_tab_trash')}
            </button>
          </div>

          {/* Storage Meter Card */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">{t('drive_storage_header')}</span>
              <span className="text-[11px] font-medium text-slate-400">{quota.usagePercentage || 0}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  quota.usagePercentage > 90
                    ? 'bg-rose-500'
                    : quota.usagePercentage > 75
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{ width: `${Math.min(100, quota.usagePercentage || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{t('drive_used')} {quota.formattedUsed}</span>
              <span>/ {quota.formattedMax}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-indigo-400/90">
                <span>⚡ {t('drive_user_quota')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>📁 {t('drive_max_file_size')}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content View Workspace */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">
          {/* Messages Alert */}
          {error && (
            <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center justify-between animate-fade-in">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">✕</button>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center justify-between animate-fade-in">
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-200">✕</button>
            </div>
          )}

          {/* Breadcrumb Path & View Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery ? (
                <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span>{t('drive_search_results_for')}</span>
                  <span className="text-indigo-400 font-bold">"{searchQuery}"</span>
                </div>
              ) : activeTab === 'favorites' ? (
                <h2 className="text-lg font-bold text-slate-100">{t('drive_favorites_title')}</h2>
              ) : activeTab === 'trash' ? (
                <h2 className="text-lg font-bold text-slate-100">{t('drive_trash_title')}</h2>
              ) : (
                folderHistory.map((folder, index) => (
                  <React.Fragment key={folder.id || 'root'}>
                    {index > 0 && <span className="text-slate-600 font-medium">/</span>}
                    <button
                      onClick={() => handleNavigateBreadcrumb(index)}
                      className={`text-sm font-semibold transition hover:text-indigo-400 ${
                        index === folderHistory.length - 1 ? 'text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {index === 0 ? t('drive_tab_mydrive') : folder.name}
                    </button>
                  </React.Fragment>
                ))
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-sm transition ${viewMode === 'grid' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                title={t('drive_grid_view')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-sm transition ${viewMode === 'list' ? 'bg-slate-800 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                title={t('drive_list_view')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3" />
            </div>
          ) : documents.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-900/20">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-200">{t('drive_empty_title')}</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-1 mb-6">
                {t('drive_empty_desc')}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {t('drive_empty_btn')}
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onDoubleClick={() => doc.isFolder ? handleOpenFolder(doc) : handlePreview(doc)}
                  className="group bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 rounded-2xl p-4 transition flex flex-col justify-between cursor-pointer relative shadow-sm hover:shadow-xl hover:shadow-indigo-950/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                        {getFileIcon(doc)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition" title={doc.name}>
                          {doc.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc.isFolder ? t('drive_folder') : formatSize(doc.sizeBytes)}
                        </p>
                      </div>
                    </div>

                    {/* Favorite Star Button */}
                    {activeTab !== 'trash' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(doc); }}
                        className={`p-1 rounded-lg transition ${doc.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400 opacity-0 group-hover:opacity-100'}`}
                      >
                        ★
                      </button>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                      {activeTab === 'trash' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestore(doc); }}
                            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold"
                            title={t('drive_restore')}
                          >
                            {t('drive_restore')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePermanentDelete(doc); }}
                            className="px-2 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg text-xs font-semibold"
                            title={t('drive_perm_delete')}
                          >
                            {t('drive_perm_delete')}
                          </button>
                        </>
                      ) : (
                        <>
                          {!doc.isFolder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition"
                              title={t('drive_download')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-4.5-4.5m4.5 4.5l4.5-4.5m-4.5 4.5V3" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenameTarget(doc); setRenameValue(doc.name); }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                            title={t('drive_rename')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSoftDelete(doc); }}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title={t('drive_delete')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{t('drive_col_name')}</th>
                    <th className="py-3 px-4">{t('drive_col_size')}</th>
                    <th className="py-3 px-4">{t('drive_col_date')}</th>
                    <th className="py-3 px-4 text-right">{t('drive_col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      onDoubleClick={() => doc.isFolder ? handleOpenFolder(doc) : handlePreview(doc)}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                            {getFileIcon(doc)}
                          </div>
                          <span className="font-semibold text-slate-200 hover:text-indigo-400 transition" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{doc.isFolder ? t('drive_folder') : formatSize(doc.sizeBytes)}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'trash' ? (
                            <>
                              <button
                                onClick={() => handleRestore(doc)}
                                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-semibold"
                              >
                                {t('drive_restore')}
                              </button>
                              <button
                                onClick={() => handlePermanentDelete(doc)}
                                className="px-2.5 py-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg text-xs font-semibold"
                              >
                                {t('drive_perm_delete')}
                              </button>
                            </>
                          ) : (
                            <>
                              {!doc.isFolder && (
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-lg transition"
                                  title={t('drive_download')}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-4.5-4.5m4.5 4.5l4.5-4.5m-4.5 4.5V3" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => { setRenameTarget(doc); setRenameValue(doc.name); }}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition"
                                title={t('drive_rename')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleSoftDelete(doc)}
                                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                                title={t('drive_delete')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-100 mb-4">{t('drive_modal_create_folder')}</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={t('drive_modal_folder_placeholder')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsFolderModalOpen(false); setNewFolderName(''); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
                >
                  {t('drive_btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {t('drive_create_folder')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-slate-100 mb-4">{t('drive_modal_rename')}</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRenameTarget(null); setRenameValue(''); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition"
                >
                  {t('drive_btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
                >
                  {t('drive_btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-100">{previewDoc.name}</span>
              <span className="text-xs text-slate-400 font-medium">({formatSize(previewDoc.sizeBytes)})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(previewDoc)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                {t('drive_download')}
              </button>
              <button
                onClick={() => { setPreviewDoc(null); setPreviewUrl(''); }}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center p-4">
            {previewDoc.contentType?.startsWith('image/') ? (
              <img src={previewUrl} alt={previewDoc.name} className="max-h-full max-w-full object-contain rounded-xl shadow-2xl" />
            ) : previewDoc.contentType?.startsWith('video/') ? (
              <video src={previewUrl} controls className="max-h-full max-w-full rounded-xl" />
            ) : previewDoc.contentType?.startsWith('audio/') ? (
              <audio src={previewUrl} controls className="w-full max-w-md" />
            ) : previewDoc.contentType?.includes('pdf') ? (
              <iframe src={previewUrl} className="w-full h-full rounded-xl" title="PDF Preview" />
            ) : (
              <div className="text-center p-8">
                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
                </svg>
                <p className="text-slate-300 font-semibold mb-2">{t('drive_preview_unsupported')}</p>
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 transition"
                >
                  {t('drive_preview_download_btn')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Popup */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in text-center">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 ${deleteConfirmTarget.isPermanent ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'}`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-100 mb-2">
              {deleteConfirmTarget.isPermanent ? t('drive_perm_delete') : t('drive_delete')}
            </h3>

            <p className="text-sm text-slate-300 mb-2">
              Xác nhận xóa tài liệu <span className="font-bold text-indigo-400">"{deleteConfirmTarget.doc.name}"</span>?
            </p>

            {deleteConfirmTarget.isPermanent && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 mb-4">
                ⚠️ Hành động này sẽ xóa vĩnh viễn file khỏi bộ nhớ đám mây và không thể khôi phục!
              </p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                {t('drive_btn_cancel')}
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className={`px-5 py-2.5 text-white rounded-xl text-sm font-semibold transition shadow-lg ${deleteConfirmTarget.isPermanent ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'}`}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
