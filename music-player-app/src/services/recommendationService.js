// Servicio de Recomendaciones y Preferencias
// Este servicio maneja la lógica de aprendizaje de gustos del usuario

const PREFERENCES_KEY = "fog-music-preferences";
const PLAY_HISTORY_KEY = "fog-music-play-history";

// ============================================
// Gestión de Preferencias Locales
// ============================================

export function getLocalPreferences() {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveLocalPreferences(preferences) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function getPlayHistory() {
  try {
    const stored = localStorage.getItem(PLAY_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToPlayHistory(song) {
  const history = getPlayHistory();
  history.unshift({
    song_id: song.song_id,
    genero: song.genero,
    timestamp: Date.now(),
  });
  // Mantener solo las últimas 100 reproducciones
  const trimmed = history.slice(0, 100);
  localStorage.setItem(PLAY_HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

// ============================================
// Algoritmo de Puntuación de Géneros
// ============================================

export function calculateGenreScores(tastes, allGenres) {
  const totalPlays = Object.values(tastes).reduce((a, b) => a + b, 0);
  
  if (totalPlays === 0) {
    // Sin historial: distribución uniforme
    const uniformScore = 100 / allGenres.length;
    return allGenres.reduce((acc, genre) => {
      acc[genre] = uniformScore;
      return acc;
    }, {});
  }

  // Calcular porcentaje para cada género
  const scores = {};
  for (const genre of allGenres) {
    const plays = tastes[genre] || 0;
    scores[genre] = (plays / totalPlays) * 100;
  }

  return scores;
}

// ============================================
// Algoritmo de Recomendación (Género + Artista)
// ============================================

export function getRecommendedSongs(songs, tastes, count = 10, artistTastes = {}) {
  if (songs.length === 0) return [];

  const allGenres = [...new Set(songs.map(s => s.genero))];
  const genreScores = calculateGenreScores(tastes, allGenres);
  
  // Calcular puntuaciones de artistas
  const totalArtistPlays = Object.values(artistTastes).reduce((a, b) => a + b, 0);
  const artistScores = {};
  if (totalArtistPlays > 0) {
    Object.entries(artistTastes).forEach(([artist, plays]) => {
      artistScores[artist] = (plays / totalArtistPlays) * 100;
    });
  }
  
  // Calcular puntuación combinada para cada canción
  const scoredSongs = songs.map(song => {
    const genreScore = genreScores[song.genero] || 0;
    const artistScore = artistScores[song.artista] || 0;
    // Peso: 60% género, 40% artista
    const combinedScore = (genreScore * 0.6) + (artistScore * 0.4);
    // Añadir algo de aleatoriedad para variedad
    const randomFactor = Math.random() * 10;
    return {
      ...song,
      score: combinedScore + randomFactor
    };
  });

  // Ordenar por puntuación combinada
  scoredSongs.sort((a, b) => b.score - a.score);

  // Seleccionar las mejores canciones, evitando demasiadas del mismo artista
  const recommendations = [];
  const artistCount = {};
  const maxPerArtist = 3;

  for (const song of scoredSongs) {
    if (recommendations.length >= count) break;
    
    const currentArtistCount = artistCount[song.artista] || 0;
    if (currentArtistCount < maxPerArtist) {
      recommendations.push(song);
      artistCount[song.artista] = currentArtistCount + 1;
    }
  }

  // Si no llenamos las recomendaciones, agregar más canciones
  if (recommendations.length < count) {
    for (const song of scoredSongs) {
      if (recommendations.length >= count) break;
      if (!recommendations.some(r => r.song_id === song.song_id)) {
        recommendations.push(song);
      }
    }
  }

  return recommendations;
}

// ============================================
// Cola de Reproducción Automática
// ============================================

export function generateAutoQueue(songs, tastes, currentSong, queueSize = 10, artistTastes = {}) {
  // Filtrar la canción actual
  const availableSongs = songs.filter(s => s.song_id !== currentSong?.song_id);
  
  // Usar el algoritmo de recomendación mejorado para la cola
  const queue = getRecommendedSongs(availableSongs, tastes, queueSize, artistTastes);
  
  return queue;
}

// ============================================
// Obtener géneros ordenados por preferencia
// ============================================

export function getTopGenres(tastes, limit = 3) {
  return Object.entries(tastes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre, count]) => ({ genre, count }));
}
