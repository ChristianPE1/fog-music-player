// Fog Music Service Worker - FOG COMPUTING
// Maneja cache de canciones, aprendizaje de preferencias, y modo offline

const CACHE_NAME = "fog-music-cache-v2";
const SONGS_CACHE = "fog-music-songs-v2";
const DECRYPTED_CACHE = "fog-music-decrypted-v1";

const ENCRYPTION_KEY = "miclavesecretade32bytes123456789";

const STATIC_ASSETS = ["/", "/index.html", "/default-album.svg"];

// Preferencias del usuario
let userPreferences = {
  playTime: {},
  searchHistory: [],
  artistPlays: {},
  genrePlays: {},
  likedSongs: [],
  lastSync: null,
  totalListeningTime: 0,
  // Set para trackear canciones ya contadas en esta sesión
  countedSongs: new Set(),
};

// IndexedDB para persistir preferencias
function openPreferencesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FogMusicPreferences", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadPreferences() {
  try {
    const db = await openPreferencesDB();
    const tx = db.transaction("preferences", "readonly");
    const store = tx.objectStore("preferences");
    const request = store.get("user_preferences");
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result) {
          const loadedData = request.result.data;
          userPreferences = { ...userPreferences, ...loadedData };
          // Convertir Array a Set para countedSongs
          if (Array.isArray(userPreferences.countedSongs)) {
            userPreferences.countedSongs = new Set(userPreferences.countedSongs);
          } else if (!userPreferences.countedSongs) {
            userPreferences.countedSongs = new Set();
          }
          console.log("📚 [SW-FOG] Preferencias cargadas");
          console.log("   🎤 Artistas:", Object.keys(userPreferences.artistPlays || {}).length);
          console.log("   🎵 Géneros:", Object.keys(userPreferences.genrePlays || {}).length);
          console.log("   ❤️ Likes:", (userPreferences.likedSongs || []).length);
        }
        resolve(userPreferences);
      };
      request.onerror = () => resolve(userPreferences);
    });
  } catch (error) {
    console.error("❌ [SW-FOG] Error cargando preferencias:", error);
    return userPreferences;
  }
}

