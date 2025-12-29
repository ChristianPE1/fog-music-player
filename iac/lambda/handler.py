"""
Fog Music Player - Lambda API Handler
Middleware de validacion y seguridad para operaciones con DynamoDB.
Implementa el Principio de Minimo Privilegio: el frontend no tiene acceso
directo a la base de datos, solo puede invocar esta Lambda via API Gateway.
"""
import json
import boto3
import os
import time
from decimal import Decimal

# Cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ.get('USERS_TABLE', 'fog-music-users'))

# Acciones permitidas (reglas de negocio)
ALLOWED_ACTIONS = ['sync_preferences', 'update_tastes', 'get_profile']

# Headers CORS para respuestas
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
}


class DecimalEncoder(json.JSONEncoder):
    """Encoder para manejar tipos Decimal de DynamoDB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def response(status_code, body):
    """Genera una respuesta HTTP estandarizada."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def validate_device_id(device_id):
    """Valida que el device_id sea un UUID valido."""
    if not device_id or not isinstance(device_id, str):
        return False
    if len(device_id) < 10 or len(device_id) > 50:
        return False
    return True


def validate_tastes(tastes):
    """Valida que los gustos sean un diccionario valido."""
    if not isinstance(tastes, dict):
        return False
    for key, value in tastes.items():
        if not isinstance(key, str) or len(key) > 100:
            return False
        if not isinstance(value, (int, float)) or value < 0:
            return False
    return True


def handle_get_profile(body):
    """Obtiene el perfil del usuario desde DynamoDB."""
    device_id = body.get('device_id')
    
    if not validate_device_id(device_id):
        return response(400, {'error': 'device_id invalido'})
    
    try:
        result = users_table.get_item(Key={'device_id': device_id})
        item = result.get('Item', {})
        
        profile = {
            'genreTastes': item.get('tastes', {}),
            'artistTastes': item.get('artist_tastes', {}),
            'totalListeningTime': item.get('total_listening_time', 0),
            'searchHistory': item.get('search_history', []),
            'lastSync': item.get('last_sync')
        }
        
        return response(200, profile)
    except Exception as e:
        print(f"Error get_profile: {e}")
        return response(500, {'error': 'Error al obtener perfil'})


def handle_update_tastes(body):
    """Actualiza los gustos del usuario (incrementa contador de genero)."""
    device_id = body.get('device_id')
    genero = body.get('genero')
    
    if not validate_device_id(device_id):
        return response(400, {'error': 'device_id invalido'})
    
    if not genero or not isinstance(genero, str) or len(genero) > 100:
        return response(400, {'error': 'genero invalido'})
    
    try:
        # Obtener gustos actuales
        result = users_table.get_item(Key={'device_id': device_id})
        current_tastes = result.get('Item', {}).get('tastes', {})
        
        # Incrementar contador
        current_count = current_tastes.get(genero, 0)
        current_tastes[genero] = current_count + 1
        
        # Guardar
        users_table.put_item(Item={
            'device_id': device_id,
            'tastes': current_tastes,
            'last_updated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        })
        
        return response(200, {
            'message': 'Gustos actualizados',
            'tastes': current_tastes
        })
    except Exception as e:
        print(f"Error update_tastes: {e}")
        return response(500, {'error': 'Error al actualizar gustos'})


def handle_sync_preferences(body):
    """Sincroniza preferencias completas desde el nodo FOG."""
    device_id = body.get('device_id')
    preferences = body.get('preferences', {})
    top_artists = body.get('topArtists', [])
    top_genres = body.get('topGenres', [])
    
    if not validate_device_id(device_id):
        return response(400, {'error': 'device_id invalido'})
    
    # Validar estructura de preferencias
    if not isinstance(preferences, dict):
        return response(400, {'error': 'preferences debe ser un objeto'})
    
    if not isinstance(top_artists, list) or not isinstance(top_genres, list):
        return response(400, {'error': 'topArtists y topGenres deben ser arrays'})
    
    # Limitar tamano de listas (proteccion contra spam)
    if len(top_artists) > 50 or len(top_genres) > 50:
        return response(400, {'error': 'Listas demasiado grandes (max 50)'})
    
    try:
        # Convertir listas a diccionarios
        artist_tastes = {}
        for item in top_artists[:50]:
            if isinstance(item, dict) and 'artist' in item and 'plays' in item:
                artist_tastes[item['artist']] = int(item['plays'])
        
        genre_tastes = {}
        for item in top_genres[:50]:
            if isinstance(item, dict) and 'genre' in item and 'plays' in item:
                genre_tastes[item['genre']] = int(item['plays'])
        
        # Validar tiempo de escucha
        total_time = preferences.get('totalListeningTime', 0)
        if not isinstance(total_time, (int, float)) or total_time < 0:
            total_time = 0
        
        # Limitar historial de busquedas
        search_history = preferences.get('searchHistory', [])
        if not isinstance(search_history, list):
            search_history = []
        search_history = search_history[-20:]  # Maximo 20 busquedas
        
        # Guardar en DynamoDB
        timestamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        
        users_table.put_item(Item={
            'device_id': device_id,
            'tastes': genre_tastes,
            'artist_tastes': artist_tastes,
            'play_time': preferences.get('playTime', {}),
            'total_listening_time': Decimal(str(int(total_time))),
            'search_history': search_history,
            'last_sync': timestamp,
            'last_updated': timestamp
        })
        
        return response(200, {
            'message': 'Preferencias sincronizadas exitosamente',
            'timestamp': timestamp
        })
    except Exception as e:
        print(f"Error sync_preferences: {e}")
        return response(500, {'error': 'Error al sincronizar preferencias'})


def lambda_handler(event, context):
    """
    Handler principal de la Lambda.
    Recibe peticiones de API Gateway y las enruta segun la accion.
    """
    # Manejar preflight CORS
    if event.get('httpMethod') == 'OPTIONS':
        return response(200, {'message': 'OK'})
    
    try:
        # Parsear body
        body_str = event.get('body', '{}')
        if isinstance(body_str, str):
            body = json.loads(body_str)
        else:
            body = body_str or {}
        
        # Validar accion
        action = body.get('action')
        if not action:
            return response(400, {'error': 'Falta el campo action'})
        
        if action not in ALLOWED_ACTIONS:
            return response(400, {
                'error': f'Accion no permitida. Permitidas: {ALLOWED_ACTIONS}'
            })
        
        # Enrutar a handler correspondiente
        if action == 'get_profile':
            return handle_get_profile(body)
        elif action == 'update_tastes':
            return handle_update_tastes(body)
        elif action == 'sync_preferences':
            return handle_sync_preferences(body)
        
        return response(400, {'error': 'Accion no implementada'})
        
    except json.JSONDecodeError:
        return response(400, {'error': 'JSON invalido en el body'})
    except Exception as e:
        print(f"Error general: {e}")
        return response(500, {'error': 'Error interno del servidor'})
