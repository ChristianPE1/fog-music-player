// Configuración de AWS para Fog Music Player
// Estos valores vienen del output de Pulumi

export const awsConfig = {
  region: "us-east-1",
  identityPoolId: "us-east-1:1c31ee03-726c-4017-ae01-c248bf363b30",
  s3Bucket: "fog-music-media",
  dynamoDbTable: "fog-music-songs",
  usersTable: "fog-music-users"
};

// Clave AES-256 hardcodeada (SOLO PARA DESARROLLO)
// Esta clave debe coincidir con la usada en seed.py
export const ENCRYPTION_KEY = "miclavesecretade32bytes123456789";