async function savePreferences() {
  try {
    const db = await openPreferencesDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("preferences", "readwrite");
      const store = tx.objectStore("preferences");
      
      // Convertir Set a Array para guardar en IndexedDB
      const dataToSave = {
        ...userPreferences,
        countedSongs: userPreferences.countedSongs instanceof Set 
          ? Array.from(userPreferences.countedSongs) 
          : (userPreferences.countedSongs || [])
      };
      
      const request = store.put({ id: "user_preferences", data: dataToSave });
      
      request.onsuccess = () => {
        console.log("💾 [SW-FOG] Preferencias guardadas correctamente");
        console.log("   🎤 Artistas:", Object.keys(dataToSave.artistPlays || {}).length);
        console.log("   🎵 Géneros:", Object.keys(dataToSave.genrePlays || {}).length);
        console.log("   ⏱️ Tiempo total:", dataToSave.totalListeningTime, "segundos");
        resolve(true);
      };
      
      request.onerror = () => {
        console.error("❌ [SW-FOG] Error en request:", request.error);
        reject(request.error);
      };
      
      tx.oncomplete = () => {
        console.log("✅ [SW-FOG] Transacción completada");
      };
      
      tx.onerror = () => {
        console.error("❌ [SW-FOG] Error en transacción:", tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error("❌ [SW-FOG] Error guardando preferencias:", error);
    return false;
  }
}

function trackPlayTime(songId, seconds, artist, genre) {
  userPreferences.playTime[songId] = (userPreferences.playTime[songId] || 0) + seconds;
  userPreferences.totalListeningTime += seconds;
  
  // Solo incrementar conteo de artista/género UNA VEZ por canción
  const songKey = `${songId}`;
  if (!userPreferences.countedSongs) {
    userPreferences.countedSongs = new Set();
  }
  
  // Convertir de array a Set si viene de IndexedDB
  if (Array.isArray(userPreferences.countedSongs)) {
    userPreferences.countedSongs = new Set(userPreferences.countedSongs);
  }
  
  if (!userPreferences.countedSongs.has(songKey)) {
    userPreferences.countedSongs.add(songKey);
    if (artist) userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 1;
    if (genre) userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 1;
    console.log("🎵 [SW-FOG] Nueva reproducción contada: " + songId);
    console.log("   🎤 Artista: " + artist + " (" + userPreferences.artistPlays[artist] + " plays)");
    console.log("   🎵 Género: " + genre + " (" + userPreferences.genrePlays[genre] + " plays)");
  }
  
  console.log("⏱️ [SW-FOG] Tracking tiempo: " + songId + " +" + seconds + "s (Total: " + userPreferences.playTime[songId] + "s)");
  savePreferences();
  
  // Notificar a la app para actualización en tiempo real
  notifyClientsOfUpdate();
}

function trackSearch(query, artist, genre) {
  // Guardar género y artista en lugar del texto buscado
  const searchEntry = {
    query: query,
    artist: artist || null,
    genre: genre || null,
    timestamp: Date.now()
  };
  
  userPreferences.searchHistory.push(searchEntry);
  if (userPreferences.searchHistory.length > 50) {
    userPreferences.searchHistory = userPreferences.searchHistory.slice(-50);
  }
  
  // Si hay artista/género, dar peso extra (búsquedas tienen más peso)
  if (artist) {
    userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 2;
    console.log("🔍 [SW-FOG] Búsqueda -> Artista: " + artist + " (+2 peso)");
  }
  if (genre) {
    userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 2;
    console.log("🔍 [SW-FOG] Búsqueda -> Género: " + genre + " (+2 peso)");
  }
  
  console.log("🔍 [SW-FOG] Búsqueda guardada (Total: " + userPreferences.searchHistory.length + ")");
  savePreferences();
  notifyClientsOfUpdate();
}

function getTopArtists(limit) {
  return Object.entries(userPreferences.artistPlays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 5)
    .map(([artist, plays]) => ({ artist, plays }));
}

function getTopGenres(limit) {
  return Object.entries(userPreferences.genrePlays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 5)
    .map(([genre, plays]) => ({ genre, plays }));
}

// Notificar a todos los clientes de actualizaciones en tiempo real
async function notifyClientsOfUpdate() {
  const clients = await self.clients.matchAll();
  const payload = {
    preferences: userPreferences,
    topArtists: getTopArtists(5),
    topGenres: getTopGenres(5),
    totalListeningTime: userPreferences.totalListeningTime,
    searchHistory: userPreferences.searchHistory.slice(-10),
    likedSongs: userPreferences.likedSongs || []
  };
  
  clients.forEach(client => {
    client.postMessage({ type: "PREFERENCES_UPDATED", payload });
  });
}

// Manejar likes de canciones
function toggleLikeSong(songId, artist, genre) {
  if (!userPreferences.likedSongs) {
    userPreferences.likedSongs = [];
  }
  
  const index = userPreferences.likedSongs.findIndex(s => s.songId === songId);
  
  if (index === -1) {
    // Agregar like
    userPreferences.likedSongs.push({ songId, artist, genre, timestamp: Date.now() });
    // Likes tienen peso mayor (3 puntos)
    if (artist) userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 3;
    if (genre) userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 3;
    console.log("❤️ [SW-FOG] Like agregado: " + songId);
  } else {
    // Quitar like
    const song = userPreferences.likedSongs[index];
    userPreferences.likedSongs.splice(index, 1);
    // Restar peso
    if (song.artist) userPreferences.artistPlays[song.artist] = Math.max(0, (userPreferences.artistPlays[song.artist] || 0) - 3);
    if (song.genre) userPreferences.genrePlays[song.genre] = Math.max(0, (userPreferences.genrePlays[song.genre] || 0) - 3);
    console.log("💔 [SW-FOG] Like removido: " + songId);
  }
  
  savePreferences();
  notifyClientsOfUpdate();
  
  return userPreferences.likedSongs.some(s => s.songId === songId);
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hrs + "h " + mins + "m " + secs + "s";
}

// Instalación
self.addEventListener("install", (event) => {
  console.log("🔧 [SW] Instalando Service Worker v2 (FOG Computing)...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await loadPreferences();
    })()
  );
  self.skipWaiting();
});

// Activación
self.addEventListener("activate", (event) => {
  console.log("✅ [SW] Service Worker v2 activado (FOG Computing)");
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, SONGS_CACHE, DECRYPTED_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
      await loadPreferences();
    })()
  );
  self.clients.claim();
});

