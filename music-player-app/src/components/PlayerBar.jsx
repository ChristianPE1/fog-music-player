// PlayerBar modernizado
import { useState } from "react";
import { getThumbnailUrl } from "../services/awsService";
import { useMusicContext } from "../contexts/MusicContext";
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaVolumeUp, FaVolumeMute, FaHeart, FaRegHeart, FaListUl } from "react-icons/fa";

export default function PlayerBar({ onQueueClick }) {
  const {
    currentSong,
    isPlaying,
    isLoading,
    progress,
    currentTime,
    duration,
    volume,
    queue,
    togglePlay,
    seek,
    changeVolume,
    playNext,
    playPrevious,
    toggleLike,
    isLiked,
    formatTime,
  } = useMusicContext();

  const [showVolume, setShowVolume] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const currentIsLiked = currentSong ? isLiked(currentSong.song_id) : false;

  const handleMuteToggle = () => {
    if (isMuted) {
      changeVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      changeVolume(0);
      setIsMuted(true);
    }
  };

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-black/60 border-t border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-gray-400">
          Selecciona una canción para reproducir
        </div>
      </div>
    );
  }

  const thumbnailUrl = getThumbnailUrl(currentSong);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/60 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Left: Artwork + info */}
        <div className="flex items-center gap-3 min-w-0 w-1/3">
          <img src={thumbnailUrl} alt={currentSong.titulo} className="w-14 h-14 rounded-md object-cover shadow-sm" onError={(e)=>{e.target.src='/default-album.png'}} />
          <div className="min-w-0">
            <div className="text-sm text-gray-300 truncate font-semibold">{currentSong.titulo}</div>
            <div className="text-xs text-gray-500 truncate">{currentSong.artista}</div>
          </div>
        </div>

        {/* Center: Controls + progress */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-6">
            <button onClick={playPrevious} className="text-gray-300 hover:text-white disabled:opacity-50">
              <FaStepBackward className="w-5 h-5" />
            </button>

            <button onClick={togglePlay} className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <button onClick={playNext} className="text-gray-300 hover:text-white">
              <FaStepForward className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full mt-2">
            <div className="flex items-center text-xs text-gray-400 gap-3">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer" onClick={(e)=>{
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                seek(percentage);
              }}>
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${progress}%`}} />
              </div>
              <span className="w-8">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Right: Like, Queue, Volume */}
        <div className="w-1/3 flex items-center justify-end gap-4">
          {/* Like button */}
          <button
            onClick={() => toggleLike(currentSong)}
            className={`transition-colors ${currentIsLiked ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
            title={currentIsLiked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            {currentIsLiked ? <FaHeart className="w-5 h-5" /> : <FaRegHeart className="w-5 h-5" />}
          </button>

          {/* Queue button */}
          <button
            onClick={onQueueClick}
            className="text-gray-400 hover:text-white transition-colors"
            title="Cola de reproducción"
          >
            <FaListUl className="w-5 h-5" />
          </button>

          {/* Volume */}
          <div className="relative">
            <button onClick={handleMuteToggle} className="text-gray-300 hover:text-white">
              {volume > 0 ? <FaVolumeUp className="w-5 h-5" /> : <FaVolumeMute className="w-5 h-5" />}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => changeVolume(e.target.value / 100)}
            className="w-20 h-1 accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
