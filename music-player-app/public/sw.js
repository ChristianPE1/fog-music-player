// Fog Music Service Worker
// Maneja caché de canciones, cola de pre-descarga y modo offline

const CACHE_NAME = "fog-music-cache-v1";
const SONGS_CACHE = "fog-music-songs-v1";

// Archivos estáticos para cachear
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/default-album.svg",
];

// ============================================
// Instalación del Service Worker
// ============================================

self.addEventListener("install", (event) => {
  console.log("🔧 [SW] Instalando Service Worker...");
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 [SW] Cacheando archivos estáticos");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activar inmediatamente
  self.skipWaiting();
});

// ============================================
// Activación
// ============================================

self.addEventListener("activate", (event) => {
  console.log("✅ [SW] Service Worker activado");
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Limpiar caches antiguos
          if (cacheName !== CACHE_NAME && cacheName !== SONGS_CACHE) {
            console.log("🗑️ [SW] Eliminando cache antiguo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control de todas las pestañas
  self.clients.claim();
});

// ============================================
// Interceptar peticiones
// ============================================

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Interceptar peticiones de canciones encriptadas
  if (url.pathname.includes("/songs/") && url.pathname.endsWith(".enc")) {
    event.respondWith(handleSongRequest(event.request));
    return;
  }
  
  // Para otros recursos, intentar cache primero
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// ============================================
// Manejo de peticiones de canciones
// ============================================

async function handleSongRequest(request) {
  const cache = await caches.open(SONGS_CACHE);
  
  // Verificar si está en cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    console.log("🎵 [SW] Canción desde cache:", request.url);
    return cachedResponse;
  }
  
  // Si no está en cache, descargar
  console.log("📥 [SW] Descargando canción:", request.url);
  try {
    const response = await fetch(request);
    
    // Cachear la respuesta
    if (response.ok) {
      const responseToCache = response.clone();
      cache.put(request, responseToCache);
      console.log("💾 [SW] Canción cacheada:", request.url);
    }
    
    return response;
  } catch (error) {
    console.error("❌ [SW] Error al descargar canción:", error);
    throw error;
  }
}

// ============================================
// Mensajes desde la aplicación
// ============================================

self.addEventListener("message", async (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case "PREFETCH_SONGS":
      // Pre-descargar canciones de la cola
      await prefetchSongs(payload.songKeys);
      break;
      
    case "CLEAR_SONG_CACHE":
      // Limpiar cache de canciones
      await caches.delete(SONGS_CACHE);
      console.log("🗑️ [SW] Cache de canciones limpiado");
      break;
      
    case "GET_CACHE_STATUS":
      // Reportar estado del cache
      const status = await getCacheStatus();
      event.source.postMessage({ type: "CACHE_STATUS", payload: status });
      break;
  }
});

// ============================================
// Pre-descarga de canciones
// ============================================

async function prefetchSongs(songUrls) {
  if (!songUrls || songUrls.length === 0) return;
  
  console.log("🔄 [SW] Pre-descargando", songUrls.length, "canciones...");
  
  const cache = await caches.open(SONGS_CACHE);
  
  for (const url of songUrls) {
    try {
      const cached = await cache.match(url);
      if (!cached) {
        console.log("📥 [SW] Pre-descargando:", url);
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log("✅ [SW] Pre-descarga completada:", url);
        }
      } else {
        console.log("⏭️ [SW] Ya en cache:", url);
      }
    } catch (error) {
      console.error("❌ [SW] Error en pre-descarga:", url, error);
    }
  }
}

// ============================================
// Estado del Cache
// ============================================

async function getCacheStatus() {
  const cache = await caches.open(SONGS_CACHE);
  const keys = await cache.keys();
  
  return {
    songsCached: keys.length,
    cacheNames: keys.map(k => new URL(k.url).pathname),
  };
}

console.log("🎵 [SW] Fog Music Service Worker cargado");