// Interceptar fetch
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes("/songs/") && url.pathname.endsWith(".enc")) {
    event.respondWith(handleSongRequest(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

async function handleSongRequest(request) {
  const cache = await caches.open(SONGS_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    console.log("🎵 [SW] Canción desde cache:", request.url);
    return cached;
  }
  console.log("📥 [SW] Descargando canción:", request.url);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      console.log("💾 [SW] Canción cacheada:", request.url);
    }
    return response;
  } catch (error) {
    console.error("❌ [SW] Error descargando:", error);
    throw error;
  }
}

// Mensajes
self.addEventListener("message", async (event) => {
  const { type, payload } = event.data;
  console.log("📨 [SW] Mensaje: " + type);

  switch (type) {
    case "PREFETCH_SONGS":
      await requestPrefetchFromApp(payload.songs, payload.count || 3);
      break;
    case "CACHE_DECRYPTED_SONG":
      await cacheDecryptedSong(payload.songId, payload.audioData);
      break;
    case "CLEAR_SONG_CACHE":
      await caches.delete(SONGS_CACHE);
      await caches.delete(DECRYPTED_CACHE);
      console.log("🗑️ [SW] Cache limpiado");
      break;
    case "GET_CACHE_STATUS":
      const status = await getCacheStatus();
      event.source.postMessage({ type: "CACHE_STATUS", payload: status });
      break;
    case "TRACK_PLAY_TIME":
      trackPlayTime(payload.songId, payload.seconds, payload.artist, payload.genre);
      break;
    case "TRACK_SEARCH":
      trackSearch(payload.query, payload.artist, payload.genre);
      break;
    case "TOGGLE_LIKE":
      const isLiked = toggleLikeSong(payload.songId, payload.artist, payload.genre);
      event.source.postMessage({ type: "LIKE_TOGGLED", payload: { songId: payload.songId, isLiked } });
      break;
    case "GET_LIKED_SONGS":
      event.source.postMessage({ type: "LIKED_SONGS", payload: { likedSongs: userPreferences.likedSongs || [] } });
      break;
    case "GET_PREFERENCES":
      event.source.postMessage({
        type: "PREFERENCES_DATA",
        payload: {
          preferences: userPreferences,
          topArtists: getTopArtists(5),
          topGenres: getTopGenres(5),
          totalListeningTime: userPreferences.totalListeningTime,
          searchHistory: userPreferences.searchHistory.slice(-10),
          likedSongs: userPreferences.likedSongs || []
        }
      });
      console.log("📤 [SW-FOG] Preferencias enviadas");
      break;
    case "SYNC_TO_DYNAMO":
      userPreferences.lastSync = Date.now();
      await savePreferences();
      console.log("☁️ [SW-FOG] Sync con DynamoDB solicitado");
      event.source.postMessage({
        type: "SYNC_PREFERENCES",
        payload: {
          preferences: userPreferences,
          topArtists: getTopArtists(10),
          topGenres: getTopGenres(10)
        }
      });
      break;
    case "APP_CLOSING":
      console.log("🚪 [SW-FOG] App cerrándose - guardando...");
      await savePreferences();
      event.source.postMessage({
        type: "SYNC_PREFERENCES",
        payload: {
          preferences: userPreferences,
          topArtists: getTopArtists(10),
          topGenres: getTopGenres(10),
          isClosing: true
        }
      });
      break;
  }
});

async function requestPrefetchFromApp(songs, count) {
  if (!songs || songs.length === 0) return;
  const songsToDownload = songs.slice(0, count);
  console.log("🔄 [SW-FOG] Solicitando pre-descarga de " + songsToDownload.length + " canciones...");
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: "PREFETCH_REQUEST",
      payload: { songs: songsToDownload, count: songsToDownload.length }
    });
  });
  console.log("📋 [SW-FOG] Canciones enviadas a la app para pre-descarga");
}

async function cacheDecryptedSong(songId, audioData) {
  try {
    const cache = await caches.open(DECRYPTED_CACHE);
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const response = new Response(blob, { headers: { "Content-Type": "audio/mpeg" } });
    await cache.put("decrypted-" + songId, response);
    console.log("✅ [SW-FOG] Canción cacheada: " + songId);
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: "SONG_CACHED", payload: { songId, success: true } });
    });
  } catch (error) {
    console.error("❌ [SW-FOG] Error cacheando:", error);
  }
}

async function getCacheStatus() {
  const encCache = await caches.open(SONGS_CACHE);
  const decCache = await caches.open(DECRYPTED_CACHE);
  const encKeys = await encCache.keys();
  const decKeys = await decCache.keys();
  return {
    encryptedCached: encKeys.length,
    decryptedCached: decKeys.length,
    preferences: {
      totalListeningTime: formatTime(userPreferences.totalListeningTime),
      topArtists: getTopArtists(3),
      topGenres: getTopGenres(3),
      searchCount: userPreferences.searchHistory.length,
      lastSync: userPreferences.lastSync ? new Date(userPreferences.lastSync).toISOString() : "Nunca"
    }
  };
}

console.log("🎵 [SW] Fog Music Service Worker v2 cargado");

// Cargar preferencias inmediatamente al cargar el SW
(async () => {
  console.log("🚀 [SW-FOG] Iniciando carga de preferencias...");
  await loadPreferences();
  console.log("✅ [SW-FOG] Preferencias listas al iniciar");
})();
