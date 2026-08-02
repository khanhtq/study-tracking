import React from 'react';
import { useUpload } from '../context/UploadContext';
import { useLanguage } from '../context/LanguageContext';

export default function UploadProgressPopup() {
  const { uploadState, closePopup, toggleMinimize } = useUpload();
  const { t } = useLanguage();

  if (!uploadState || !uploadState.isVisible) return null;

  const formatText = (template, params = {}) => {
    let result = template || '';
    Object.keys(params).forEach((key) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
    });
    return result;
  };

  const isCompleted = uploadState.status === 'success';
  const isError = uploadState.status === 'error';
  const isUploading = uploadState.status === 'uploading';

  // Minimized Compact Mode
  if (uploadState.isMinimized) {
    return (
      <div 
        onClick={toggleMinimize}
        className="fixed bottom-5 right-5 z-[9999] bg-slate-900/95 backdrop-blur border border-slate-700/80 shadow-xl rounded-full px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-slate-500 transition-all text-xs text-slate-200"
      >
        <span className="font-semibold">{t('upload_popup_title')}</span>
        <span className="font-mono text-indigo-400 font-bold">{uploadState.progress}%</span>
        {isUploading && (
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] bg-slate-900/95 backdrop-blur border border-slate-700/80 shadow-2xl rounded-xl p-4 text-slate-100 min-w-[320px] max-w-[380px] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
        <h4 className="text-sm font-semibold text-slate-200">
          {t('upload_popup_title')}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMinimize}
            className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded text-xs transition-colors"
            title="Thu nhỏ"
          >
            _
          </button>
          {(!isUploading || isCompleted || isError) && (
            <button
              onClick={closePopup}
              className="text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded text-xs transition-colors"
              title="Đóng"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        {/* File Name & Counter */}
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-slate-300 truncate max-w-[200px]" title={uploadState.currentFileName}>
            {uploadState.currentFileName || t('uploading_file')}
          </span>
          <span className="text-slate-400 font-mono text-[11px]">
            {formatText(t('upload_file_count'), {
              current: uploadState.currentIndex || 1,
              total: uploadState.totalCount || 1,
            })}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-emerald-500'
                  : isError
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>
              {isCompleted
                ? t('upload_completed')
                : isError
                ? (uploadState.errorMessage || t('upload_failed'))
                : `${t('uploading_file')}...`}
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {uploadState.progress}%
            </span>
          </div>
        </div>

        {/* Warning Callout Box */}
        {isUploading && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-300 leading-relaxed">
            {t('upload_popup_warning')}
          </div>
        )}
      </div>
    </div>
  );
}
