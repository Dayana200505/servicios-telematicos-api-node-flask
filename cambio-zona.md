# Cambio de zona de suscripción sin reconectar

Instrucciones para verificar que un cliente conectado puede cambiar de zona (`norte`, `centro` o `sur`) **sin cerrar la conexión Socket.IO**, que deja de recibir las alertas de la zona anterior y que solo recibe las de la nueva. Corresponde al requerimiento RF-03 y a la historia 16 del Product Backlog.

Funciona igual en los dos servidores (Node.js en el puerto 3001 y Flask en el puerto 5000).

## Cómo funciona

El cambio de zona usa el mismo evento que la selección inicial, `suscribir_zona`. Cuando un cliente conectado lo envía, el servidor:

- Si la zona es válida y distinta de la actual: retira al cliente de la room anterior, lo incorpora a la nueva y responde `zona_confirmada`.
- Si la zona no es válida: responde `error_zona` y no modifica la suscripción, así que el cliente sigue en su zona actual.
- Si es la misma zona en la que ya está: no duplica su pertenencia a la room ni las alertas.

Todo ocurre sobre la misma conexión WebSocket: no se repite el handshake y el ID de sesión no cambia.


## 1. Levantar el servidor

Se prueba un servidor a la vez (o los dos, cada uno en su puerto).

**Node.js (puerto 3001):**

```powershell
cd node-server
npm install
npm start
```

Debe imprimir `Servidor HTTP disponible en el puerto 3001`.

**Flask (puerto 5000):**

```powershell
cd flask-server
venv\Scripts\activate
python app.py
```

Si el entorno virtual se creó como `.venv`, se activa con `.venv\Scripts\activate`. Al arrancar aparece un aviso de Eventlet (`EventletDeprecationWarning`): es normal y no afecta el funcionamiento.

Dejar cada servidor abierto en su propia terminal.

## 2. Ejecutar el script de verificación

En otra terminal, con el entorno virtual activado:

```powershell
cd flask-server
python test_cambio_zona.py http://localhost:3001   # Node.js
python test_cambio_zona.py http://localhost:5000   # Flask
```

Sin argumento, el script prueba Node.js (`http://localhost:3001`).

### Resultado esperado

```
OK: tras cada cambio el cliente recibe solo la alerta de su zona actual
OK: una zona invalida no cambia la suscripcion actual
OK: repetir la misma zona no duplica alertas
OK: el cliente mantuvo la misma conexion (<ID de sesión>) en todos los cambios
Todas las verificaciones de cambio de zona pasaron en http://localhost:3001
```

### Qué comprueba cada línea

1. **Cambio de zona:** el cliente pasa por `norte`, `sur`, `centro`, `norte`, `centro` y `sur`. En cada zona, un emisor (que no está suscrito a ninguna) publica una alerta hacia las tres zonas, y el cliente debe recibir únicamente la de su zona actual. Así se comprueba que abandona la anterior y recibe solo la nueva.
2. **Zona inválida:** el cliente envía una zona inexistente (`este`). El servidor avisa del error y el cliente sigue recibiendo solo las alertas de la zona en la que estaba.
3. **Zona repetida:** al suscribirse otra vez a la zona actual, cada alerta llega una sola vez.
4. **Misma conexión:** durante toda la prueba el cliente no se desconecta y su ID de sesión no cambia.

## 3. Evidencia en el registro del servidor

En la terminal del servidor, el mismo ID de cliente debe pasar de una room a otra **sin ninguna línea `Cliente desconectado` entre medio**, y cada alerta debe llegar a un cliente en la zona actual y a ninguno en las demás:

```
Cliente XP5uSuW2XPsjqj8_AAAB -> room norte
Alerta incendio/alta -> norte (1 clientes)
Alerta incendio/alta -> centro (0 clientes)
Alerta incendio/alta -> sur (0 clientes)
Cliente XP5uSuW2XPsjqj8_AAAB -> room sur
Alerta incendio/alta -> norte (0 clientes)
Alerta incendio/alta -> centro (0 clientes)
Alerta incendio/alta -> sur (1 clientes)
```

La línea `Cliente desconectado` solo aparece al final, cuando termina el script.

## 4. Prueba manual en la aplicación móvil

1. En `mobile/src/config/env.ts`, poner en `SERVER_HOST` la IP de la computadora y dejar activo solo el puerto del servidor en uso (`3001` para Node.js o `5000` para Flask). No subir al repositorio los cambios locales de este archivo.
2. Con el servidor corriendo, iniciar la app:

```powershell
cd mobile
npm install
npx expo start
```

3. Escanear el QR con Expo Go (el celular y la computadora en la misma red Wi-Fi) y elegir una zona.
4. Abrir **Ver detalles de conexión** y anotar el **ID de sesión**.
5. Pulsar **Cambiar zona** y elegir otra. Volver a abrir los detalles: el ID de sesión debe ser el mismo.
6. En el registro del servidor, el mismo ID debe aparecer en la nueva room (`Cliente <ID> -> room sur`) sin `Cliente desconectado` entre medio.
7. Con el celular en la nueva zona, enviar una alerta a la zona anterior y otra a la nueva:

```powershell
cd flask-server
python enviar_alerta.py http://localhost:5000 norte
python enviar_alerta.py http://localhost:5000 sur
```

Para Node.js, cambiar la URL por `http://localhost:3001`.

La aplicación debe mostrar únicamente la alerta de la zona en la que está.

