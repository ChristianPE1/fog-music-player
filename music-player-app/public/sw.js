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
  lastSync: null,
  totalListeningTime: 0,
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
          userPreferences = { ...userPreferences, ...request.result.data };
          console.log("📚 [SW-FOG] Preferencias cargadas");
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
    const tx = db.transaction("preferences", "readwrite");
    const store = tx.objectStore("preferences");
    await store.put({ id: "user_preferences", data: userPreferences });
    console.log("💾 [SW-FOG] Preferencias guardadas");
    console.log("   📊 Tiempo escuchado:", formatTime(userPreferences.totalListeningTime));
    console.log("   🎤 Top Artistas:", JSON.stringify(getTopArtists(3)));
    console.log("   🎵 Top Géneros:", JSON.stringify(getTopGenres(3)));
  } catch (error) {
    console.error("❌ [SW-FOG] Error guardando:", error);
  }
}

function trackPlayTime(songId, seconds, artist, genre) {
  userPreferences.playTime[songId] = (userPreferences.playTime[songId] || 0) + seconds;
  userPreferences.totalListeningTime += seconds;
  if (artist) userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 1;
  if (genre) userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 1;
  
  console.log("⏱️ [SW-FOG] Tracking: " + songId + " +" + seconds + "s");
  console.log("   🎤 Artista: " + artist + " (" + userPreferences.artistPlays[artist] + " plays)");
  console.log("   🎵 Género: " + genre + " (" + userPreferences.genrePlays[genre] + " plays)");
  savePreferences();
}

function trackSearch(query) {
  userPreferences.searchHistory.push({ query, timestamp: Date.now() });
  if (userPreferences.searchHistory.length > 50) {
    userPreferences.searchHistory = userPreferences.searchHistory.slice(-50);
  }
  console.log("🔍 [SW-FOG] Búsqueda: \"" + query + "\" (Total: " + userPreferences.searchHistory.length + ")");
  savePreferences();
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
      trackSearch(payload.query);
      break;
    case "GET_PREFERENCES":
      event.source.postMessage({
        type: "PREFERENCES_DATA",
        payload: {
          preferences: userPreferences,
          topArtists: getTopArtists(5),
          topGenres: getTopGenres(5),
          totalListeningTime: userPreferences.totalListeningTime,
          searchHistory: userPreferences.searchHistory.slice(-10)
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
