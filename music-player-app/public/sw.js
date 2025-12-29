// Fog Music Service Worker - FOG COMPUTING
const CACHE_NAME = "fog-music-cache-v3";
const SONGS_CACHE = "fog-music-songs-v3";
const DECRYPTED_CACHE = "fog-music-decrypted-v1";
const STATIC_ASSETS = ["/", "/index.html", "/default-album.svg"];

let userPreferences = {
  playTime: {},
  searchHistory: [],
  artistPlays: {},
  genrePlays: {},
  likedSongs: [],
  lastSync: null,
  totalListeningTime: 0,
  countedSongs: new Set(),
};

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
          if (Array.isArray(userPreferences.countedSongs)) {
            userPreferences.countedSongs = new Set(userPreferences.countedSongs);
          } else if (!userPreferences.countedSongs) {
            userPreferences.countedSongs = new Set();
          }
        }
        resolve(userPreferences);
      };
      request.onerror = () => resolve(userPreferences);
    });
  } catch (error) {
    return userPreferences;
  }
}

async function savePreferences() {
  try {
    const db = await openPreferencesDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("preferences", "readwrite");
      const store = tx.objectStore("preferences");
      const dataToSave = {
        ...userPreferences,
        countedSongs: userPreferences.countedSongs instanceof Set 
          ? Array.from(userPreferences.countedSongs) 
          : (userPreferences.countedSongs || [])
      };
      const request = store.put({ id: "user_preferences", data: dataToSave });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    return false;
  }
}

function trackPlayTime(songId, seconds, artist, genre) {
  userPreferences.playTime[songId] = (userPreferences.playTime[songId] || 0) + seconds;
  userPreferences.totalListeningTime += seconds;
  
  const songKey = String(songId);
  if (!userPreferences.countedSongs) {
    userPreferences.countedSongs = new Set();
  }
  if (Array.isArray(userPreferences.countedSongs)) {
    userPreferences.countedSongs = new Set(userPreferences.countedSongs);
  }
  
  if (!userPreferences.countedSongs.has(songKey)) {
    userPreferences.countedSongs.add(songKey);
    if (artist) userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 1;
    if (genre) userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 1;
  }
  
  savePreferences();
}

function trackSearch(query, artist, genre) {
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
  
  if (artist) {
    userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 2;
  }
  if (genre) {
    userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 2;
  }
  
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

function toggleLikeSong(songId, artist, genre) {
  if (!userPreferences.likedSongs) {
    userPreferences.likedSongs = [];
  }
  
  const index = userPreferences.likedSongs.findIndex(s => s.songId === songId);
  
  if (index === -1) {
    userPreferences.likedSongs.push({ songId, artist, genre, timestamp: Date.now() });
    if (artist) userPreferences.artistPlays[artist] = (userPreferences.artistPlays[artist] || 0) + 3;
    if (genre) userPreferences.genrePlays[genre] = (userPreferences.genrePlays[genre] || 0) + 3;
  } else {
    const song = userPreferences.likedSongs[index];
    userPreferences.likedSongs.splice(index, 1);
    if (song.artist) userPreferences.artistPlays[song.artist] = Math.max(0, (userPreferences.artistPlays[song.artist] || 0) - 3);
    if (song.genre) userPreferences.genrePlays[song.genre] = Math.max(0, (userPreferences.genrePlays[song.genre] || 0) - 3);
  }
  
  savePreferences();
  return userPreferences.likedSongs.some(s => s.songId === songId);
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hrs + "h " + mins + "m " + secs + "s";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      await loadPreferences();
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    throw error;
  }
}

self.addEventListener("message", async (event) => {
  const { type, payload } = event.data;

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
          topArtists: getTopArtists(10),
          topGenres: getTopGenres(10),
          totalListeningTime: userPreferences.totalListeningTime,
          searchHistory: userPreferences.searchHistory.slice(-10),
          likedSongs: userPreferences.likedSongs || []
        }
      });
      break;
    case "SYNC_TO_DYNAMO":
      userPreferences.lastSync = Date.now();
      await savePreferences();
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
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: "PREFETCH_REQUEST",
      payload: { songs: songsToDownload, count: songsToDownload.length }
    });
  });
}

async function cacheDecryptedSong(songId, audioData) {
  try {
    const cache = await caches.open(DECRYPTED_CACHE);
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const response = new Response(blob, { headers: { "Content-Type": "audio/mpeg" } });
    await cache.put("decrypted-" + songId, response);
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: "SONG_CACHED", payload: { songId, success: true } });
    });
  } catch (error) {}
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
      lastSync: userPreferences.lastSync ? new Date(userPreferences.lastSync).toISOString() : null
    }
  };
}

(async () => { await loadPreferences(); })();
