// Componente Player mejorado - Barra tipo Spotify
import { useState } from "react";
import { getThumbnailUrl } from "../services/awsService";
import { useMusicContext } from "../App";

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
    formatTime,
  } = useMusicContext();

  const [showVolume, setShowVolume] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

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
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-gray-900 border-t border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-gray-500">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          Selecciona una canción para reproducir
        </div>
      </div>
    );
  }

  const thumbnailUrl = getThumbnailUrl(currentSong);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-gray-900 to-gray-900/95 border-t border-gray-800">
      {/* Progress bar */}
      <div
        className="h-1 bg-gray-700 cursor-pointer group relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percentage = ((e.clientX - rect.left) / rect.width) * 100;
          seek(percentage);
        }}
      >
        <div
          className="h-full bg-green-500 transition-all duration-100 group-hover:bg-green-400 relative"
          style={{ width: `${progress}%` }}
        >
          {/* Knob */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Song info */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          <div className="relative group">
            <img
              src={thumbnailUrl}
              alt={currentSong.titulo}
              className="w-14 h-14 rounded-md object-cover shadow-lg"
              onError={(e) => {
                e.target.src = "/default-album.svg";
              }}
            />
            {isPlaying && (
              <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-white truncate hover:underline cursor-pointer">
              {currentSong.titulo}
            </h4>
            <p className="text-sm text-gray-400 truncate hover:underline cursor-pointer">
              {currentSong.artista}
            </p>
          </div>
          {/* Like button */}
          <button className="p-2 text-gray-400 hover:text-green-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            {/* Shuffle */}
            <button className="text-gray-400 hover:text-white transition-colors p-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>

            {/* Previous */}
            <button
              onClick={playPrevious}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center
                         hover:scale-105 active:scale-95 transition-transform disabled:opacity-50
                         shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={playNext}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Repeat */}
            <button className="text-gray-400 hover:text-white transition-colors p-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            </button>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div className="w-96 h-1 bg-gray-600 rounded-full hidden md:block">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="w-1/4 flex items-center justify-end gap-2">
          {/* Queue button */}
          <button
            onClick={onQueueClick}
            className={`p-2 transition-colors ${
              queue?.length > 0 ? "text-green-500" : "text-gray-400 hover:text-white"
            }`}
            title={`Cola: ${queue?.length || 0} canciones`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
          </button>

          {/* Volume */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
          >
            <button
              onClick={handleMuteToggle}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {volume === 0 || isMuted ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <div
              className={`flex items-center transition-all duration-200 ${
                showVolume ? "w-24 opacity-100" : "w-0 opacity-0 overflow-hidden"
              }`}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  changeVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-3
                           [&::-webkit-slider-thumb]:h-3
                           [&::-webkit-slider-thumb]:bg-white
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:hover:scale-110
                           [&::-webkit-slider-thumb]:transition-transform"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
