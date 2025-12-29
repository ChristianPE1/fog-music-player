// Configuración de AWS para Fog Music Player

export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID || "us-east-1:1c31ee03-726c-4017-ae01-c248bf363b30",
  s3Bucket: import.meta.env.VITE_S3_MEDIA_BUCKET || "fog-music-media",
  dynamoDbTable: import.meta.env.VITE_DYNAMODB_SONGS_TABLE || "fog-music-songs",
  usersTable: import.meta.env.VITE_DYNAMODB_USERS_TABLE || "fog-music-users",
  // API Gateway URL para operaciones seguras via Lambda
  apiGatewayUrl: import.meta.env.VITE_API_GATEWAY_URL || ""
};

// Clave usada en seed.py
export const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "miclavesecretade32bytes123456789";
