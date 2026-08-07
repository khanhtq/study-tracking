import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PresenceDetectionEngine } from '../utils/presenceDetector';
import { PresenceBatchService } from '../services/presenceBatcher';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CameraPresenceTracker({
  activeSession,
  enabled,
  onToggleEnabled,
  onAutoPause,
  isMandatory = false,
}) {
  const { t } = useLanguage();
  const [isPresent, setIsPresent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const engineRef = useRef(null);
  const batcherRef = useRef(null);

  useEffect(() => {
    if (!activeSession || (!enabled && !isMandatory)) {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (batcherRef.current) {
        batcherRef.current.stop();
        batcherRef.current = null;
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCameraError(null);

    // Initialize Batcher
    batcherRef.current = new PresenceBatchService(activeSession.id);

    // Initialize Engine
    engineRef.current = new PresenceDetectionEngine({
      onCheckResult: (result) => {
        setIsLoading(false);
        setIsPresent(result.present);
        if (batcherRef.current) {
          batcherRef.current.addCheck(result);
        }
      },
      onAbsenceTimeout: (durationMs) => {
        if (onAutoPause) {
          onAutoPause(durationMs);
        }
      },
      onError: (err) => {
        setIsLoading(false);
        setCameraError(t('camera_access_denied'));
      },
    });

    engineRef.current.start();

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      if (batcherRef.current) {
        batcherRef.current.stop();
        batcherRef.current = null;
      }
    };
  }, [activeSession?.id, enabled, isMandatory]);

  return (
    <div className="mt-3 flex flex-col items-center justify-center">
      {/* Toggle button */}
      {!isMandatory && (
        <button
          type="button"
          onClick={() => onToggleEnabled(!enabled)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 backdrop-blur-md border ${
            enabled
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300'
          }`}
        >
          {enabled ? (
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <CameraOff className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>
            {enabled
              ? t('camera_presence_guard_on')
              : t('camera_presence_guard_off')}
          </span>
        </button>
      )}

      {/* Real-time status indicator pill (Only show when activeSession is running) */}
      <AnimatePresence>
        {Boolean(activeSession) && (enabled || isMandatory) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2"
          >
            {cameraError ? (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full backdrop-blur-md">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{cameraError}</span>
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>{t('camera_loading')}</span>
              </div>
            ) : (
              <div
                className={`flex items-center gap-2 text-xs font-medium px-3.5 py-1 rounded-full backdrop-blur-md border transition-colors duration-300 ${
                  isPresent
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPresent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
                <span>{isPresent ? t('status_present') : t('status_absent')}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
