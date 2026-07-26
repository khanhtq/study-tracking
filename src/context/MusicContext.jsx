import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getSuggestedPlaylists, searchMusicTracks, getMusicStreamUrl } from '../api';

const MusicContext = createContext(null);

export const MusicProvider = ({ children }) => {
  const { token, user } = useAuth();
  const audioRef = useRef(new Audio());
  const iframeRef = useRef(null);
  const streamRequestRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('study_music_volume');
    return saved !== null ? parseFloat(saved) : 0.7;
  });
  const [isMuted, setIsMuted] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [audioError, setAudioError] = useState(null);

  const [isMinimized, setIsMinimized] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Embed fallback: when direct stream fails, use hidden YouTube iframe
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  // Refs for state access without stale closure issues
  const currentTrackRef = useRef(currentTrack);
  const playlistRef = useRef(playlist);
  const playlistsRef = useRef(playlists);
  const playTrackRef = useRef(null);
  const handleAutoNextRef = useRef(null);
  const hasTriggeredEndRef = useRef(false);
  const trackStartTimeRef = useRef(0);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    playlistRef.current = playlist;
    playlistsRef.current = playlists;
  }, [currentTrack, playlist, playlists]);

  useEffect(() => {
    if (token && !user?.isGuest) return;

    streamRequestRef.current?.abort();
    const audio = audioRef.current;
    audio.pause();
    try {
      audio.removeAttribute('src');
      audio.load();
    } catch (e) { /* ignore */ }

    setIsPlaying(false);
    setCurrentTrack(null);
    setPlaylist([]);
    setCurrentIndex(-1);
    setCurrentTime(0);
    setDuration(0);
    setIsLoadingStream(false);
    setUseEmbedFallback(false);
    setIsModalOpen(false);
    setIsMinimized(true);
  }, [token, user?.isGuest]);

  // Load Suggested Playlists on Mount
  useEffect(() => {
    const fetchPlaylists = async () => {
      setIsLoadingPlaylists(true);
      try {
        const data = await getSuggestedPlaylists();
        setPlaylists(data || []);
      } catch (err) {
        console.error('Failed to load suggested playlists:', err);
      } finally {
        setIsLoadingPlaylists(false);
      }
    };
    fetchPlaylists();
  }, []);

  // Play a Specific Track
  const playTrack = async (track, newPlaylist = null, index = 0) => {
    if (!track || !track.id) return;

    // Reset track flags & timeline immediately
    hasTriggeredEndRef.current = false;
    trackStartTimeRef.current = Date.now();

    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch (e) { /* ignore */ }
    }

    streamRequestRef.current?.abort();
    const controller = new AbortController();
    streamRequestRef.current = controller;

    setAudioError(null);
    setUseEmbedFallback(false);
    setIsLoadingStream(true);
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.durationSeconds || 0);

    if (newPlaylist) {
      setPlaylist(newPlaylist);
      setCurrentIndex(index);
    }

    try {
      const streamData = await getMusicStreamUrl(track.id, { signal: controller.signal });
      if (streamRequestRef.current !== controller) return;
      const streamUrl = streamData?.streamUrl;

      if (streamUrl) {
        const audio = audioRef.current;
        audio.src = streamUrl;
        audio.volume = isMuted ? 0 : volume;

        await audio.play();
        setIsPlaying(true);
      } else {
        console.info(`No direct stream for ${track.id}, using YouTube embed fallback`);
        if (audioRef.current) {
          audioRef.current.pause();
          try {
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          } catch (e) { /* ignore */ }
        }
        setUseEmbedFallback(true);
        setIsPlaying(true);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching stream:', err);
      if (audioRef.current) {
        audioRef.current.pause();
        try {
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        } catch (e) { /* ignore */ }
      }
      setUseEmbedFallback(true);
      setIsPlaying(true);
    } finally {
      if (streamRequestRef.current === controller) {
        setIsLoadingStream(false);
      }
    }
  };

  playTrackRef.current = playTrack;

  // Helper kiểm tra bài hát khác cả về ID lẫn Tên bài (Title)
  const isDifferentTrack = (candidate, activeTrack) => {
    if (!activeTrack || !candidate) return true;
    if (candidate.id === activeTrack.id) return false;
    if (candidate.title && activeTrack.title) {
      const titleA = candidate.title.trim().toLowerCase();
      const titleB = activeTrack.title.trim().toLowerCase();
      if (titleA === titleB) return false;
    }
    return true;
  };

  // Auto Next Logic: Random track from same topic, excluding current track by ID and Title
  const handleAutoNext = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    const activePlaylist = playlistRef.current;
    const allPlaylists = playlistsRef.current;

    let candidateTracks = [];

    // 1. Same topic candidates from activePlaylist
    if (activePlaylist && activePlaylist.length > 0) {
      candidateTracks = activePlaylist.filter((t) => isDifferentTrack(t, activeTrack));
    }

    // 2. If single track or no candidate, find matching category in preset playlists
    if (candidateTracks.length === 0 && allPlaylists && allPlaylists.length > 0) {
      const matchingPlaylist = allPlaylists.find(
        (pl) => pl.tracks && pl.tracks.some((t) => activeTrack && t.id === activeTrack.id)
      ) || allPlaylists[0];

      if (matchingPlaylist && matchingPlaylist.tracks) {
        candidateTracks = matchingPlaylist.tracks.filter((t) => isDifferentTrack(t, activeTrack));
      }
    }

    // 3. Fallback to any preset track
    if (candidateTracks.length === 0 && allPlaylists && allPlaylists.length > 0) {
      const allTracks = allPlaylists.flatMap((pl) => pl.tracks || []);
      candidateTracks = allTracks.filter((t) => isDifferentTrack(t, activeTrack));
    }

    if (candidateTracks.length === 0) return;

    // Random track from candidateTracks
    const randomTrack = candidateTracks[Math.floor(Math.random() * candidateTracks.length)];
    const targetPlaylist = activePlaylist && activePlaylist.length > 0 ? activePlaylist : [randomTrack];
    const newIdx = targetPlaylist.findIndex((t) => t.id === randomTrack.id);

    if (playTrackRef.current) {
      playTrackRef.current(randomTrack, targetPlaylist, newIdx >= 0 ? newIdx : 0);
    }
  }, []);

  handleAutoNextRef.current = handleAutoNext;

  // Listen to YouTube Iframe Embed postMessage events (State 0 = ENDED)
  useEffect(() => {
    const handleWindowMessage = (event) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { return; }
        }
        if (!data || typeof data !== 'object') return;

        const playerState = data?.info?.playerState ?? data?.info ?? data?.playerState ?? data?.data;
        const isEnded = playerState === 0 || playerState === '0';

        if (isEnded) {
          const elapsedSinceStart = Date.now() - trackStartTimeRef.current;
          if (!hasTriggeredEndRef.current && elapsedSinceStart > 3000) {
            hasTriggeredEndRef.current = true;
            console.log('YouTube iframe ENDED (state 0), triggering handleAutoNext');
            handleAutoNextRef.current?.();
          }
        }
      } catch (e) {
        /* Ignore non-JSON messages */
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  // UI Clock Timer for YouTube Embed Fallback mode & end trigger
  useEffect(() => {
    if (!useEmbedFallback || !isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      setCurrentTime((time) => {
        const nextTime = time + 0.25;
        const elapsedSinceStart = Date.now() - trackStartTimeRef.current;
        if (duration > 0 && nextTime >= duration) {
          window.clearInterval(intervalId);
          if (!hasTriggeredEndRef.current && elapsedSinceStart > 3000) {
            hasTriggeredEndRef.current = true;
            console.log('Embed timer reached end of track duration, triggering handleAutoNext');
            handleAutoNextRef.current?.();
          }
          return duration;
        }
        return nextTime;
      });
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [useEmbedFallback, isPlaying, duration]);

  // Initialize & Listen to Audio Element Events (HTML5 Audio)
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : volume;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Chuyển bài tự động khi audio chạy gần sát điểm kết thúc (áp dụng sau khi phát > 5s)
      const elapsedSinceStart = Date.now() - trackStartTimeRef.current;
      if (
        !hasTriggeredEndRef.current &&
        audio.currentTime > 5 &&
        audio.duration > 0 &&
        audio.currentTime >= audio.duration - 1.0 &&
        elapsedSinceStart > 3000
      ) {
        hasTriggeredEndRef.current = true;
        console.log('HTML5 Audio reached end threshold, triggering handleAutoNext');
        handleAutoNextRef.current?.();
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);

    const handleEnded = () => {
      const elapsedSinceStart = Date.now() - trackStartTimeRef.current;
      if (!hasTriggeredEndRef.current && elapsedSinceStart > 3000) {
        hasTriggeredEndRef.current = true;
        console.log('HTML5 Audio ended event fired, triggering handleAutoNext');
        handleAutoNextRef.current?.();
      }
    };

    const handleError = () => {
      if (!useEmbedFallback && currentTrackRef.current) {
        console.warn('Direct audio stream failed, switching to YouTube embed fallback');
        setUseEmbedFallback(true);
        setAudioError(null);
        setIsPlaying(true);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, isMuted, useEmbedFallback]);

  // Update Volume
  const setVolume = (val) => {
    const newVol = Math.max(0, Math.min(1, val));
    setVolumeState(newVol);
    localStorage.setItem('study_music_volume', newVol.toString());
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVol;
    }
    if (useEmbedFallback && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.round(newVol * 100)] }),
          '*'
        );
      } catch (e) { /* ignore */ }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      if (useEmbedFallback && iframeRef.current) {
        try {
          const func = next ? 'mute' : 'unMute';
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func, args: [] }),
            '*'
          );
        } catch (e) { /* ignore */ }
      }
      return next;
    });
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!currentTrack) {
      if (playlists.length > 0 && playlists[0].tracks.length > 0) {
        playTrack(playlists[0].tracks[0], playlists[0].tracks, 0);
      }
      return;
    }

    if (useEmbedFallback && iframeRef.current) {
      try {
        const func = isPlaying ? 'pauseVideo' : 'playVideo';
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args: [] }),
          '*'
        );
        setIsPlaying(!isPlaying);
      } catch (e) {
        console.warn('Embed control failed:', e);
      }
      return;
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  // Next Track
  const nextTrack = () => {
    handleAutoNext();
  };

  // Previous Track
  const prevTrack = () => {
    if (playlist.length === 0) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    playTrack(playlist[prevIdx], playlist, prevIdx);
  };

  // Seek
  const seekTo = (seconds) => {
    if (useEmbedFallback && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
          '*'
        );
        setCurrentTime(seconds);
      } catch (e) { /* ignore */ }
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  // Play an entire Playlist
  const playPlaylist = (pl) => {
    if (pl && pl.tracks && pl.tracks.length > 0) {
      playTrack(pl.tracks[0], pl.tracks, 0);
    }
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        currentTrack,
        playlist,
        currentIndex,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        duration,
        currentTime,
        seekTo,
        isLoadingStream,
        audioError,
        playlists,
        isLoadingPlaylists,
        playTrack,
        playPlaylist,
        togglePlay,
        nextTrack,
        prevTrack,
        isMinimized,
        setIsMinimized,
        isModalOpen,
        setIsModalOpen,
        useEmbedFallback,
        iframeRef,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => useContext(MusicContext);
