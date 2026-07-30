import React, { useState } from 'react';
import { useMusic } from '../../context/MusicContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Disc, ListMusic, Maximize2, Minimize2, Loader2, Radio, Crown, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumUpgradeModal from '../PremiumUpgradeModal';

export default function MusicWidget() {
  const { user } = useAuth();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    currentTime,
    duration,
    seekTo,
    isLoadingStream,
    isMinimized,
    setIsMinimized,
    setIsModalOpen,
    useEmbedFallback,
    iframeRef,
  } = useMusic();
  const { t } = useLanguage();

  const handleAction = (callback) => {
    if (!user?.isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }
    if (callback) callback();
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Compact Floating Pill */
          <motion.div
            key="minimized"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="flex items-center gap-3 p-2.5 pl-3.5 bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl rounded-full shadow-2xl hover:border-indigo-500/50 transition-all cursor-pointer group"
            onClick={() => setIsMinimized(false)}
          >
            {/* Spinning Disc or Thumbnail */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
              {currentTrack?.thumbnailUrl ? (
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
                />
              ) : (
                <Disc className={`w-4 h-4 text-indigo-400 ${isPlaying ? 'animate-spin-slow' : ''}`} />
              )}
            </div>

            {/* Track Info Preview */}
            <div className="flex flex-col max-w-[140px]">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {currentTrack ? currentTrack.title : t('music_title')}
              </span>
              <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                {isPlaying ? (
                  <span className="flex items-end gap-0.5 h-2.5">
                    <span className="w-0.5 bg-emerald-400 animate-pulse h-full"></span>
                    <span className="w-0.5 bg-emerald-400 animate-pulse h-2/3 delay-75"></span>
                    <span className="w-0.5 bg-emerald-400 animate-pulse h-4/5 delay-150"></span>
                  </span>
                ) : (
                  <Radio className="w-3 h-3 text-slate-400" />
                )}
                {isPlaying ? t('music_playing_now') : t('music_click_to_open')}
              </span>
            </div>

            {/* Quick Play/Pause */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(togglePlay);
              }}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-md active:scale-95"
            >
              {isLoadingStream ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(() => setIsMinimized(false));
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          /* Expanded Full Floating Controls Bar */
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-80 md:w-96 p-4 bg-slate-900/95 border border-slate-800/90 backdrop-blur-2xl rounded-2xl shadow-2xl flex flex-col gap-3 relative overflow-hidden"
          >
            {/* Header / Minimize */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <Disc className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin-slow' : ''}`} />
                {t('music_title')}
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[9px] font-bold flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  VIP
                </span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAction(() => setIsModalOpen(true))}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
                  title={t('music_tab_playlists')}
                >
                  <ListMusic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                  title="Thu gọn"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Track Info Card */}
            <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                {currentTrack?.thumbnailUrl ? (
                  <img
                    src={currentTrack.thumbnailUrl}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-950/50">
                    <Disc className="w-6 h-6 text-indigo-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-100 truncate">
                  {currentTrack ? currentTrack.title : t('music_select_track')}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {currentTrack ? currentTrack.uploader : t('music_lofi_beats')}
                </p>
              </div>
            </div>

            {/* Seekbar */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleAction(() => seekTo(Number(e.target.value)))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls & Volume */}
            <div className="flex items-center justify-between pt-1">
              {/* Volume Slider */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(toggleMute)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(prevTrack)}
                  className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleAction(togglePlay)}
                  className="p-3 bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  {isLoadingStream ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => handleAction(nextTrack)}
                  className="p-2 text-slate-400 hover:text-slate-100 transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden YouTube Embed Iframe Fallback */}
      {useEmbedFallback && currentTrack && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1&origin=${window.location.origin}&controls=0&modestbranding=1&rel=0&showinfo=0`}
          allow="autoplay; encrypted-media"
          style={{
            position: 'fixed',
            width: '1px',
            height: '1px',
            bottom: '0',
            left: '0',
            opacity: 0,
            pointerEvents: 'none',
            border: 'none',
          }}
          title="YouTube Music Player Fallback"
        />
      )}

      <PremiumUpgradeModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        featureName="Trình phát nhạc Lofi Không Giới Hạn"
      />
    </div>
  );
}
