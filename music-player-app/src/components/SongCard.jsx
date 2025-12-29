// Componente de tarjeta de canción
import { getThumbnailUrl } from "../services/awsService";
import { FaPlay, FaStop, FaPlus } from "react-icons/fa";


export default function SongCard({ song, isPlaying, isCurrentSong, isLoading, onPlay, onAddToQueue, showAddToQueue = true }) {
  const thumbnailUrl = getThumbnailUrl(song);

  const handleAddToQueue = (e) => {
    e.stopPropagation();
    if (onAddToQueue) {
      onAddToQueue(song);
    }
  };

  return (
    <div
      onClick={() => onPlay(song)}
      className={`
        group relative bg-gray-800/60 rounded-lg p-3 cursor-pointer
        transition-all duration-250 hover:bg-gray-700/60
        ${isCurrentSong ? "ring-1 ring-emerald-500 bg-gray-700/60" : ""}
      `}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square mb-3 rounded-md overflow-hidden bg-gray-900">
        <img
          src={thumbnailUrl}
          alt={song.titulo}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = "/default-album.png";
          }}
        />
        
        {/* Overlay de reproducción */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center gap-2
            bg-black/30 transition-opacity duration-200
            ${isCurrentSong && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          `}
        >
          {isLoading && isCurrentSong ? (
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <button
                className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform"
              >
                {isCurrentSong && isPlaying ? <FaStop /> : <FaPlay />}
              </button>

              {/* Botón Añadir a cola */}
              {showAddToQueue && onAddToQueue && !isCurrentSong && (
                <button
                  onClick={handleAddToQueue}
                  className="w-8 h-8 bg-gray-700/80 hover:bg-gray-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform text-white"
                  title="Añadir a la cola"
                >
                  <FaPlus className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-white truncate mb-0.5 text-sm">{song.titulo}</h3>
      <p className="text-xs text-gray-400 truncate mb-2">{song.artista}</p>
      
      {/* Badge de género */}
      <span
        className={`
          inline-block mt-1 px-2 py-1 text-xs rounded-full
          ${getGenreColor(song.genero)}
        `}
      >
        {song.genero}
      </span>
    </div>
  );
}

function getGenreColor(genre) {
  const colors = {
    Pop: "bg-pink-600/10 text-pink-400",
    "K-Pop": "bg-purple-600/10 text-purple-300",
    "R&B": "bg-blue-600/10 text-blue-300",
    "Hip-Hop": "bg-yellow-600/10 text-yellow-300",
    Country: "bg-orange-600/10 text-orange-300",
  };
  return colors[genre] || "bg-gray-700/20 text-gray-300";
}
