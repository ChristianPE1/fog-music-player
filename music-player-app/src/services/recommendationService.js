// Servicio de Recomendaciones y Preferencias (Fog Computing)
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
// Algoritmo de Recomendación
// ============================================

export function getRecommendedSongs(songs, tastes, count = 10) {
  if (songs.length === 0) return [];

  const allGenres = [...new Set(songs.map(s => s.genero))];
  const scores = calculateGenreScores(tastes, allGenres);
  
  // Ordenar géneros por puntuación (de mayor a menor)
  const sortedGenres = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);

  const recommendations = [];
  const usedSongIds = new Set();

  // Iterar por géneros priorizando los favoritos
  for (const genre of sortedGenres) {
    if (recommendations.length >= count) break;

    // Obtener canciones de este género que no han sido agregadas
    const genreSongs = songs
      .filter(s => s.genero === genre && !usedSongIds.has(s.song_id))
      .sort(() => Math.random() - 0.5); // Shuffle aleatorio

    // Calcular cuántas canciones de este género incluir
    // Proporcional a la puntuación, pero al menos 1 si hay espacio
    const genreScore = scores[genre];
    let toInclude = Math.max(1, Math.round((genreScore / 100) * count));
    toInclude = Math.min(toInclude, genreSongs.length, count - recommendations.length);

    for (let i = 0; i < toInclude && recommendations.length < count; i++) {
      recommendations.push(genreSongs[i]);
      usedSongIds.add(genreSongs[i].song_id);
    }
  }

  // Si aún faltan canciones, completar con cualquier canción restante
  if (recommendations.length < count) {
    const remaining = songs
      .filter(s => !usedSongIds.has(s.song_id))
      .sort(() => Math.random() - 0.5);

    for (const song of remaining) {
      if (recommendations.length >= count) break;
      recommendations.push(song);
      usedSongIds.add(song.song_id);
    }
  }

  return recommendations;
}

// ============================================
// Cola de Reproducción Automática
// ============================================

export function generateAutoQueue(songs, tastes, currentSong, queueSize = 10) {
  // Filtrar la canción actual
  const availableSongs = songs.filter(s => s.song_id !== currentSong?.song_id);
  
  // Usar el algoritmo de recomendación para la cola
  const queue = getRecommendedSongs(availableSongs, tastes, queueSize);
  
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
