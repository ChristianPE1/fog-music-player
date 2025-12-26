// Componente de Cola de Reproducción
import { getThumbnailUrl } from "../services/awsService";
import { useMusicContext } from "../App";

export default function QueuePanel({ isOpen, onClose }) {
  const { queue, currentSong, playFromQueue } = useMusicContext();

  if (!isOpen) return null;

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
        {queue.length === 0 ? (
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
            <p className="text-xs text-gray-500 uppercase mb-3">Siguientes ({queue.length})</p>
            <ul className="space-y-2">
              {queue.map((song, index) => (
                <li
                  key={`${song.song_id}-${index}`}
                  onClick={() => playFromQueue(index)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors group"
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
                  <span className="text-xs text-gray-600 px-2 py-1 bg-gray-800 rounded">
                    {song.genero}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          Cola generada automáticamente por Fog Computing
        </p>
      </div>
    </div>
  );
}
