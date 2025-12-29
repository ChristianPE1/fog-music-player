import { useMemo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiMusic, FiUser, FiDisc } from "react-icons/fi";
import SongCard from "../components/SongCard";
import { useMusicContext } from "../contexts/MusicContext";
import { getPreferences } from "../services/swService";

export default function Dashboard() {
  const { songs, userTastes, cloudArtistTastes, currentSong, isPlaying, isLoading, playSong, addToQueue } = useMusicContext();
  const [fogArtistTastes, setFogArtistTastes] = useState({});
  const [fogGenreTastes, setFogGenreTastes] = useState({});
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;
    const loadFogPrefs = async () => {
      const prefs = await getPreferences();
      if (prefs?.preferences) {
        setFogArtistTastes(prefs.preferences.artistPlays || {});
        setFogGenreTastes(prefs.preferences.genrePlays || {});
      }
      initialLoadDone.current = true;
    };
    loadFogPrefs();
  }, []);

  const effectiveGenreTastes = Object.keys(fogGenreTastes).length > 0 ? fogGenreTastes : userTastes;
  const effectiveArtistTastes = Object.keys(fogArtistTastes).length > 0 ? fogArtistTastes : (cloudArtistTastes || {});

  const songsByTopGenre = useMemo(() => {
    const topGenres = Object.entries(effectiveGenreTastes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
    
    if (topGenres.length === 0) {
      return songs.sort(() => Math.random() - 0.5).slice(0, 10);
    }
    
    const result = [];
    const usedIds = new Set();
    
    for (const genre of topGenres) {
      const genreSongs = songs
        .filter(s => s.genero === genre && !usedIds.has(s.song_id))
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.ceil(10 / topGenres.length));
      genreSongs.forEach(s => { result.push(s); usedIds.add(s.song_id); });
    }
    
    while (result.length < 10) {
      const remaining = songs.filter(s => !usedIds.has(s.song_id));
      if (remaining.length === 0) break;
      const randomSong = remaining[Math.floor(Math.random() * remaining.length)];
      result.push(randomSong);
      usedIds.add(randomSong.song_id);
    }
    
    return result.slice(0, 10);
  }, [songs, effectiveGenreTastes]);

  const songsByTopArtist = useMemo(() => {
    const topArtists = Object.entries(effectiveArtistTastes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);
    
    const usedInGenre = new Set(songsByTopGenre.map(s => s.song_id));
    
    if (topArtists.length === 0) {
      return songs.filter(s => !usedInGenre.has(s.song_id)).sort(() => Math.random() - 0.5).slice(0, 10);
    }
    
    const result = [];
    const usedIds = new Set(usedInGenre);
    
    for (const artist of topArtists) {
      const artistSongs = songs
        .filter(s => s.artista === artist && !usedIds.has(s.song_id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
      artistSongs.forEach(s => { result.push(s); usedIds.add(s.song_id); });
    }
    
    while (result.length < 10) {
      const remaining = songs.filter(s => !usedIds.has(s.song_id));
      if (remaining.length === 0) break;
      const randomSong = remaining[Math.floor(Math.random() * remaining.length)];
      result.push(randomSong);
      usedIds.add(randomSong.song_id);
    }
    
    return result.slice(0, 10);
  }, [songs, effectiveArtistTastes, songsByTopGenre]);

  const totalPlays = Object.values(effectiveGenreTastes).reduce((a, b) => a + b, 0);
  const hasData = totalPlays > 0;

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {getGreeting()}, música para ti
          </h1>
          <p className="text-gray-400">
            {!hasData ? "Escucha algunas canciones para personalizar tus recomendaciones" : "Basado en tus " + totalPlays + " reproducciones"}
          </p>
        </div>
        <Link to="/library" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2">
          <FiMusic className="w-4 h-4" />
          Ver biblioteca
        </Link>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <FiDisc className="w-6 h-6 text-emerald-500" />
          <h2 className="text-xl font-semibold text-white">{hasData ? "Top por Géneros" : "Descubre por Géneros"}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songsByTopGenre.map((song) => (
            <SongCard key={song.song_id} song={song} isCurrentSong={currentSong?.song_id === song.song_id} isPlaying={isPlaying && currentSong?.song_id === song.song_id} isLoading={isLoading && currentSong?.song_id === song.song_id} onPlay={playSong} onAddToQueue={addToQueue} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <FiUser className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-semibold text-white">{hasData ? "Top por Artistas" : "Descubre por Artistas"}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {songsByTopArtist.map((song) => (
            <SongCard key={song.song_id} song={song} isCurrentSong={currentSong?.song_id === song.song_id} isPlaying={isPlaying && currentSong?.song_id === song.song_id} isLoading={isLoading && currentSong?.song_id === song.song_id} onPlay={playSong} onAddToQueue={addToQueue} />
          ))}
        </div>
      </section>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
