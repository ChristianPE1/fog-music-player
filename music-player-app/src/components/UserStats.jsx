// Componente de estadísticas del usuario (Fog Feature)
import { useState, useEffect, useRef } from "react";
import { FiClock, FiMic, FiMusic, FiSearch, FiCloud, FiActivity } from "react-icons/fi";
import { getPreferences } from "../services/swService";

export default function UserStats({ tastes }) {
  const [fogStats, setFogStats] = useState(null);
  const loadedRef = useRef(false);

  // Cargar estadísticas del Service Worker (solo una vez)
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

  const entries = Object.entries(tastes || {});
  
  // Formatear tiempo
  const formatListeningTime = (seconds) => {
    if (!seconds) return "0 min";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <FiActivity className="w-5 h-5 text-green-500" />
        Tus gustos musicales (Fog Computing)
      </h3>

      {/* Estadísticas principales de FOG */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Tiempo total escuchando */}
        <div className="bg-linear-to-br from-emerald-500/20 to-emerald-600/10 rounded-lg p-3 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FiClock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 uppercase">Tiempo escuchando</span>
          </div>
          <p className="text-xl font-bold text-white">
            {formatListeningTime(fogStats?.totalListeningTime)}
          </p>
        </div>

        {/* Artista favorito */}
        <div className="bg-linear-to-br from-purple-500/20 to-purple-600/10 rounded-lg p-3 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FiMic className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-purple-300 uppercase">Artista favorito</span>
          </div>
          {fogStats?.topArtists?.[0] ? (
            <>
              <p className="text-lg font-bold text-white truncate">
                {fogStats.topArtists[0].artist}
              </p>
              <p className="text-xs text-purple-300">{fogStats.topArtists[0].plays} reproducciones</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin datos aún</p>
          )}
        </div>

        {/* Género favorito */}
        <div className="bg-linear-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-3 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FiMusic className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300 uppercase">Género favorito</span>
          </div>
          {fogStats?.topGenres?.[0] ? (
            <>
              <p className="text-lg font-bold text-white truncate">
                {fogStats.topGenres[0].genre}
              </p>
              <p className="text-xs text-blue-300">{fogStats.topGenres[0].plays} reproducciones</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sin datos aún</p>
          )}
        </div>

        {/* Búsquedas */}
        <div className="bg-linear-to-br from-orange-500/20 to-orange-600/10 rounded-lg p-3 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-1">
            <FiSearch className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-orange-300 uppercase">Búsquedas</span>
          </div>
          <p className="text-xl font-bold text-white">
            {fogStats?.searchHistory?.length || 0}
          </p>
          {fogStats?.searchHistory?.[0] && (
            <p className="text-xs text-orange-300 truncate">
              Última: "{fogStats.searchHistory[fogStats.searchHistory.length - 1]?.query}"
            </p>
          )}
        </div>
      </div>

      {/* Top Artistas */}
      {fogStats?.topArtists && fogStats.topArtists.length > 1 && (
        <div className="mb-4">
          <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <FiMic className="w-4 h-4" /> Top Artistas
          </h4>
          <div className="flex flex-wrap gap-2">
            {fogStats.topArtists.slice(0, 5).map(({ artist, plays }, index) => (
              <span 
                key={artist} 
                className={`px-3 py-1 rounded-full text-sm ${
                  index === 0 
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50' 
                    : 'bg-gray-700/50 text-gray-300'
                }`}
              >
                {artist} ({plays})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Géneros por reproducciones */}
      {entries.length > 0 ? (
        <>
          <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
            <FiMusic className="w-4 h-4" /> Géneros escuchados
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {entries
              .sort((a, b) => b[1] - a[1])
              .map(([genre, count]) => {
                const totalPlays = entries.reduce((acc, [, c]) => acc + c, 0);
                const percentage = Math.round((count / totalPlays) * 100);
                return (
                  <div key={genre} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-300">{genre}</span>
                      <span className="text-xs text-gray-500">{count} plays</span>
                    </div>
                    <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">{percentage}%</p>
                  </div>
                );
              })}
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>Aún no hay datos de géneros</p>
          <p className="text-sm">Escucha algunas canciones para empezar</p>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <FiCloud className="w-3 h-3" /> Datos procesados localmente (Fog Computing)
        </p>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <FiCloud className="w-3 h-3" /> Sync cada 3 min
        </p>
      </div>
    </div>
  );
}
