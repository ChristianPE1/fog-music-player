import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { awsConfig } from "../config/aws";

let credentials = null;
let dynamoDbClient = null;
let docClient = null;
let s3Client = null;
let deviceId = null;

// ============================================
// Inicialización de Credenciales
// ============================================

export async function initializeAWS() {
  if (credentials) return credentials;

  // Obtener credenciales anónimas de Cognito
  credentials = fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: awsConfig.region }),
    identityPoolId: awsConfig.identityPoolId,
  });

  // Inicializar DynamoDB
  dynamoDbClient = new DynamoDBClient({
    region: awsConfig.region,
    credentials,
  });

  docClient = DynamoDBDocumentClient.from(dynamoDbClient);

  // Inicializar S3
  s3Client = new S3Client({
    region: awsConfig.region,
    credentials,
  });

  // Generar o recuperar device ID
  deviceId = getOrCreateDeviceId();

  console.log("AWS inicializado con Cognito Identity Pool");
  console.log("Device ID:", deviceId);

  return credentials;
}

// ============================================
// Gestión de Device ID
// ============================================

function getOrCreateDeviceId() {
  let id = localStorage.getItem("fog-music-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("fog-music-device-id", id);
  }
  return id;
}

export function getDeviceId() {
  return deviceId || getOrCreateDeviceId();
}

// ============================================
// Operaciones con DynamoDB - Catálogo
// ============================================

export async function getAllSongs() {
  if (!docClient) await initializeAWS();

  const command = new ScanCommand({
    TableName: awsConfig.dynamoDbTable,
  });

  const response = await docClient.send(command);
  return response.Items || [];
}

// ============================================
// Operaciones con DynamoDB - Usuarios
// ============================================

export async function getUserTastes() {
  if (!docClient) await initializeAWS();

  const command = new GetCommand({
    TableName: awsConfig.usersTable,
    Key: { device_id: getDeviceId() },
  });

  try {
    const response = await docClient.send(command);
    return response.Item?.tastes || {};
  } catch (error) {
    console.log("No hay datos previos del usuario");
    return {};
  }
}

