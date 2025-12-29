// Página Dashboard - Muestra recomendaciones personalizadas
import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SongCard from "../components/SongCard";
import UserStats from "../components/UserStats";
import { getRecommendedSongs, calculateGenreScores, getTopGenres } from "../services/recommendationService";
import { useMusicContext } from "../App";
import { getPreferences, onSWMessage } from "../services/swService";

export default function Dashboard() {
  const { songs, userTastes, cloudArtistTastes, currentSong, isPlaying, isLoading, playSong, addToQueue } = useMusicContext();
  const [fogArtistTastes, setFogArtistTastes] = useState({});
  const [fogGenreTastes, setFogGenreTastes] = useState({});

  // Cargar preferencias del SW (Fog) incluyendo artistas
  useEffect(() => {
    const loadFogPrefs = async () => {
      const prefs = await getPreferences();
      if (prefs?.preferences) {
        setFogArtistTastes(prefs.preferences.artistPlays || {});
        setFogGenreTastes(prefs.preferences.genrePlays || {});
        console.log("🌫️ [Dashboard] Preferencias FOG cargadas:");
        console.log("   🎤 Artistas:", Object.keys(prefs.preferences.artistPlays || {}).length);
        console.log("   🎵 Géneros:", Object.keys(prefs.preferences.genrePlays || {}).length);
      }
    };
    loadFogPrefs();
  }, []);

  // Escuchar actualizaciones en tiempo real
  useEffect(() => {
    const removeHandler = onSWMessage("PREFERENCES_UPDATED", (payload) => {
      if (payload.preferences) {
        setFogArtistTastes(payload.preferences.artistPlays || {});
        setFogGenreTastes(payload.preferences.genrePlays || {});
        console.log("🔄 [Dashboard] Actualización en tiempo real recibida");
      }
    });
    return () => removeHandler();
  }, []);

  // Usar preferencias de FOG (tiempo real) o de DynamoDB (Cloud) como fallback
  const effectiveGenreTastes = Object.keys(fogGenreTastes).length > 0 ? fogGenreTastes : userTastes;
  const effectiveArtistTastes = Object.keys(fogArtistTastes).length > 0 ? fogArtistTastes : (cloudArtistTastes || {});

  // Calcular recomendaciones usando género Y artista
  const recommendations = useMemo(() => {
    return getRecommendedSongs(songs, effectiveGenreTastes, 10, effectiveArtistTastes);
  }, [songs, effectiveGenreTastes, effectiveArtistTastes]);

  // Obtener géneros favoritos
  const topGenres = useMemo(() => {
    return getTopGenres(effectiveGenreTastes, 3);
  }, [effectiveGenreTastes]);

  // Calcular puntuaciones de géneros
  const allGenres = useMemo(() => [...new Set(songs.map(s => s.genero))], [songs]);
  const genreScores = useMemo(() => {
    return calculateGenreScores(effectiveGenreTastes, allGenres);
  }, [effectiveGenreTastes, allGenres]);

  const totalPlays = Object.values(effectiveGenreTastes).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto my-10 px-4">
      {/* Header del Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {getGreeting()}, música para ti 🎵
          </h1>
          <p className="text-gray-400">
            {totalPlays === 0 
              ? "Escucha algunas canciones para que aprendamos tus gustos"
              : `Basado en tus ${totalPlays} reproducciones`
            }
          </p>
        </div>
        <Link
          to="/library"
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Ver biblioteca completa →
        </Link>
      </div>

      {/* Estadísticas del usuario */}
      {totalPlays > 0 && <UserStats tastes={userTastes} />}

      {/* Géneros favoritos */}
      {topGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topGenres.map(({ genre, count }) => (
            <span
              key={genre}
              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
            >
              {genre}: {count} reproducciones
            </span>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Recomendado para ti
        </h2>
        
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendations.map((song) => (
              <SongCard
                key={song.song_id}
                song={song}
                isCurrentSong={currentSong?.song_id === song.song_id}
                isPlaying={isPlaying && currentSong?.song_id === song.song_id}
                isLoading={isLoading && currentSong?.song_id === song.song_id}
                onPlay={playSong}
                onAddToQueue={addToQueue}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Cargando recomendaciones...</p>
          </div>
        )}
      </section>

      {/* Distribución de géneros */}
      {totalPlays > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            Tu perfil musical
          </h2>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(genreScores)
                .sort((a, b) => b[1] - a[1])
                .map(([genre, score]) => (
                  <div key={genre} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="transform -rotate-90 w-16 h-16">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#374151"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#22c55e"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${(score / 100) * 176} 176`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white">
                        {Math.round(score)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{genre}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}
