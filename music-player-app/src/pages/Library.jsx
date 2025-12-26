// Página de Biblioteca - Muestra todas las canciones con búsqueda y filtros
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SongCard from "../components/SongCard";
import { useMusicContext } from "../App";

export default function Library() {
  const { songs, currentSong, isPlaying, isLoading, playSong } = useMusicContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [sortBy, setSortBy] = useState("titulo");

  // Obtener géneros únicos
  const genres = useMemo(() => {
    return [...new Set(songs.map((song) => song.genero))].sort();
  }, [songs]);

  // Filtrar y ordenar canciones
  const filteredSongs = useMemo(() => {
    let result = songs.filter((song) => {
      const matchesSearch =
        searchTerm === "" ||
        song.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artista.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGenre = selectedGenre === "" || song.genero === selectedGenre;

      return matchesSearch && matchesGenre;
    });

    // Ordenar
    result.sort((a, b) => {
      if (sortBy === "titulo") return a.titulo.localeCompare(b.titulo);
      if (sortBy === "artista") return a.artista.localeCompare(b.artista);
      if (sortBy === "genero") return a.genero.localeCompare(b.genero);
      return 0;
    });

    return result;
  }, [songs, searchTerm, selectedGenre, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Biblioteca</h1>
          <p className="text-gray-400">{songs.length} canciones disponibles</p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 bg-gray-800/50 p-4 rounded-lg">
        {/* Búsqueda */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar canciones o artistas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4
                       text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Filtro de género */}
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg py-2 px-4
                     text-white focus:outline-none focus:border-green-500"
        >
          <option value="">Todos los géneros</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        {/* Ordenar */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg py-2 px-4
                     text-white focus:outline-none focus:border-green-500"
        >
          <option value="titulo">Ordenar por título</option>
          <option value="artista">Ordenar por artista</option>
          <option value="genero">Ordenar por género</option>
        </select>
      </div>

      {/* Resultados */}
      {filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg">No se encontraron canciones</p>
          <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm">
            Mostrando {filteredSongs.length} de {songs.length} canciones
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredSongs.map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={currentSong?.song_id === song.song_id}
                isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                isLoading={isLoading && currentSong?.song_id === song.song_id}
                onPlay={playSong}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
