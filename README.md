# Alertas comunitarias de emergencia

## Descripción

Aplicación móvil para seleccionar manualmente una zona —Norte, Centro o Sur— y recibir alertas comunitarias de emergencia en tiempo real.

La información prevista para cada alerta incluye el tipo de emergencia, la gravedad, el mensaje y la fecha/hora. El sistema contempla comparar dos alternativas de servidor: Node.js con Express y Socket.IO, o Python con Flask-SocketIO y eventlet. Se utilizará una alternativa a la vez para las pruebas comparativas.

## Tecnologías utilizadas

- **React Native:** desarrollo de la aplicación móvil.
- **Expo:** ejecución y prueba de la aplicación durante el desarrollo.
- **TypeScript:** lenguaje de la plantilla móvil.
- **Expo Go:** prueba de la aplicación en un teléfono compatible.
- **Node.js, Express y Socket.IO:** primera alternativa de servidor.
- **Python, Flask-SocketIO y eventlet:** segunda alternativa de servidor.
- **Git y GitHub:** control de versiones y repositorio del proyecto.
- **Visual Studio Code:** editor de código.

## Cómo levantar la aplicación móvil

### Requisitos

Tener Node.js y npm instalados, además de Expo Go en el teléfono para probar la aplicación en un dispositivo físico.

### 1. Abrir la carpeta móvil

En PowerShell, ejecutar:

```powershell
Set-Location D:\servicios-telematicos-api-node-flask\mobile
```

### 2. Instalar dependencias

```powershell
npm install
```

### 3. Verificar el proyecto

```powershell
npx expo-doctor
npx tsc --noEmit
```

### 4. Iniciar Expo

```powershell
npx expo start
```

Conectar la computadora y el teléfono a la misma red Wi-Fi, abrir Expo Go y escanear el código QR que se muestra en la terminal o en el navegador.

Si la conexión local no funciona, detener Expo con `Ctrl+C` e intentar:

```powershell
npx expo start --tunnel
```

Para detener la ejecución, presionar `Ctrl+C` en la terminal donde se está ejecutando Expo.

**Nota:** estos pasos permiten ejecutar la plantilla móvil. La conexión en tiempo real y la recepción de alertas deben integrarse posteriormente.

## Arquitectura general

La arquitectura prevista contiene los siguientes elementos:

1. **Aplicación móvil:** interfaz desde la que los usuarios seleccionan una zona y consultan las alertas.
2. **Zonas:** Norte, Centro y Sur. La selección es manual; no se contempla utilizar GPS.
3. **Servidor:** recibe y distribuye las alertas según la zona de destino.
4. **Salas por zona:** permiten dirigir las alertas a los usuarios correspondientes.
5. **Visualización:** la aplicación presenta el tipo de emergencia, gravedad, mensaje y fecha/hora.

Se consideran dos alternativas de servidor para las pruebas:

- **Alternativa A:** Node.js + Express + Socket.IO.
- **Alternativa B:** Python + Flask-SocketIO + eventlet.

Las alternativas se prueban por separado, no simultáneamente. Los nombres definitivos de eventos, el formato de los datos, los puertos y las direcciones de conexión quedan pendientes de confirmación antes de integrar la aplicación con el servidor.

```mermaid
flowchart TD
    U[Usuario] --> APP[Aplicación móvil<br/>React Native + Expo]
    APP --> Z[Selección manual de zona<br/>Norte / Centro / Sur]
    Z --> S{Servidor elegido para la prueba}
    S --> N[Node.js + Express + Socket.IO]
    S --> F[Python + Flask-SocketIO + eventlet]
    N --> R[Distribución por zona]
    F --> R
    R --> A[Alerta para la zona correspondiente]
    A --> V[Mostrar tipo, gravedad,<br/>mensaje y fecha/hora]
    V --> APP
```

El diagrama representa la arquitectura prevista. La conexión móvil-servidor, la distribución en tiempo real y la lógica de alertas deben implementarse antes de que el flujo funcione de extremo a extremo.


## Cómo levantar el proyecto

Requisitos: Python 3.10 a 3.13, Node.js y Git. Para la app móvil, Expo Go en el celular.

Primero clonar el repositorio:

```
git clone https://github.com/Dayana200505/servicios-telematicos-api-node-flask.git
cd servicios-telematicos-api-node-flask
```

### Backend Flask (puerto 5000)

Primera vez:

```
cd flask-server
python -m venv venv
venv\Scripts\activate
pip install flask flask-socketio eventlet
python app.py
```

Siguientes veces:

```
cd flask-server
venv\Scripts\activate
python app.py
```
### Backend Node.js (puerto 3001)

```
cd node-server
npm install
npm start
```

### App móvil (Expo Go)

1. En `mobile/src/config/env.ts`, poner la IP de la computadora en `SERVER_HOST`.
2. En el mismo archivo, dejar activo solo el puerto del servidor que se va a usar: 3001 (Node.js) o 5000 (Flask).
3. Con el backend corriendo, en otra terminal:

```
cd mobile
npm install
npx expo start
```

4. Escanear el QR con Expo Go. El celular y la computadora deben estar en la misma red WiFi.

### Probar la conexión sin celular

Con un backend corriendo, en otra terminal:

```
cd flask-server
venv\Scripts\activate
python test_client.py        # servidor Flask (puerto 5000)
python test_client_node.py   # servidor Node.js (puerto 3001)
```

### Notas

- Se levanta un solo backend a la vez con la app móvil.
- No subir al repositorio los cambios locales de `env.ts` (IP personal).

