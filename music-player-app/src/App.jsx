import { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route } from "react-router-dom";
import { initializeAWS, getAllSongs, getUserFullProfile } from "./services/awsService";
import { useMusicPlayer } from "./hooks/useMusicPlayer";
import { registerServiceWorker } from "./services/swService";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import PlayerBar from "./components/PlayerBar";
import QueuePanel from "./components/QueuePanel";
import NavBar from "./components/NavBar";

// Context para compartir estado del player
export const MusicContext = createContext(null);
export const useMusicContext = () => useContext(MusicContext);

function App() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTastes, setUserTastes] = useState({});
  const [cloudArtistTastes, setCloudArtistTastes] = useState({});
  const [showQueue, setShowQueue] = useState(false);

  // Hook del player ahora recibe songs y tastes para la cola automática
  const player = useMusicPlayer(songs, userTastes);

  // Inicializar y cargar datos
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        
        // Registrar Service Worker
        registerServiceWorker();
        
        await initializeAWS();
        
        const [songsData, profile] = await Promise.all([
          getAllSongs(),
          getUserFullProfile(),
        ]);
        
        setSongs(songsData);
        setUserTastes(profile.genreTastes);
        setCloudArtistTastes(profile.artistTastes);
        
        console.log("☁️ [App] Perfil cargado desde Cloud:");
        console.log("   🎵 Géneros:", Object.keys(profile.genreTastes).length);
        console.log("   🎤 Artistas:", Object.keys(profile.artistTastes).length);
      } catch (err) {
        console.error("Error al inicializar:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Refrescar gustos periódicamente
  const refreshTastes = async () => {
    const profile = await getUserFullProfile();
    setUserTastes(profile.genreTastes);
    setCloudArtistTastes(profile.artistTastes);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-3 border-4 border-purple-500/30 rounded-full" />
            <div className="absolute inset-3 border-4 border-purple-500 border-b-transparent rounded-full animate-spin" style={{animationDirection: 'reverse'}} />
          </div>
          <p className="text-gray-400 font-medium">Iniciando Fog Music...</p>
          <p className="text-gray-600 text-sm mt-1">Sincronizando con la nube</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Error de conexión</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <MusicContext.Provider value={{ ...player, songs, userTastes, cloudArtistTastes, refreshTastes }}>
      <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
        {/* Navigation */}
        <NavBar showQueue={showQueue} setShowQueue={setShowQueue} songs={songs} />

        {/* Main Content */}
        <main className="flex-1 pt-16 pb-28 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </main>

        {/* Queue Panel */}
        <QueuePanel isOpen={showQueue} onClose={() => setShowQueue(false)} />

        {/* Player Bar */}
        <PlayerBar onQueueClick={() => setShowQueue(!showQueue)} />

        {/* Player Error Toast */}
        {player.error && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur px-4 py-2 rounded-lg text-white text-sm shadow-xl animate-pulse">
            {player.error}
          </div>
        )}
      </div>
    </MusicContext.Provider>
  );
}

export default App;
