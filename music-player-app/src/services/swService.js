// Servicio de Service Worker - FOG COMPUTING
// Maneja el registro y comunicación con el SW para aprendizaje local

let swRegistration = null;
let messageHandlers = new Map();

// ============================================
// Registro del Service Worker
// ============================================

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("⚠️ Service Workers no soportados en este navegador");
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW-Service] Service Worker registrado:", swRegistration.scope);

    // Escuchar actualizaciones
    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration.installing;
      console.log("🔄 [SW-Service] Nueva versión del Service Worker encontrada");

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("📢 [SW-Service] Nueva versión disponible, recarga para actualizar");
        }
      });
    });

    // Configurar escucha de mensajes del SW
    setupMessageListener();

    return swRegistration;
  } catch (error) {
    console.error("[SW-Service] Error al registrar Service Worker:", error);
    return null;
  }
}

// ============================================
// Escuchar mensajes del Service Worker
// ============================================

function setupMessageListener() {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const { type, payload } = event.data;
    console.log(`[SW-Service] Mensaje del SW: ${type}`);
    
    // Llamar handlers registrados
    const handlers = messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(payload));
  });
}

export function onSWMessage(type, handler) {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, []);
  }
  messageHandlers.get(type).push(handler);
  
  // Retornar función para remover handler
  return () => {
    const handlers = messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) handlers.splice(index, 1);
  };
}

// ============================================
// Comunicación con el Service Worker
// ============================================

export function sendMessageToSW(message) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
    return true;
  }
  console.warn("[SW-Service] No hay Service Worker controlador");
  return false;
}

// ============================================
// Pre-descarga de canciones (con desencriptación)
// ============================================

export function prefetchSongs(songs, count = 3) {
  
  // Enviar datos completos de las canciones para pre-descarga
  const songsData = songs.slice(0, count).map(song => ({
    song_id: song.song_id,
    titulo: song.titulo,
    artista: song.artista,
    url: `https://fog-music-media.s3.us-east-1.amazonaws.com/${song.s3_song_key}`
  }));
  
  sendMessageToSW({
    type: "PREFETCH_SONGS",
    payload: { songs: songsData, count },
  });
}

// ============================================
// Tracking de reproducción
// ============================================

export function trackPlayTime(songId, seconds, artist, genre) {
  console.log(` [SW-Service] Reportando tiempo: ${songId} +${seconds}s`);
  sendMessageToSW({
    type: "TRACK_PLAY_TIME",
    payload: { songId, seconds, artist, genre },
  });
}

// ============================================
// Tracking de búsquedas (con artista y género)
// ============================================

export function trackSearch(query, artist = null, genre = null) {
  if (!query || query.trim().length < 2) return;
  
  console.log(`[SW-Service] Reportando búsqueda: "${query}" -> Artista: ${artist}, Género: ${genre}`);
  sendMessageToSW({
    type: "TRACK_SEARCH",
    payload: { query: query.trim(), artist, genre },
  });
}

// ============================================
// Toggle Like de canción
// ============================================

export function toggleLikeSong(songId, artist, genre) {
  console.log(`[SW-Service] Toggle like: ${songId}`);
  sendMessageToSW({
    type: "TOGGLE_LIKE",
    payload: { songId, artist, genre },
  });
}

// ============================================
// Obtener canciones likeadas
// ============================================

export function getLikedSongs() {
  return new Promise((resolve) => {
    const handler = (payload) => {
      resolve(payload.likedSongs || []);
    };
    
    const removeHandler = onSWMessage("LIKED_SONGS", handler);
    
    sendMessageToSW({ type: "GET_LIKED_SONGS" });
    
    setTimeout(() => {
      removeHandler();
      resolve([]);
    }, 3000);
  });
}

// ============================================
// Obtener preferencias del SW
// ============================================

export function getPreferences() {
  return new Promise((resolve) => {
    const handler = (payload) => {
      resolve(payload);
    };
    
    const removeHandler = onSWMessage("PREFERENCES_DATA", handler);
    
    sendMessageToSW({ type: "GET_PREFERENCES" });
    
    // Timeout después de 3 segundos
    setTimeout(() => {
      removeHandler();
      resolve(null);
    }, 3000);
  });
}

// ============================================
// Sincronización con DynamoDB
// ============================================

export function requestDynamoSync() {
  console.log("[SW-Service] Solicitando sincronización con DynamoDB");
  sendMessageToSW({ type: "SYNC_TO_DYNAMO" });
}

// ============================================
// Notificar cierre de aplicación
// ============================================

export function notifyAppClosing() {
  console.log("[SW-Service] Notificando cierre de aplicación");
  sendMessageToSW({ type: "APP_CLOSING" });
}

// ============================================
// Limpiar cache
// ============================================

export function clearSongCache() {
  sendMessageToSW({ type: "CLEAR_SONG_CACHE" });
}

// ============================================
// Estado del cache
// ============================================

export async function getCacheStatus() {
  return new Promise((resolve) => {
    const handler = (payload) => {
      resolve(payload);
    };

    const removeHandler = onSWMessage("CACHE_STATUS", handler);
    
    sendMessageToSW({ type: "GET_CACHE_STATUS" });

    // Timeout después de 3 segundos
    setTimeout(() => {
      removeHandler();
      resolve({ encryptedCached: 0, decryptedCached: 0 });
    }, 3000);
  });
}
