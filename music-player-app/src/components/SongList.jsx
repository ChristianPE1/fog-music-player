// Componente de lista de canciones
import SongCard from "./SongCard";

export default function SongList({ songs, currentSong, isPlaying, isLoading, onPlay, searchTerm, selectedGenre }) {
  // Filtrar canciones
  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      searchTerm === "" ||
      song.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artista.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGenre = selectedGenre === "" || song.genero === selectedGenre;

    return matchesSearch && matchesGenre;
  });

  if (filteredSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg">No se encontraron canciones</p>
        <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {filteredSongs.map((song) => (
        <SongCard
          key={song.song_id}
          song={song}
          isCurrentSong={currentSong?.song_id === song.song_id}
          isPlaying={isPlaying && currentSong?.song_id === song.song_id}
          isLoading={isLoading && currentSong?.song_id === song.song_id}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}
