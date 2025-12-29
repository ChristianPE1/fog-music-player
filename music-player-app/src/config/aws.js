// Configuración de AWS para Fog Music Player
// Los valores pueden venir de variables de entorno o usar defaults

export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || "us-east-1:1c31ee03-726c-4017-ae01-c248bf363b30",
  s3Bucket: import.meta.env.VITE_S3_MEDIA_BUCKET || "fog-music-media",
  dynamoDbTable: import.meta.env.VITE_DYNAMODB_SONGS_TABLE || "fog-music-songs",
  usersTable: import.meta.env.VITE_DYNAMODB_USERS_TABLE || "fog-music-users"
};

// Clave AES-256 (SOLO PARA DESARROLLO)
// Esta clave debe coincidir con la usada en seed.py
export const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "miclavesecretade32bytes123456789";
