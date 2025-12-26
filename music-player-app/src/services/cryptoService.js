// Servicio de Desencriptación AES-256-CBC usando Web Crypto API
import { ENCRYPTION_KEY } from "../config/aws";
import { downloadSongFromS3 } from "./awsService";

// ============================================
// Desencriptación de Audio
// ============================================

export async function decryptAudio(encryptedData) {
  // Los primeros 16 bytes son el IV
  const iv = encryptedData.slice(0, 16);
  const ciphertext = encryptedData.slice(16);

  // Convertir la clave string a bytes
  const keyBytes = new TextEncoder().encode(ENCRYPTION_KEY);

  // Importar la clave para Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  // Desencriptar
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: iv },
    cryptoKey,
    ciphertext
  );

  // Remover padding PKCS7
  const decryptedArray = new Uint8Array(decrypted);
  const paddingLength = decryptedArray[decryptedArray.length - 1];
  const unpaddedData = decryptedArray.slice(0, decryptedArray.length - paddingLength);

  return unpaddedData;
}

// ============================================
// Descargar y Desencriptar Canción (usando S3 con Cognito)
// ============================================

export async function fetchAndDecryptSong(s3Key) {
  console.log("🔐 Descargando canción encriptada...", s3Key);
  
  // Descargar usando credenciales de Cognito
  const encryptedData = await downloadSongFromS3(s3Key);

  console.log("🔓 Desencriptando...");
  const decryptedData = await decryptAudio(encryptedData);

  // Crear Blob con el audio desencriptado
  const audioBlob = new Blob([decryptedData], { type: "audio/mpeg" });
  const audioUrl = URL.createObjectURL(audioBlob);

  console.log("✅ Audio listo para reproducir");
  return audioUrl;
}

// ============================================
// Liberar memoria
// ============================================

export function revokeAudioUrl(url) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
