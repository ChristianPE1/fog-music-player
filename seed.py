
import os
import json
import hashlib
import uuid
import boto3
from pathlib import Path
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

AES_KEY = b"miclavesecretade32bytes123456789"  # 32 bytes

# Configuración AWS
AWS_PROFILE = "fog-music"
AWS_REGION = "us-east-1"
S3_BUCKET = "fog-music-media"
DYNAMODB_TABLE = "fog-music-songs"

# Rutas locales
BASE_DIR = Path(__file__).parent
AUDIOS_DIR = BASE_DIR / "audios"
THUMBNAILS_DIR = BASE_DIR / "miniaturas"
METADATA_FILE = BASE_DIR / "metadata.json"



def encrypt_file(file_path: Path, key: bytes) -> tuple[bytes, bytes]:
    # Retorna (iv, encrypted_data)
    # Generar IV aleatorio (16 bytes)
    iv = os.urandom(16)
    
    # Leer archivo original
    with open(file_path, "rb") as f:
        data = f.read()
    
    # Padding PKCS7 (AES requiere bloques de 16 bytes)
    block_size = 16
    padding_length = block_size - (len(data) % block_size)
    data += bytes([padding_length]) * padding_length
    
    # Encriptar
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(data) + encryptor.finalize()
    
    return iv, encrypted_data


def generate_song_id(filename: str) -> str:
    """Genera un ID único basado en el nombre del archivo."""
    return hashlib.md5(filename.encode()).hexdigest()[:12]


# Funciones AWS

def get_aws_clients():
    # Inicializa clientes de AWS.
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=AWS_REGION)
    s3 = session.client("s3")
    dynamodb = session.resource("dynamodb")
    return s3, dynamodb


def upload_encrypted_song(s3_client, song_id: str, iv: bytes, encrypted_data: bytes):
    # Subir canción encriptada a S3. El IV se guarda al inicio del archivo.
    # Concatenar IV + datos encriptados
    full_data = iv + encrypted_data
    
    key = f"songs/{song_id}.enc"
    s3_client.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=full_data,
        ContentType="application/octet-stream"
    )
    print(f"Subido: {key}")
    return key


def upload_thumbnail(s3_client, song_id: str, thumbnail_path: Path):
    # Subir miniatura a S3.
    if not thumbnail_path.exists():
        print(f"No se encontró miniatura: {thumbnail_path.name}")
        return None
    
    key = f"thumbnails/{song_id}.jpg"
    with open(thumbnail_path, "rb") as f:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=key,
            Body=f.read(),
            ContentType="image/jpeg"
        )
    print(f"Subido: {key}")
    return key


def register_song_metadata(dynamodb, song_id: str, metadata: dict, s3_song_key: str, s3_thumbnail_key: str):
    # Registra metadata de canción en DynamoDB.
    table = dynamodb.Table(DYNAMODB_TABLE)
    
    item = {
        "song_id": song_id,
        "titulo": metadata["titulo"],
        "artista": metadata["artista"],
        "genero": metadata["genero"],
        "s3_song_key": s3_song_key,
        "s3_thumbnail_key": s3_thumbnail_key or "",
        "bucket": S3_BUCKET,
        "region": AWS_REGION
    }
    
    table.put_item(Item=item)
    print(f"Registrado en DynamoDB: {song_id}")


# Procesamiento Principal

def find_matching_audio(titulo: str, artista: str) -> Path | None:
    # Busca el archivo de audio que coincida con el título y artista.
    # Buscar en todos los archivos MP3
    for audio_file in AUDIOS_DIR.glob("*.mp3"):
        filename = audio_file.name
        # Verificar si el artista está en el nombre del archivo
        if artista.split(",")[0].strip().lower() in filename.lower():
            # Verificar si el título está en el nombre del archivo
            if titulo.lower() in filename.lower():
                return audio_file
    
    # Segunda pasada: buscar solo por título
    for audio_file in AUDIOS_DIR.glob("*.mp3"):
        if titulo.lower() in audio_file.name.lower():
            return audio_file
    
    return None


def find_matching_thumbnail(audio_filename: str) -> Path | None:
    # Busca la miniatura correspondiente al audio.
    # El thumbnail tiene el mismo nombre pero con extensión .jpg
    base_name = Path(audio_filename).stem
    thumbnail_path = THUMBNAILS_DIR / f"{base_name}.jpg"
    
    if thumbnail_path.exists():
        return thumbnail_path
    
    return None


def main():
    
    # Verificar que existan los directorios
    if not AUDIOS_DIR.exists():
        print(f"Error: No existe el directorio {AUDIOS_DIR}")
        return
    
    if not METADATA_FILE.exists():
        print(f"Error: No existe el archivo {METADATA_FILE}")
        return
    
    # Cargar metadata
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        songs_metadata = json.load(f)
    
    print(f"Cargadas {len(songs_metadata)} canciones del metadata.json")
    
    # Inicializar AWS
    s3_client, dynamodb = get_aws_clients()
    print("Conexión establecida\n")

    # Procesar cada canción
    processed = 0
    errors = 0
    
    for i, song in enumerate(songs_metadata, 1):
        titulo = song["titulo"]
        artista = song["artista"]
        genero = song["genero"]
        
        print(f"\n[{i}/{len(songs_metadata)}] Procesando: {titulo} - {artista}")
        
        # Buscar archivo de audio
        audio_path = find_matching_audio(titulo, artista)
        
        if not audio_path:
            print(f"[Error]  No se encontró archivo de audio para: {titulo}")
            errors += 1
            continue
        
        # Generar ID único
        song_id = generate_song_id(audio_path.name)
        
        # Encriptar audio
        print("Encriptando...")
        iv, encrypted_data = encrypt_file(audio_path, AES_KEY)
        
        # Subir a S3
        s3_song_key = upload_encrypted_song(s3_client, song_id, iv, encrypted_data)
        
        # Buscar y subir thumbnail
        thumbnail_path = find_matching_thumbnail(audio_path.name)
        s3_thumbnail_key = None
        if thumbnail_path:
            s3_thumbnail_key = upload_thumbnail(s3_client, song_id, thumbnail_path)
        
        # Registrar en DynamoDB
        register_song_metadata(dynamodb, song_id, song, s3_song_key, s3_thumbnail_key)
        
        processed += 1
    
    # Resumen
    print("\nRESUMEN")
    print(f"Procesadas correctamente: {processed}")
    print(f"Errores: {errors}")
    print(f"Bucket S3: {S3_BUCKET}")
    print(f"Tabla DynamoDB: {DYNAMODB_TABLE}")


if __name__ == "__main__":
    main()