// Obtener datos completos del usuario (géneros + artistas)
export async function getUserFullProfile() {
  // Si hay API Gateway configurada, usar Lambda
  if (awsConfig.apiGatewayUrl) {
    try {
      const response = await fetch(awsConfig.apiGatewayUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': awsConfig.apiKey  
        },
        body: JSON.stringify({
          action: 'get_profile',
          device_id: getDeviceId()
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log("API Gateway no disponible, usando DynamoDB directo");
    }
  }

  // Fallback a DynamoDB directo (solo lectura permitida)
  if (!docClient) await initializeAWS();

  const command = new GetCommand({
    TableName: awsConfig.usersTable,
    Key: { device_id: getDeviceId() },
  });

  try {
    const response = await docClient.send(command);
    const item = response.Item || {};
    return {
      genreTastes: item.tastes || {},
      artistTastes: item.artist_tastes || {},
      totalListeningTime: item.total_listening_time || 0,
      searchHistory: item.search_history || [],
      lastSync: item.last_sync || null
    };
  } catch (error) {
    console.log("No hay datos previos del usuario");
    return {
      genreTastes: {},
      artistTastes: {},
      totalListeningTime: 0,
      searchHistory: [],
      lastSync: null
    };
  }
}

export async function updateUserTastes(genero) {
  // Usar API Gateway si está configurada (mas seguro)
  if (awsConfig.apiGatewayUrl) {
    try {
      const response = await fetch(awsConfig.apiGatewayUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': awsConfig.apiKey  
        },
        body: JSON.stringify({
          action: 'update_tastes',
          device_id: getDeviceId(),
          genero: genero
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[AWS] Gustos actualizados via API: ${genero}`);
        return result.tastes || {};
      }
    } catch (error) {
      console.error("[AWS] Error en API Gateway:", error.message);
    }
    return {};
  }

  // Fallback a DynamoDB directo
  if (!docClient) await initializeAWS();

  // Primero obtener gustos actuales
  const currentTastes = await getUserTastes();
  
  // Incrementar contador del género
  const newCount = (currentTastes[genero] || 0) + 1;
  currentTastes[genero] = newCount;

  const command = new PutCommand({
    TableName: awsConfig.usersTable,
    Item: {
      device_id: getDeviceId(),
      tastes: currentTastes,
      last_updated: new Date().toISOString(),
    },
  });

  await docClient.send(command);
  console.log(`[AWS] Gustos actualizados: ${genero} = ${newCount}`);
  
  return currentTastes;
}

// ============================================
// Sincronización de Preferencias FOG -> DynamoDB
// ============================================

export async function syncPreferencesToDynamo(preferences, topArtists, topGenres) {
  console.log("[AWS] Sincronizando preferencias FOG...");
  console.log("Tiempo total escuchado:", preferences.totalListeningTime, "segundos");
  console.log("Top Artistas:", topArtists.length);
  console.log("Top Generos:", topGenres.length);

  // Usar API Gateway si está configurada (mas seguro)
  if (awsConfig.apiGatewayUrl) {
    try {
      const response = await fetch(awsConfig.apiGatewayUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': awsConfig.apiKey  
        },
        body: JSON.stringify({
          action: 'sync_preferences',
          device_id: getDeviceId(),
          preferences: {
            totalListeningTime: preferences.totalListeningTime || 0,
            playTime: preferences.playTime || {},
            searchHistory: (preferences.searchHistory || []).slice(-20)
          },
          topArtists: topArtists,
          topGenres: topGenres
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("[AWS] Preferencias sincronizadas via API Gateway:", result.timestamp);
        return true;
      } else {
        console.error("[AWS] Error en API Gateway:", response.status);
      }
    } catch (error) {
      console.error("[AWS] Error al conectar con API Gateway:", error.message);
    }
    return false;
  }

  // Fallback a DynamoDB directo (requiere permisos de escritura)
  if (!docClient) await initializeAWS();

  // Convertir artistas a objeto para DynamoDB
  const artistTastes = {};
  topArtists.forEach(({ artist, plays }) => {
    artistTastes[artist] = plays;
  });

  // Convertir géneros a objeto para DynamoDB
  const genreTastes = {};
  topGenres.forEach(({ genre, plays }) => {
    genreTastes[genre] = plays;
  });

  const command = new PutCommand({
    TableName: awsConfig.usersTable,
    Item: {
      device_id: getDeviceId(),
      tastes: genreTastes,
      artist_tastes: artistTastes,
      play_time: preferences.playTime || {},
      total_listening_time: preferences.totalListeningTime || 0,
      search_history: (preferences.searchHistory || []).slice(-20),
      last_sync: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    },
  });

  await docClient.send(command);
  console.log("[AWS] Preferencias sincronizadas con DynamoDB exitosamente");
  
  return true;
}

// ============================================
// Descarga de archivos S3 con credenciales
// ============================================

export async function downloadSongFromS3(s3Key) {
  if (!s3Client) await initializeAWS();

  console.log("Descargando desde S3 con credenciales Cognito:", s3Key);

  const command = new GetObjectCommand({
    Bucket: awsConfig.s3Bucket,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  
  // Convertir stream a ArrayBuffer
  const chunks = [];
  const reader = response.Body.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  // Combinar chunks en un solo Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  console.log("Descarga completada:", s3Key, "Tamaño:", result.length);
  return result;
}

// ============================================
// URL de S3 (para thumbnails públicos)
// ============================================

export function getS3Url(key) {
  return `https://${awsConfig.s3Bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`;
}

export function getThumbnailUrl(song) {
  if (song.s3_thumbnail_key) {
    return getS3Url(song.s3_thumbnail_key);
  }
  // Imagen por defecto
  return "/default-album.png";
}

export function getSongKey(song) {
  return song.s3_song_key;
}
