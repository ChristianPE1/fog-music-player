import { createContext, useContext } from "react";

// Context para compartir estado del player
export const MusicContext = createContext(null);

// Hook personalizado para usar el contexto
export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext debe usarse dentro de MusicProvider');
  }
  return context;
};
