// Hook para gestión del reproductor de música con cola automática
import { useState, useRef, useEffect, useCallback } from "react";
import { fetchAndDecryptSong, revokeAudioUrl } from "../services/cryptoService";
import { getSongKey, updateUserTastes } from "../services/awsService";
import { generateAutoQueue, addToPlayHistory } from "../services/recommendationService";

export function useMusicPlayer(songs = [], userTastes = {}) {
  const audioRef = useRef(new Audio());
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const [queue, setQueue] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);

  // Cache de URLs desencriptadas para las próximas canciones
  const prefetchCache = useRef(new Map());

  // Limpiar URL al desmontar
  useEffect(() => {
    return () => {
      if (decryptedUrl) {
        revokeAudioUrl(decryptedUrl);
      }
      prefetchCache.current.forEach((url) => revokeAudioUrl(url));
      prefetchCache.current.clear();
    };
  }, []);

  // Pre-descargar canciones
  const prefetchSongs = useCallback(async (songsToPreload) => {
    for (const song of songsToPreload) {
      if (prefetchCache.current.has(song.song_id)) continue;

      try {
        console.log("🔄 Pre-descargando:", song.titulo);
        const s3Key = getSongKey(song);
        const audioUrl = await fetchAndDecryptSong(s3Key);
        prefetchCache.current.set(song.song_id, audioUrl);
        console.log("✅ Pre-descarga completada:", song.titulo);
      } catch (err) {
        console.warn("⚠️ Error en pre-descarga:", song.titulo, err);
      }
    }
  }, []);

  // Pre-descargar las próximas 2 canciones cuando cambia la cola
  useEffect(() => {
    if (queue.length > 0) {
      const songsToPreload = queue.slice(0, 2);
      prefetchSongs(songsToPreload);
    }
  }, [queue, prefetchSongs]);

  // Generar cola automática
  const generateQueue = useCallback((currentSong) => {
    if (!songs || songs.length === 0) return;
    
    const newQueue = generateAutoQueue(songs, userTastes, currentSong, 10);
    setQueue(newQueue);
    console.log("🎵 Cola generada:", newQueue.length, "canciones");
  }, [songs, userTastes]);

  // Reproducir siguiente (declarado antes de usarse en useEffect)
  const playNextRef = useRef(null);

  // Actualizar progreso y manejar fin de canción
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (playNextRef.current) {
        playNextRef.current();
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };

    const handleError = (e) => {
      console.error("Error de audio:", e);
      setError("Error al reproducir el audio");
      setIsPlaying(false);
      setIsLoading(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Reproducir canción
  const playSong = useCallback(async (song, fromQueue = false) => {
    setError(null);
    setIsLoading(true);

    try {
      // Si es la misma canción, solo reproducir
      if (currentSong?.song_id === song.song_id && decryptedUrl) {
        audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      // Limpiar URL anterior
      if (decryptedUrl) {
        revokeAudioUrl(decryptedUrl);
      }

      // Pausar audio actual
      audioRef.current.pause();

      // Verificar si está en cache de prefetch
      let audioUrl = prefetchCache.current.get(song.song_id);
      
      if (audioUrl) {
        console.log("🚀 Usando audio pre-descargado:", song.titulo);
        prefetchCache.current.delete(song.song_id);
      } else {
        // Obtener key de S3 y desencriptar
        const s3Key = getSongKey(song);
        audioUrl = await fetchAndDecryptSong(s3Key);
      }

      // Configurar y reproducir
      audioRef.current.src = audioUrl;
      audioRef.current.volume = volume;
      await audioRef.current.play();

      setDecryptedUrl(audioUrl);
      setCurrentSong(song);
      setIsPlaying(true);

      // Agregar al historial
      addToPlayHistory(song);
      setPlayHistory((prev) => [song, ...prev].slice(0, 20));

      // Actualizar gustos del usuario
      await updateUserTastes(song.genero);

      // Generar nueva cola si no viene de la cola
      if (!fromQueue) {
        generateQueue(song);
      }

    } catch (err) {
      console.error("Error al reproducir:", err);
      setError(err.message || "Error al reproducir la canción");
    } finally {
      setIsLoading(false);
    }
  }, [currentSong, decryptedUrl, volume, generateQueue]);

  // Reproducir siguiente
  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      return;
    }
    
    const nextSong = queue[0];
    const newQueue = queue.slice(1);
    setQueue(newQueue);
    
    playSong(nextSong, true);
  }, [queue, playSong]);

  // Actualizar ref para el evento ended
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Reproducir anterior
  const playPrevious = useCallback(() => {
    if (playHistory.length < 2) return;
    
    const previousSong = playHistory[1];
    playSong(previousSong, true);
  }, [playHistory, playSong]);

  // Reproducir desde la cola
  const playFromQueue = useCallback((index) => {
    const song = queue[index];
    if (!song) return;
    const newQueue = queue.slice(index + 1);
    setQueue(newQueue);
    playSong(song, true);
  }, [queue, playSong]);

  // Pausar
  const pause = useCallback(() => {
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentSong) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentSong, pause]);

  // Seek
  const seek = useCallback((percentage) => {
    const time = (percentage / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    setProgress(percentage);
  }, [duration]);

  // Cambiar volumen
  const changeVolume = useCallback((newVolume) => {
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  }, []);

  // Formatear tiempo
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    currentSong,
    isPlaying,
    isLoading,
    progress,
    duration,
    currentTime,
    volume,
    error,
    queue,
    playHistory,
    playSong,
    pause,
    togglePlay,
    playNext,
    playPrevious,
    playFromQueue,
    seek,
    changeVolume,
    formatTime,
  };
}
