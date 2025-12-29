# Fog Music Player - Infrastructure as Code (Pulumi)
# Arquitectura: S3 + DynamoDB + Cognito + Lambda + API Gateway

import pulumi
import pulumi_aws as aws
import json
import os

# ============================================
# S3 Bucket de Medios
# ============================================

media_bucket = aws.s3.Bucket(
    "fog-music-media-bucket",
    bucket="fog-music-media",
    force_destroy=True,
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

bucket_cors = aws.s3.BucketCorsConfigurationV2(
    "fog-music-media-cors",
    bucket=media_bucket.id,
    cors_rules=[
        {
            "allowed_headers": ["*"],
            "allowed_methods": ["GET", "HEAD"],
            "allowed_origins": ["*"],
            "expose_headers": ["ETag"],
            "max_age_seconds": 3000
        }
    ]
)

bucket_public_access_block = aws.s3.BucketPublicAccessBlock(
    "fog-music-media-public-access",
    bucket=media_bucket.id,
    block_public_acls=False,
    block_public_policy=False,
    ignore_public_acls=False,
    restrict_public_buckets=False
)

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
# DynamoDB - Tablas
# ============================================

songs_table = aws.dynamodb.Table(
    "fog-music-songs-catalog",
    name="fog-music-songs",
    billing_mode="PAY_PER_REQUEST",
    hash_key="song_id",
    attributes=[
        {"name": "song_id", "type": "S"}
    ],
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

users_table = aws.dynamodb.Table(
    "fog-music-users",
    name="fog-music-users",
    billing_mode="PAY_PER_REQUEST",
    hash_key="device_id",
    attributes=[
        {"name": "device_id", "type": "S"}
    ],
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# ============================================
# Configuracion Global de Logs para API Gateway
# ============================================

# Rol que permite a API Gateway escribir logs en CloudWatch
api_gateway_cloudwatch_role = aws.iam.Role(
    "apiGatewayCloudWatchRole",
    assume_role_policy=json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "Service": "apigateway.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }]
    }),
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Adjuntar politica gestionada de AWS para logs
api_gateway_cloudwatch_policy = aws.iam.RolePolicyAttachment(
    "apiGatewayCloudWatchRolePolicy",
    role=api_gateway_cloudwatch_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
)

# Vincular el rol a la configuracion de la cuenta
api_gateway_account = aws.apigateway.Account(
    "apiGatewayAccountSettings",
    cloudwatch_role_arn=api_gateway_cloudwatch_role.arn
)

# ============================================
# Lambda - API Handler
# ============================================

# IAM Role para Lambda
lambda_assume_role_policy = aws.iam.get_policy_document(
    statements=[{
        "effect": "Allow",
        "principals": [{
            "type": "Service",
            "identifiers": ["lambda.amazonaws.com"]
        }],
        "actions": ["sts:AssumeRole"]
    }]
)

lambda_role = aws.iam.Role(
    "fog-music-lambda-role",
    name="fog-music-lambda-execution",
    assume_role_policy=lambda_assume_role_policy.json,
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Politica para Lambda: acceso a DynamoDB y CloudWatch Logs
lambda_policy = aws.iam.RolePolicy(
    "fog-music-lambda-policy",
    role=lambda_role.id,
    policy=pulumi.Output.all(users_table.arn, songs_table.arn).apply(
        lambda args: json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "dynamodb:GetItem",
                        "dynamodb:PutItem",
                        "dynamodb:UpdateItem",
                        "dynamodb:Query"
                    ],
                    "Resource": args[0]
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
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents"
                    ],
                    "Resource": "arn:aws:logs:*:*:*"
                }
            ]
        })
    )
)

# Crear archivo ZIP de la Lambda
lambda_archive = pulumi.asset.AssetArchive({
    "handler.py": pulumi.asset.FileAsset("./lambda/handler.py")
})

