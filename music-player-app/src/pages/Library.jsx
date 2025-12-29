import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiHome, FiLoader } from "react-icons/fi";
import SongCard from "../components/SongCard";
import { useMusicContext } from "../contexts/MusicContext";
import { trackSearch } from "../services/swService";
import { TbArrowBigDownFilled } from "react-icons/tb";


const SONGS_PER_PAGE = 30;

export default function Library() {
  const { songs, currentSong, isPlaying, isLoading, playSong, addToQueue } = useMusicContext();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [sortBy, setSortBy] = useState("titulo");
  const [displayCount, setDisplayCount] = useState(SONGS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastSearchRef = useRef("");
  const loaderRef = useRef(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      lastSearchRef.current = searchTerm;
    }
  }, [searchTerm]);

  // Reiniciar displayCount al cambiar filtros
  useEffect(() => {
    setDisplayCount(SONGS_PER_PAGE);
  }, [searchTerm, selectedGenre, sortBy]);

  const handlePlaySong = (song) => {
    if (lastSearchRef.current.length >= 2) {
      trackSearch(lastSearchRef.current, song.artista, song.genero);
      lastSearchRef.current = "";
    }
    playSong(song);
  };

  const genres = useMemo(() => {
    return [...new Set(songs.map((song) => song.genero))].sort();
  }, [songs]);

  const filteredSongs = useMemo(() => {
    let result = songs.filter((song) => {
      const matchesSearch = searchTerm === "" ||
        song.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artista.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = selectedGenre === "" || song.genero === selectedGenre;
      return matchesSearch && matchesGenre;
    });

    result.sort((a, b) => {
      if (sortBy === "titulo") return a.titulo.localeCompare(b.titulo);
      if (sortBy === "artista") return a.artista.localeCompare(b.artista);
      if (sortBy === "genero") return a.genero.localeCompare(b.genero);
      return 0;
    });

    return result;
  }, [songs, searchTerm, selectedGenre, sortBy]);

  const displayedSongs = useMemo(() => {
    return filteredSongs.slice(0, displayCount);
  }, [filteredSongs, displayCount]);

  const hasMore = displayCount < filteredSongs.length;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + SONGS_PER_PAGE, filteredSongs.length));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore, filteredSongs.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Biblioteca</h1>
          <p className="text-gray-400">{songs.length} canciones disponibles</p>
        </div>
        <Link to="/" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2">
          <FiHome className="w-4 h-4" />
          Inicio
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-gray-800/50 p-4 rounded-lg">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar canciones o artistas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos los géneros</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>


        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="titulo">Por título</option>
          <option value="artista">Por artista</option>
          <option value="genero">Por género</option>
        </select>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FiSearch className="w-16 h-16 mb-4" />
          <p className="text-lg">No se encontraron canciones</p>
          <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm">
            Mostrando {displayedSongs.length} de {filteredSongs.length} canciones
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedSongs.map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={currentSong?.song_id === song.song_id}
                isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                isLoading={isLoading && currentSong?.song_id === song.song_id}
                onPlay={handlePlaySong}
                onAddToQueue={addToQueue}
              />
            ))}
          </div>
          
          {hasMore && (
            <div ref={loaderRef} className="flex justify-center py-8">
              {loadingMore ? (
                <FiLoader className="w-8 h-8 text-emerald-500 animate-spin" />
              ) : (
                <button onClick={loadMore} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg">
                  Cargar más
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
