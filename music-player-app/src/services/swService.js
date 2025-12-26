// Servicio de Service Worker
// Maneja el registro y comunicación con el SW

let swRegistration = null;

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

    console.log("✅ Service Worker registrado:", swRegistration.scope);

    // Escuchar actualizaciones
    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration.installing;
      console.log("🔄 Nueva versión del Service Worker encontrada");

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          console.log("📢 Nueva versión disponible, recarga para actualizar");
        }
      });
    });

    return swRegistration;
  } catch (error) {
    console.error("❌ Error al registrar Service Worker:", error);
    return null;
  }
}

// ============================================
// Comunicación con el Service Worker
// ============================================

export function sendMessageToSW(message) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

export function prefetchSongs(songUrls) {
  sendMessageToSW({
    type: "PREFETCH_SONGS",
    payload: { songKeys: songUrls },
  });
}

export function clearSongCache() {
  sendMessageToSW({ type: "CLEAR_SONG_CACHE" });
}

export async function getCacheStatus() {
  return new Promise((resolve) => {
    const handler = (event) => {
      if (event.data.type === "CACHE_STATUS") {
        navigator.serviceWorker.removeEventListener("message", handler);
        resolve(event.data.payload);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    sendMessageToSW({ type: "GET_CACHE_STATUS" });

    // Timeout después de 3 segundos
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", handler);
      resolve({ songsCached: 0, cacheNames: [] });
    }, 3000);
  });
}
