// Configuración de AWS para Fog Music Player

export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  identityPoolId: import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID,
  s3Bucket: import.meta.env.VITE_S3_MEDIA_BUCKET,
  dynamoDbTable: import.meta.env.VITE_DYNAMODB_SONGS_TABLE,
  usersTable: import.meta.env.VITE_DYNAMODB_USERS_TABLE,
  apiGatewayUrl: import.meta.env.VITE_API_GATEWAY_URL,
  apiKey: import.meta.env.VITE_API_KEY
};

// Clave de encriptación
export const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;
