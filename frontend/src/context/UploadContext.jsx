import React, { createContext, useContext, useState, useEffect } from 'react';

const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
  const [uploadState, setUploadState] = useState({
    isVisible: false,
    isUploading: false,
    isMinimized: false,
    currentFileName: '',
    currentIndex: 0,
    totalCount: 0,
    progress: 0,
    status: 'idle', // 'idle' | 'uploading' | 'success' | 'error'
    errorMessage: '',
  });

  // Warn user if they try to close or refresh the tab while uploading
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploadState.isUploading) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    if (uploadState.isUploading) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploadState.isUploading]);

  const startUploadBatch = (files) => {
    const fileList = Array.from(files || []);
    const firstFile = fileList[0];
    setUploadState({
      isVisible: true,
      isUploading: true,
      isMinimized: false,
      currentFileName: firstFile ? firstFile.name : '',
      currentIndex: 1,
      totalCount: fileList.length || 1,
      progress: 0,
      status: 'uploading',
      errorMessage: '',
    });
  };

  const updateProgress = (index, total, fileName, percent) => {
    setUploadState((prev) => ({
      ...prev,
      isVisible: true,
      isUploading: true,
      currentIndex: index,
      totalCount: total,
      currentFileName: fileName || prev.currentFileName,
      progress: Math.min(100, Math.max(0, percent)),
      status: 'uploading',
    }));
  };

  const finishUploadBatch = (success = true, errorMsg = '') => {
    setUploadState((prev) => ({
      ...prev,
      isUploading: false,
      progress: success ? 100 : prev.progress,
      status: success ? 'success' : 'error',
      errorMessage: errorMsg,
    }));
  };

  const closePopup = () => {
    setUploadState((prev) => ({
      ...prev,
      isVisible: false,
      isUploading: false,
      status: 'idle',
    }));
  };

  const toggleMinimize = () => {
    setUploadState((prev) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  return (
    <UploadContext.Provider
      value={{
        uploadState,
        startUploadBatch,
        updateProgress,
        finishUploadBatch,
        closePopup,
        toggleMinimize,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => useContext(UploadContext);
