// Componente de Cola de Reproducción - FOG COMPUTING
import { getThumbnailUrl } from "../services/awsService";
import { useMusicContext } from "../App";
import { useState, useEffect } from "react";
import { onSWMessage, getCacheStatus } from "../services/swService";

export default function QueuePanel({ isOpen, onClose }) {
  const { queue, currentSong, playFromQueue, prefetchStatus } = useMusicContext();
  const [cacheInfo, setCacheInfo] = useState({ decryptedCached: 0, encryptedCached: 0 });

  // Obtener estado del cache periódicamente
  useEffect(() => {
    if (!isOpen) return;

    const fetchCacheStatus = async () => {
      const status = await getCacheStatus();
      setCacheInfo(status);
    };

    fetchCacheStatus();
    const interval = setInterval(fetchCacheStatus, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Escuchar progreso de pre-descarga
  useEffect(() => {
    const removeHandler = onSWMessage("PREFETCH_PROGRESS", (payload) => {
      console.log(`📥 [Queue] Pre-descarga: ${payload.current}/${payload.total}`);
    });

    return () => removeHandler();
  }, []);

  if (!isOpen) return null;

  // Mostrar máximo 10 canciones
  const displayQueue = queue.slice(0, 10);

  return (
    <div className="fixed right-0 top-0 bottom-20 w-80 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Cola de reproducción</h3>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Cache Status */}
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            📦 Cache: {cacheInfo.decryptedCached} listas
          </span>
          {prefetchStatus && prefetchStatus.total > 0 && (
            <span className="text-green-400 animate-pulse">
              ⬇️ Descargando {prefetchStatus.current}/{prefetchStatus.total}
            </span>
          )}
        </div>
      </div>

      {/* Now Playing */}
      {currentSong && (
        <div className="p-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase mb-2">Reproduciendo ahora</p>
          <div className="flex items-center gap-3">
            <img
              src={getThumbnailUrl(currentSong)}
              alt={currentSong.titulo}
              className="w-12 h-12 rounded object-cover"
              onError={(e) => { e.target.src = "/default-album.svg"; }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-white font-medium truncate">{currentSong.titulo}</p>
              <p className="text-gray-400 text-sm truncate">{currentSong.artista}</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {displayQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-center">La cola está vacía</p>
            <p className="text-xs text-center mt-1">Reproduce una canción para generar la cola automática</p>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs text-gray-500 uppercase mb-3">
              Siguientes ({displayQueue.length} de {queue.length})
            </p>
            <ul className="space-y-2">
              {displayQueue.map((song, index) => {
                // Las primeras 3 se pre-descargan
                const isPrefetched = index < 3;
                
                return (
                  <li
                    key={`${song.song_id}-${index}`}
                    onClick={() => playFromQueue(index)}
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors group ${isPrefetched ? 'border-l-2 border-green-500' : ''}`}
                  >
                    <span className="w-5 text-center text-gray-500 text-sm group-hover:hidden">
                      {index + 1}
                    </span>
                    <svg
                      className="w-5 h-5 text-white hidden group-hover:block"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <img
                      src={getThumbnailUrl(song)}
                      alt={song.titulo}
                      className="w-10 h-10 rounded object-cover"
                      onError={(e) => { e.target.src = "/default-album.svg"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm truncate">{song.titulo}</p>
                      <p className="text-gray-500 text-xs truncate">{song.artista}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-600 px-2 py-1 bg-gray-800 rounded">
                        {song.genero}
                      </span>
                      {isPrefetched && (
                        <span className="text-[10px] text-green-400">⚡ Lista</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-center mb-2">
          <p className="text-xs text-gray-500">
            🌫️ Cola generada por Fog Computing
          </p>
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>📥 Pre-descarga: 3 canciones</span>
          <span>🔐 Desencriptadas localmente</span>
        </div>
      </div>
    </div>
  );
}