# Funcion Lambda
api_lambda = aws.lambda_.Function(
    "fog-music-api-lambda",
    name="fog-music-api",
    runtime=aws.lambda_.Runtime.PYTHON3D11,
    handler="handler.lambda_handler",
    role=lambda_role.arn,
    code=lambda_archive,
    timeout=30,
    memory_size=256,
    environment=aws.lambda_.FunctionEnvironmentArgs(
        variables={
            "USERS_TABLE": users_table.name,
            "SONGS_TABLE": songs_table.name
        }
    ),
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# ============================================
# API Gateway - REST API
# ============================================

api_gateway = aws.apigateway.RestApi(
    "fog-music-api",
    name="fog-music-api",
    description="API Gateway para Fog Music Player - Middleware de seguridad",
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Recurso /api
api_resource = aws.apigateway.Resource(
    "fog-music-api-resource",
    rest_api=api_gateway.id,
    parent_id=api_gateway.root_resource_id,
    path_part="api"
)

# Metodo POST /api
api_method_post = aws.apigateway.Method(
    "fog-music-api-method-post",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method="POST",
    authorization="NONE"
)

# Metodo OPTIONS /api (CORS preflight)
api_method_options = aws.apigateway.Method(
    "fog-music-api-method-options",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method="OPTIONS",
    authorization="NONE"
)

# Integracion Lambda para POST
api_integration_post = aws.apigateway.Integration(
    "fog-music-api-integration-post",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method=api_method_post.http_method,
    integration_http_method="POST",
    type="AWS_PROXY",
    uri=api_lambda.invoke_arn
)

# Integracion MOCK para OPTIONS (CORS)
api_integration_options = aws.apigateway.Integration(
    "fog-music-api-integration-options",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method=api_method_options.http_method,
    type="MOCK",
    request_templates={
        "application/json": '{"statusCode": 200}'
    }
)

# Respuesta OPTIONS (CORS headers)
api_method_response_options = aws.apigateway.MethodResponse(
    "fog-music-api-method-response-options",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method=api_method_options.http_method,
    status_code="200",
    response_parameters={
        "method.response.header.Access-Control-Allow-Headers": True,
        "method.response.header.Access-Control-Allow-Methods": True,
        "method.response.header.Access-Control-Allow-Origin": True
    },
    response_models={
        "application/json": "Empty"
    }
)

api_integration_response_options = aws.apigateway.IntegrationResponse(
    "fog-music-api-integration-response-options",
    rest_api=api_gateway.id,
    resource_id=api_resource.id,
    http_method=api_method_options.http_method,
    status_code="200",
    response_parameters={
        "method.response.header.Access-Control-Allow-Headers": "'Content-Type,Authorization'",
        "method.response.header.Access-Control-Allow-Methods": "'POST,OPTIONS'",
        "method.response.header.Access-Control-Allow-Origin": "'*'"
    },
    opts=pulumi.ResourceOptions(depends_on=[api_integration_options])
)

# Permiso para que API Gateway invoque Lambda
api_lambda_permission = aws.lambda_.Permission(
    "fog-music-api-lambda-permission",
    action="lambda:InvokeFunction",
    function=api_lambda.name,
    principal="apigateway.amazonaws.com",
    source_arn=pulumi.Output.all(api_gateway.execution_arn).apply(
        lambda args: f"{args[0]}/*/*"
    )
)

# Deployment
api_deployment = aws.apigateway.Deployment(
    "fog-music-api-deployment",
    rest_api=api_gateway.id,
    opts=pulumi.ResourceOptions(depends_on=[
        api_integration_post,
        api_integration_options,
        api_integration_response_options
    ])
)

# Stage con throttling
api_stage = aws.apigateway.Stage(
    "fog-music-api-stage",
    rest_api=api_gateway.id,
    deployment=api_deployment.id,
    stage_name="prod",
    tags={
        "Project": "fog-music",
        "Environment": "dev"
    }
)

# Configurar throttling en el stage
api_method_settings = aws.apigateway.MethodSettings(
    "fog-music-api-throttling",
    rest_api=api_gateway.id,
    stage_name=api_stage.stage_name,
    method_path="*/*",
    settings=aws.apigateway.MethodSettingsSettingsArgs(
        throttling_burst_limit=100,
        throttling_rate_limit=50,
        logging_level="INFO",
        data_trace_enabled=True
    ),
    opts=pulumi.ResourceOptions(depends_on=[api_gateway_account])
)

# ============================================
# Cognito Identity Pool
# ============================================

identity_pool = aws.cognito.IdentityPool(
    "fog-music-identity-pool",
    identity_pool_name="fog_music_identity_pool",
    allow_unauthenticated_identities=True,
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

# Politica MINIMA para usuarios no autenticados:
# - Solo lectura de S3 (canciones y thumbnails)
# - Solo lectura de DynamoDB (catalogo de canciones)
# - NO tienen acceso directo a la tabla de usuarios (usa Lambda)
unauthenticated_policy = aws.iam.RolePolicy(
    "fog-music-unauthenticated-policy",
    role=unauthenticated_role.id,
    policy=pulumi.Output.all(
        media_bucket.arn,
        songs_table.arn
    ).apply(lambda args: json.dumps({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": ["s3:GetObject"],
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
# Outputs
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

# Nuevos outputs para Lambda y API Gateway
pulumi.export("lambda_function_name", api_lambda.name)
pulumi.export("lambda_function_arn", api_lambda.arn)
pulumi.export("api_gateway_id", api_gateway.id)
pulumi.export("api_gateway_url", pulumi.Output.all(api_gateway.id, api_stage.stage_name).apply(
    lambda args: f"https://{args[0]}.execute-api.us-east-1.amazonaws.com/{args[1]}/api"
))
