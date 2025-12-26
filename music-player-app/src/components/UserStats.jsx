// Componente de estadísticas del usuario (Fog Feature)
export default function UserStats({ tastes }) {
  const entries = Object.entries(tastes);
  
  if (entries.length === 0) {
    return null;
  }

  // Ordenar por cantidad de reproducciones
  const sortedTastes = entries.sort((a, b) => b[1] - a[1]);
  const totalPlays = entries.reduce((acc, [, count]) => acc + count, 0);

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        Tus gustos musicales (Fog Node)
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sortedTastes.map(([genre, count]) => {
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
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        Total de reproducciones: {totalPlays} | Datos guardados localmente (Fog Computing)
      </p>
    </div>
  );
}
