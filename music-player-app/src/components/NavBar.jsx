import { NavLink } from "react-router-dom";
import { FiHome, FiMusic, FiUser, FiList } from "react-icons/fi";
import { RiNeteaseCloudMusicLine } from "react-icons/ri";

export default function NavBar({ showQueue, setShowQueue }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <RiNeteaseCloudMusicLine className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              Fog<span className="text-emerald-400 group-hover:text-white transition-colors">Music</span>
            </span>
          </div>

          {/* Nav Links - Centered Pill */}
          <div className="hidden md:flex items-center bg-white/5 rounded-full p-1.5 border border-white/5 backdrop-blur-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <FiHome className="w-4 h-4" />
              Descubrir
            </NavLink>
            <NavLink
              to="/library"
              className={({ isActive }) =>
                `px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <FiMusic className="w-4 h-4" />
              Biblioteca
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <FiUser className="w-4 h-4" />
              Perfil
            </NavLink>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`p-3 rounded-xl transition-all duration-300 border ${
                showQueue
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10"
              }`}
              title="Cola de reproducción"
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}