import { useState, useEffect, useRef } from "react";
import { FiUser, FiClock, FiMusic } from "react-icons/fi";
import { useMusicContext } from "../contexts/MusicContext";
import { getPreferences } from "../services/swService";

export default function Profile() {
  const { userTastes, cloudArtistTastes } = useMusicContext();
  const [fogStats, setFogStats] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    const loadFogStats = async () => {
      const prefs = await getPreferences();
      if (prefs) {
        setFogStats(prefs);
      }
      loadedRef.current = true;
    };
    loadFogStats();
  }, []);

  const formatListeningTime = (seconds) => {
    if (!seconds) return "0 min";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const effectiveGenres = fogStats?.preferences?.genrePlays || userTastes || {};
  const effectiveArtists = fogStats?.preferences?.artistPlays || cloudArtistTastes || {};

  const topGenres = Object.entries(effectiveGenres)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topArtists = Object.entries(effectiveArtists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const totalPlays = topGenres.reduce((acc, [, count]) => acc + count, 0);
  const totalListeningTime = fogStats?.totalListeningTime || 0;
  const searchHistory = fogStats?.searchHistory || [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800/60 flex items-center justify-center border border-gray-700">
          <FiUser className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Tu Perfil Musical</h1>
        <p className="text-gray-400">
          Estadísticas procesadas localmente con Fog Computing
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-center max-w-xl mx-auto">
        {/* Tiempo escuchando */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FiClock className="w-4 h-4 text-emerald-300" />
            <span className="text-xs text-gray-300 uppercase tracking-wide">Tiempo escuchando</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {formatListeningTime(totalListeningTime)}
          </p>
        </div>

        {/* Total reproducciones */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FiMusic className="w-4 h-4 text-purple-300" />
            <span className="text-xs text-gray-300 uppercase tracking-wide">Reproducciones</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalPlays}</p>
        </div>

        {/* Géneros */}
        <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <FiMusic className="w-4 h-4 text-blue-300" />
            <span className="text-xs text-gray-300 uppercase tracking-wide">Géneros</span>
          </div>
          <p className="text-2xl font-bold text-white">{Object.keys(effectiveGenres).length}</p>
        </div>

      </div>

      {/* Top Géneros */}
      <section className="bg-gray-800/40 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <FiMusic className="w-6 h-6 text-blue-300" />
          <h2 className="text-xl font-semibold text-white">Top 10 Géneros</h2>
        </div>

        {topGenres.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topGenres.map(([genre, count]) => (
              <div key={genre} className="flex items-center justify-between bg-gray-900/40 p-3 rounded">
                <div className="text-sm text-gray-200">{genre}</div>
                <div className="text-sm text-gray-400">{count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No hay datos</div>
        )}
      </section>

      {/* Top Artists */}
      <section className="bg-gray-800/40 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <FiMusic className="w-6 h-6 text-purple-300" />
          <h2 className="text-xl font-semibold text-white">Top Artistas</h2>
        </div>
        {topArtists.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {topArtists.map(([artist, count]) => (
              <div key={artist} className="flex items-center justify-between p-2 rounded bg-gray-900/40">
                <div className="text-sm text-gray-200 truncate">{artist}</div>
                <div className="text-sm text-gray-400">{count}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No hay datos</div>
        )}
      </section>
    </div>
  );
}
