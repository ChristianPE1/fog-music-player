
### 🔄 Nuevo Flujo de Trabajo: Pulumi con Backend S3

El truco es que Pulumi necesita un lugar centralizado para saber qué infraestructura ya existe. Ese lugar será un Bucket S3 compartido.

#### Paso 0: El "Bucket de Estado" (Manual)

Este paso lo hace **uno solo de ustedes** (tú, por ejemplo) una única vez, manualmente en la consola de AWS.

1. Ve a la consola de AWS (S3).
2. Crea un bucket llamado: `fog-music-pulumi-state` (o algo único).
3. **Importante:** Habilita el **Versionado (Versioning)** en este bucket (esto actúa como copia de seguridad si alguien rompe la infraestructura por error).
4. Crea una carpeta dentro llamada `locks` (opcional, pero buena práctica).

#### Paso 1: Configurar el Login de Pulumi (Ambos)

En lugar de loguearse en la web (`pulumi login`), ambos ejecutarán este comando en sus terminales para decirle a Pulumi que mire al bucket:

```bash
# 1. Configurar credenciales AWS (si no lo han hecho)
aws configure --profile fog-music

# 2. Loguearse en el bucket S3 en lugar de Pulumi Cloud
export AWS_PROFILE=fog-music
pulumi login s3://fog-music-pulumi-state

```

Ahora, cuando crees un proyecto, el archivo de estado se guardará en ese bucket. Tu compañero, al hacer lo mismo, leerá ese mismo archivo.

---

### 📄 Documentación Técnica de Inicio (Revisada V1)

Esta es la guía definitiva para arrancar el proyecto **gratis** y en equipo.

#### 1. Configuración de Identidad (IAM)

*Esto se mantiene igual, es vital.*

1. Crear usuario `dev-christian` y `dev-saul` en AWS IAM.
2. Dar permisos `AdministratorAccess`.
3. Configurar `aws configure --profile fog-music` en cada laptop.

#### 2. Inicialización del Proyecto (Tú - Primera vez)

1. Clona el repositorio vacío de GitHub.
2. **Configura el backend:** `pulumi login s3://fog-music-pulumi-state`
3. Inicia el proyecto:
```bash
mkdir iac
cd iac
pulumi new aws-python
# Nombre proyecto: fog-music
# Nombre stack: dev

```


4. Esto creará los archivos `Pulumi.yaml` y `Pulumi.dev.yaml`.
5. Haz el **Push** a GitHub de estos archivos (el código Python).
* *Nota:* El archivo de estado NO se sube a GitHub, se sube solo al bucket S3 oculto.



#### 3. Colaboración (Tu compañero - Turno siguiente)

Cuando tu compañero quiera trabajar:

1. Hace `git pull` para bajar tu código Python.
2. Ejecuta `export AWS_PROFILE=fog-music`.
3. Ejecuta `pulumi login s3://fog-music-pulumi-state`.
4. Ejecuta `pulumi stack select dev`.
5. Ahora puede hacer `pulumi up` y verá la misma infraestructura que tú creaste.

---

### 📝 Tareas de la Versión 1 (V1)

Aquí está el pipeline ajustado a tus requerimientos:

#### A. Frontend (React + Amplify/Cognito)

* **Identidad Anónima:** No haremos pantalla de Login. Usaremos **Cognito Identity Pool** (Unauthenticated).
* **Lógica:**
1. Al cargar la página, AWS SDK genera un ID único para ese navegador.
2. Ese ID se usa para guardar gustos en DynamoDB.


* **UI:** Lista simple de canciones. Botón Play.

#### B. Infraestructura (Pulumi Python)

Tu archivo `__main__.py` debe crear:

1. **S3 Bucket de Medios:** Con carpetas `songs/` (encriptado) y `thumbnails/` (público).
2. **DynamoDB (Catalogo):** `song_id` (PK).
3. **DynamoDB (Usuarios):** `device_id` (PK), `tastes` (Map).
4. **Cognito Identity Pool:** Para permitir usuarios invitados.

#### C. Script de Carga y Encriptado (`seed.py`)

Este script correrá en tu PC antes de subir nada.

1. Lee tus 100 MP3s.
2. Genera una llave AES-256 (Hardcodeada por ahora para la prueba, ej: `"miclavesecretade32bytes123456789"`).
3. Encripta el audio.
4. Sube el `.enc` a S3.
5. Sube la imagen `.jpg` a S3.
6. Registra la metadata en DynamoDB.

#### D. Service Worker (Fog Node Básico)

1. Interceptar petición a `s3.../cancion.enc`.
2. Descargar el archivo.
3. Usar la Web Crypto API (nativa del navegador) con la clave hardcodeada para desencriptar.
4. Pasar el audio limpio al reproductor.
5. *Fog Feature:* Contar cuántas canciones de "Rock" ha escuchado y guardarlo en una variable local.

