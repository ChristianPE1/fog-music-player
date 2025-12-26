import { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import { initializeAWS, getAllSongs, getUserTastes } from "./services/awsService";
import { useMusicPlayer } from "./hooks/useMusicPlayer";
import { registerServiceWorker } from "./services/swService";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import PlayerBar from "./components/PlayerBar";
import QueuePanel from "./components/QueuePanel";

// Context para compartir estado del player
export const MusicContext = createContext(null);
export const useMusicContext = () => useContext(MusicContext);

function App() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTastes, setUserTastes] = useState({});
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
        
        const [songsData, tastes] = await Promise.all([
          getAllSongs(),
          getUserTastes(),
        ]);
        
        setSongs(songsData);
        setUserTastes(tastes);
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
    const tastes = await getUserTastes();
    setUserTastes(tastes);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
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
    <MusicContext.Provider value={{ ...player, songs, userTastes, refreshTastes }}>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
                  Fog Music
                </span>
              </div>

              {/* Nav Links */}
              <div className="flex items-center gap-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                    Para ti
                  </span>
                </NavLink>
                <NavLink
                  to="/library"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z" />
                    </svg>
                    Biblioteca
                  </span>
                </NavLink>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2 rounded-lg transition-all ${
                    showQueue
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                  title="Cola de reproducción"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                  </svg>
                </button>
                <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-full">
                  {songs.length} canciones
                </span>
              </div>
            </div>
          </div>
        </nav>

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
