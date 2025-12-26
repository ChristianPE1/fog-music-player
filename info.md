
1. Instála: `pip install yt-dlp` (o con `brew`/`apt` si estás en Linux/Mac).
2. Crea una Playlist en YouTube con las 200 canciones que quieras (o busca una pública tipo "Top 200 Pop 2024").
3. Ejecuta este comando en tu terminal:

```bash
yt-dlp -x --audio-format mp3 --audio-quality 128K --add-metadata --output "%(title)s.%(ext)s" https://www.youtube.com/playlist?list=PLO7-VO1D0_6MlO4UxJWFBUq3U-7zoIBf7
```

* `-x`: Extrae solo el audio.
* `--audio-format mp3`: Lo convierte a MP3.
* `--audio-quality 128K`: **Clave.** Baja la calidad a 128kbps. Esto dejará las canciones en unos **2.5MB - 3.5MB** cada una.
* `--add-metadata`: Agrega Artista y Título al archivo (útil para tu base de datos).

# solo bajar imagenes

yt-dlp --skip-download --write-thumbnail --convert-thumbnails jpg --exec "ffmpeg -y -i {} -vf scale=300:-1 -q:v 3 {}.small.jpg && mv {}.small.jpg {}" --output "%(title)s.%(ext)s" [URL_PLAYLIST]