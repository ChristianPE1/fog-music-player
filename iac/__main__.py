"""
Fog Music Player - Infrastructure as Code (Pulumi)
Crea: S3 Bucket de Medios, DynamoDB (Catalogo y Usuarios), Cognito Identity Pool
"""

import pulumi
import pulumi_aws as aws
import json

# ============================================
# S3 Bucket de Medios
# ============================================

# Bucket principal para almacenar canciones encriptadas y thumbnails
media_bucket = aws.s3.Bucket(
    "fog-music-media-bucket",
    bucket="fog-music-media",
    force_destroy=True,  # Para desarrollo, permite destruir bucket con contenido
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Configuración de CORS para acceso desde el frontend
bucket_cors = aws.s3.BucketCorsConfigurationV2(
    "fog-music-media-cors",
    bucket=media_bucket.id,
    cors_rules=[
        {
            "allowed_headers": ["*"],
            "allowed_methods": ["GET", "HEAD"],
            "allowed_origins": ["*"],  # En producción, restringir al dominio
            "expose_headers": ["ETag"],
            "max_age_seconds": 3000
        }
    ]
)

# Política para hacer públicas las miniaturas (thumbnails/)
bucket_public_access_block = aws.s3.BucketPublicAccessBlock(
    "fog-music-media-public-access",
    bucket=media_bucket.id,
    block_public_acls=False,
    block_public_policy=False,
    ignore_public_acls=False,
    restrict_public_buckets=False
)

# Política del bucket para acceso público a thumbnails
bucket_policy = aws.s3.BucketPolicy(
    "fog-music-media-policy",
    bucket=media_bucket.id,
    policy=media_bucket.arn.apply(lambda arn: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadThumbnails",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"{arn}/thumbnails/*"
            }
        ]
    })),
    opts=pulumi.ResourceOptions(depends_on=[bucket_public_access_block])
)

# ============================================
# DynamoDB - Tabla de Catálogo de Canciones
# ============================================

songs_table = aws.dynamodb.Table(
    "fog-music-songs-catalog",
    name="fog-music-songs",
    billing_mode="PAY_PER_REQUEST",  # On-demand, paga solo por uso
    hash_key="song_id",
    attributes=[
        {
            "name": "song_id",
            "type": "S"
        }
    ],
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# ============================================
# DynamoDB - Tabla de Usuarios/Dispositivos
# ============================================

users_table = aws.dynamodb.Table(
    "fog-music-users",
    name="fog-music-users",
    billing_mode="PAY_PER_REQUEST",
    hash_key="device_id",
    attributes=[
        {
            "name": "device_id",
            "type": "S"
        }
    ],
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# ============================================
# Cognito Identity Pool (Usuarios Anónimos)
# ============================================

identity_pool = aws.cognito.IdentityPool(
    "fog-music-identity-pool",
    identity_pool_name="fog_music_identity_pool",
    allow_unauthenticated_identities=True,  # Permitir usuarios invitados
    allow_classic_flow=False,
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# IAM Role para usuarios no autenticados
unauthenticated_assume_role_policy = aws.iam.get_policy_document(
    statements=[
        {
            "effect": "Allow",
            "principals": [{
                "type": "Federated",
                "identifiers": ["cognito-identity.amazonaws.com"]
            }],
            "actions": ["sts:AssumeRoleWithWebIdentity"],
            "conditions": [
                {
                    "test": "StringEquals",
                    "variable": "cognito-identity.amazonaws.com:aud",
                    "values": [identity_pool.id]
                },
                {
                    "test": "ForAnyValue:StringLike",
                    "variable": "cognito-identity.amazonaws.com:amr",
                    "values": ["unauthenticated"]
                }
            ]
        }
    ]
)

unauthenticated_role = aws.iam.Role(
    "fog-music-unauthenticated-role",
    name="fog-music-cognito-unauthenticated",
    assume_role_policy=unauthenticated_assume_role_policy.json,
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Política para usuarios no autenticados: acceso a S3 y DynamoDB
unauthenticated_policy = aws.iam.RolePolicy(
    "fog-music-unauthenticated-policy",
    role=unauthenticated_role.id,
    policy=pulumi.Output.all(
        media_bucket.arn,
        songs_table.arn,
        users_table.arn
    ).apply(lambda args: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject"
                ],
                "Resource": [
                    f"{args[0]}/songs/*",
                    f"{args[0]}/thumbnails/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetItem",
                    "dynamodb:Scan",
                    "dynamodb:Query"
                ],
                "Resource": args[1]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem"
                ],
                "Resource": args[2]
            }
        ]
    }))
)

# Asociar roles al Identity Pool
identity_pool_roles = aws.cognito.IdentityPoolRoleAttachment(
    "fog-music-identity-pool-roles",
    identity_pool_id=identity_pool.id,
    roles={
        "unauthenticated": unauthenticated_role.arn
    }
)

# ============================================
# Outputs - Información para el Frontend
# ============================================

pulumi.export("media_bucket_name", media_bucket.id)
pulumi.export("media_bucket_arn", media_bucket.arn)
pulumi.export("media_bucket_regional_domain", media_bucket.bucket_regional_domain_name)
pulumi.export("songs_table_name", songs_table.name)
pulumi.export("songs_table_arn", songs_table.arn)
pulumi.export("users_table_name", users_table.name)
pulumi.export("users_table_arn", users_table.arn)
pulumi.export("identity_pool_id", identity_pool.id)
pulumi.export("aws_region", "us-east-1")
