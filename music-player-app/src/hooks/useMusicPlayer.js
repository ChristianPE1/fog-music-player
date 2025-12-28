// Hook para gestión del reproductor de música con cola automática - FOG COMPUTING
import { useState, useRef, useEffect, useCallback } from "react";
import { fetchAndDecryptSong, revokeAudioUrl } from "../services/cryptoService";
import { getSongKey, updateUserTastes, syncPreferencesToDynamo } from "../services/awsService";
import { generateAutoQueue, addToPlayHistory } from "../services/recommendationService";
import { prefetchSongs, trackPlayTime, onSWMessage, requestDynamoSync, notifyAppClosing } from "../services/swService";

// Constantes
const QUEUE_SIZE = 10;
const PREFETCH_COUNT = 3;
const SYNC_INTERVAL_MS = 20 * 60 * 1000; // 20 minutos

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
  const [prefetchStatus, setPrefetchStatus] = useState({ current: 0, total: 0 });

  // Refs para tracking de tiempo
  const playStartTimeRef = useRef(null);
  const lastReportedTimeRef = useRef(0);
  const syncIntervalRef = useRef(null);

  // Cache de URLs desencriptadas para las próximas canciones
  const prefetchCache = useRef(new Map());

  // ============================================
  // TRACKING DE TIEMPO DE REPRODUCCIÓN
  // ============================================

  const reportPlayTime = useCallback(() => {
    if (!currentSong || !playStartTimeRef.current) return;

    const currentAudioTime = audioRef.current.currentTime;
    const elapsedSinceLastReport = Math.floor(currentAudioTime - lastReportedTimeRef.current);

    if (elapsedSinceLastReport > 0) {
      console.log(`⏱️ [Player] Reportando ${elapsedSinceLastReport}s de reproducción`);
      trackPlayTime(
        currentSong.song_id,
        elapsedSinceLastReport,
        currentSong.artista,
        currentSong.genero
      );
      lastReportedTimeRef.current = currentAudioTime;
    }
  }, [currentSong]);

  // Reportar tiempo cada 10 segundos mientras reproduce
  useEffect(() => {
    if (!isPlaying || !currentSong) return;

    const interval = setInterval(() => {
      reportPlayTime();
    }, 10000); // Cada 10 segundos

    return () => clearInterval(interval);
  }, [isPlaying, currentSong, reportPlayTime]);

  // ============================================
  // SINCRONIZACIÓN CON DYNAMODB CADA 20 MIN
  // ============================================

  useEffect(() => {
    console.log("⏰ [Player] Iniciando intervalo de sincronización cada 20 minutos");
    
    syncIntervalRef.current = setInterval(() => {
      console.log("☁️ [Player] Sincronización programada con DynamoDB (20 min)");
      requestDynamoSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // ============================================
  // GUARDAR AL CERRAR LA APLICACIÓN
  // ============================================

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      console.log("🚪 [Player] Usuario cerrando la aplicación...");
      
      // Reportar último tiempo de reproducción
      reportPlayTime();
      
      // Notificar al SW para guardar preferencias
      notifyAppClosing();
      
      // Para navegadores que lo soporten, sincronizar con DynamoDB
      requestDynamoSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("�️ [Player] App en background - guardando estado...");
        reportPlayTime();
        requestDynamoSync();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reportPlayTime]);

  // ============================================
  // ESCUCHAR MENSAJES DEL SERVICE WORKER
  // ============================================

  useEffect(() => {
    // Escuchar progreso de pre-descarga
    const removePrefetchHandler = onSWMessage("PREFETCH_PROGRESS", (payload) => {
      console.log(`📥 [Player] Progreso pre-descarga: ${payload.current}/${payload.total} - ${payload.song}`);
      setPrefetchStatus(payload);
    });

    // Escuchar solicitud de sync a DynamoDB
    const removeSyncHandler = onSWMessage("SYNC_PREFERENCES", async (payload) => {
      console.log("☁️ [Player] Sincronizando preferencias con DynamoDB...");
      try {
        await syncPreferencesToDynamo(payload.preferences, payload.topArtists, payload.topGenres);
        console.log("✅ [Player] Preferencias sincronizadas con DynamoDB");
      } catch (error) {
        console.error("❌ [Player] Error sincronizando con DynamoDB:", error);
      }
    });

    // Escuchar solicitud de pre-descarga del SW (el SW no tiene credenciales Cognito)
    const removePrefetchRequestHandler = onSWMessage("PREFETCH_REQUEST", async (payload) => {
      console.log(`🔄 [Player] SW solicita pre-descarga de ${payload.songs.length} canciones`);
      
      for (let i = 0; i < payload.songs.length; i++) {
        const song = payload.songs[i];
        
        // Verificar si ya está en el cache local
        if (prefetchCache.current.has(song.song_id)) {
          console.log(`⏭️ [Player] Ya pre-descargada: ${song.titulo}`);
          continue;
        }

        try {
          console.log(`📥 [Player] Pre-descargando [${i+1}/${payload.songs.length}]: ${song.titulo}`);
          const s3Key = `songs/${song.song_id.substring(0, 12)}.enc`;
          const audioUrl = await fetchAndDecryptSong(s3Key);
          prefetchCache.current.set(song.song_id, audioUrl);
          
          console.log(`✅ [Player] Pre-descarga completada: ${song.titulo}`);
          
          // Actualizar estado de pre-descarga
          setPrefetchStatus({
            current: i + 1,
            total: payload.songs.length,
            song: song.titulo,
            status: "completed"
          });
        } catch (err) {
          console.warn(`⚠️ [Player] Error pre-descargando ${song.titulo}:`, err);
        }
      }
      
      console.log(`🎉 [Player] Pre-descarga completada: ${payload.songs.length} canciones listas`);
    });

    return () => {
      removePrefetchHandler();
      removeSyncHandler();
      removePrefetchRequestHandler();
    };
  }, []);

  // ============================================
  // LIMPIEZA AL DESMONTAR
  // ============================================

  useEffect(() => {
    return () => {
      if (decryptedUrl) {
        revokeAudioUrl(decryptedUrl);
      }
      prefetchCache.current.forEach((url) => revokeAudioUrl(url));
      prefetchCache.current.clear();
    };
  }, []);

  // ============================================
  // PRE-DESCARGA DE CANCIONES (PRIMERAS 3)
  // ============================================

  const triggerPrefetch = useCallback((queueSongs) => {
    if (queueSongs.length === 0) return;

    const songsToPreload = queueSongs.slice(0, PREFETCH_COUNT);
    console.log(`🔄 [Player] Solicitando pre-descarga de ${songsToPreload.length} canciones`);
    
    // Enviar al Service Worker para pre-descarga con desencriptación
    prefetchSongs(songsToPreload, PREFETCH_COUNT);
  }, []);

  // Pre-descargar las próximas 3 canciones cuando cambia la cola
  useEffect(() => {
    if (queue.length > 0) {
      triggerPrefetch(queue);
    }
  }, [queue, triggerPrefetch]);

  // ============================================
  // GENERAR COLA AUTOMÁTICA (10 CANCIONES)
  // ============================================

  const generateQueue = useCallback((currentSong) => {
    if (!songs || songs.length === 0) return;
    
    const newQueue = generateAutoQueue(songs, userTastes, currentSong, QUEUE_SIZE);
    setQueue(newQueue);
    console.log(`🎵 [Player] Cola generada: ${newQueue.length} canciones (mostrando ${QUEUE_SIZE})`);
    
    // Log de las canciones en cola
    newQueue.forEach((song, i) => {
      console.log(`   ${i + 1}. ${song.titulo} - ${song.artista} (${song.genero})`);
    });
  }, [songs, userTastes]);

  // Reproducir siguiente (declarado antes de usarse en useEffect)
  const playNextRef = useRef(null);

  // ============================================
  // EVENTOS DE AUDIO
  // ============================================

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
      // Reportar tiempo final antes de cambiar de canción
      reportPlayTime();
      
      if (playNextRef.current) {
        playNextRef.current();
      } else {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };

    const handleError = (e) => {
      console.error("❌ [Player] Error de audio:", e);
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
  }, [reportPlayTime]);

  // ============================================
  // REPRODUCIR CANCIÓN
  // ============================================

  const playSong = useCallback(async (song, fromQueue = false) => {
    setError(null);
    setIsLoading(true);

    // Reportar tiempo de la canción anterior
    reportPlayTime();

    try {
      // Si es la misma canción, solo reproducir
      if (currentSong?.song_id === song.song_id && decryptedUrl) {
        audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        playStartTimeRef.current = Date.now();
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
        console.log("🚀 [Player] Usando audio pre-descargado:", song.titulo);
        prefetchCache.current.delete(song.song_id);
      } else {
        // Obtener key de S3 y desencriptar
        console.log("📥 [Player] Descargando y desencriptando:", song.titulo);
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
      
      // Reset tracking de tiempo
      playStartTimeRef.current = Date.now();
      lastReportedTimeRef.current = 0;

      // Agregar al historial
      addToPlayHistory(song);
      setPlayHistory((prev) => [song, ...prev].slice(0, 20));

      // Actualizar gustos del usuario
      await updateUserTastes(song.genero);

      // Generar nueva cola si no viene de la cola
      if (!fromQueue) {
        generateQueue(song);
      }

      console.log(`▶️ [Player] Reproduciendo: ${song.titulo} - ${song.artista}`);

    } catch (err) {
      console.error("❌ [Player] Error al reproducir:", err);
      setError(err.message || "Error al reproducir la canción");
    } finally {
      setIsLoading(false);
    }
  }, [currentSong, decryptedUrl, volume, generateQueue, reportPlayTime]);

  // ============================================
  // REPRODUCIR SIGUIENTE (DESCARGA PROGRESIVA)
  // ============================================

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
    
    console.log(`⏭️ [Player] Siguiente canción: ${nextSong.titulo}`);
    console.log(`   📋 Quedan ${newQueue.length} canciones en cola`);
    
    playSong(nextSong, true);
    
    // Las siguientes canciones se pre-descargan automáticamente
    // cuando setQueue trigger el useEffect de triggerPrefetch
  }, [queue, playSong]);

  // Actualizar ref para el evento ended
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // ============================================
  // REPRODUCIR ANTERIOR
  // ============================================

  const playPrevious = useCallback(() => {
    if (playHistory.length < 2) return;
    
    const previousSong = playHistory[1];
    console.log(`⏮️ [Player] Canción anterior: ${previousSong.titulo}`);
    playSong(previousSong, true);
  }, [playHistory, playSong]);

  // ============================================
  // REPRODUCIR DESDE LA COLA
  // ============================================

  const playFromQueue = useCallback((index) => {
    const song = queue[index];
    if (!song) return;
    
    console.log(`🎯 [Player] Seleccionada de cola: ${song.titulo} (posición ${index + 1})`);
    
    const newQueue = queue.slice(index + 1);
    setQueue(newQueue);
    playSong(song, true);
  }, [queue, playSong]);

  // ============================================
  // CONTROLES DE REPRODUCCIÓN
  // ============================================

  const pause = useCallback(() => {
    audioRef.current.pause();
    setIsPlaying(false);
    reportPlayTime(); // Reportar tiempo al pausar
    console.log("⏸️ [Player] Pausado");
  }, [reportPlayTime]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else if (currentSong) {
      audioRef.current.play();
      setIsPlaying(true);
      playStartTimeRef.current = Date.now();
      console.log("▶️ [Player] Reanudado");
    }
  }, [isPlaying, currentSong, pause]);

  const seek = useCallback((percentage) => {
    const time = (percentage / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    setProgress(percentage);
    lastReportedTimeRef.current = time; // Actualizar referencia de tiempo
  }, [duration]);

  const changeVolume = useCallback((newVolume) => {
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
  }, []);

  // ============================================
  // UTILIDADES
  // ============================================

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
    prefetchStatus,
    playSong,
    pause,
    togglePlay,
    playNext,
    playPrevious,
    playFromQueue,
    seek,
    changeVolume,
    formatTime,
    // Nuevas funciones expuestas
    queueSize: QUEUE_SIZE,
    prefetchCount: PREFETCH_COUNT,
  };
}
