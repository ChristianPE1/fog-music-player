// Componente de tarjeta de canción
import { getThumbnailUrl } from "../services/awsService";

export default function SongCard({ song, isPlaying, isCurrentSong, isLoading, onPlay }) {
  const thumbnailUrl = getThumbnailUrl(song);

  return (
    <div
      onClick={() => onPlay(song)}
      className={`
        group relative bg-gray-800 rounded-lg p-4 cursor-pointer
        transition-all duration-300 hover:bg-gray-700
        ${isCurrentSong ? "ring-2 ring-green-500 bg-gray-700" : ""}
      `}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-gray-900">
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
            absolute inset-0 flex items-center justify-center
            bg-black/40 transition-opacity duration-200
            ${isCurrentSong && isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          `}
        >
          {isLoading && isCurrentSong ? (
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <button
              className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center
                         hover:scale-110 transition-transform shadow-lg"
            >
              {isCurrentSong && isPlaying ? (
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <h3 className="font-semibold text-white truncate mb-1">{song.titulo}</h3>
      <p className="text-sm text-gray-400 truncate">{song.artista}</p>
      
      {/* Badge de género */}
      <span
        className={`
          inline-block mt-2 px-2 py-1 text-xs rounded-full
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
    Pop: "bg-pink-500/20 text-pink-400",
    "K-Pop": "bg-purple-500/20 text-purple-400",
    "R&B": "bg-blue-500/20 text-blue-400",
    "Hip-Hop": "bg-yellow-500/20 text-yellow-400",
    Country: "bg-orange-500/20 text-orange-400",
    Alternative: "bg-green-500/20 text-green-400",
    Indie: "bg-teal-500/20 text-teal-400",
    Folk: "bg-amber-500/20 text-amber-400",
    "Classic Pop": "bg-rose-500/20 text-rose-400",
  };
  return colors[genre] || "bg-gray-500/20 text-gray-400";
}
