# Guía de pruebas de la plataforma de alertas

Esta guía prueba el flujo completo de la plataforma:

1. Levantar un backend.
2. Conectar la aplicación móvil.
3. Elegir una zona lógica.
4. Enviar una alerta de prueba.
5. Confirmar que solo la zona correspondiente recibe la alerta.
6. Consultar el registro SQLite.

Los backends se prueban por separado. No se deben levantar Node.js y Flask al mismo tiempo porque utilizan flujos de prueba independientes.

## Preparación general

Requisitos:

- Python 3.10 a 3.13.
- Node.js 22.5 o superior.
- npm.
- Expo Go si se prueba desde un teléfono.

Desde la raíz del proyecto:

```powershell
cd D:\servicios-telematicos-api-node-flask
```

Para probar desde un teléfono, el teléfono y el computador deben estar conectados a la misma red Wi-Fi. La aplicación móvil debe usar la IP local del computador, no `localhost`.

## Prueba con Flask

### 1. Levantar Flask

En una terminal:

```powershell
cd flask-server
venv\Scripts\activate
python app.py
```

El backend debe quedar disponible en:

```text
http://localhost:5000
```

Al iniciar se crea automáticamente:

```text
flask-server\alertas.db
```

### 2. Configurar y levantar la aplicación móvil

En [mobile/src/config/env.ts](mobile/src/config/env.ts):

- Configurar `SERVER_HOST` con la IP del computador.
- Activar `SERVER_PORT = 5000`.
- Dejar desactivado el puerto `3001`.

Ejemplo:

```ts
export const SERVER_HOST = "192.168.100.45";
export const SERVER_PORT = 5000;
```

En otra terminal:

```powershell
cd D:\servicios-telematicos-api-node-flask\mobile
npm install
npx expo start
```

Abrir la aplicación con Expo Go. La pantalla debe mostrar que existe conexión con el servidor.

### 3. Elegir la zona en la aplicación móvil

En la aplicación:

1. Pulsar `Seleccionar zona`.
2. Elegir `Norte`, `Centro` o `Sur`.
3. Esperar la confirmación de suscripción.
4. Comprobar que la pantalla muestre la zona seleccionada.

La aplicación envía:

```json
{
  "zona": "norte"
}
```

mediante el evento `suscribir_zona`. El servidor responde con `zona_confirmada` y agrega el cliente a la room correspondiente.

### 4. Enviar una alerta a Flask

Con la aplicación móvil conectada y suscrita a una zona, abrir otra terminal:

```powershell
cd D:\servicios-telematicos-api-node-flask\flask-server
venv\Scripts\activate
python cliente_prueba.py http://localhost:5000 norte --duracion 60
python enviar_alerta.py http://localhost:5000 norte
```

El último argumento es la zona destino. Debe coincidir con la zona seleccionada en la aplicación móvil.

Ejemplo de alerta enviada:

```json
{
  "tipo": "incendio",
  "gravedad": "alta",
  "zona": "norte",
  "mensaje": "Prueba de alerta en zona norte"
}
```

La aplicación móvil debe mostrar la alerta con tipo, gravedad, zona, mensaje y fecha/hora.

### 5. Consultar la base SQLite de Flask

Después de enviar la alerta:

```powershell
cd D:\servicios-telematicos-api-node-flask\flask-server
python -c "import sqlite3; c=sqlite3.connect('alertas.db'); print(*c.execute('SELECT id,tipo,gravedad,zona,mensaje,emitida_en,fecha_hora FROM alertas ORDER BY id DESC'), sep='\n')"
```

Debe aparecer un registro con los datos de la alerta enviada.

## Prueba con Node.js

### 1. Levantar Node.js

Detener Flask con `Ctrl+C` y, en una terminal nueva, ejecutar:

```powershell
cd D:\servicios-telematicos-api-node-flask\node-server
npm install
npm start
```

El backend debe quedar disponible en:

```text
http://localhost:3001
```

Al iniciar se crea automáticamente:

```text
node-server\alertas.db
```

### 2. Configurar la aplicación móvil para Node.js

En [mobile/src/config/env.ts](mobile/src/config/env.ts):

- Mantener `SERVER_HOST` con la IP del computador.
- Activar `SERVER_PORT = 3001`.
- Dejar desactivado el puerto `5000`.

Si Expo ya estaba ejecutándose, reiniciarlo después de cambiar el puerto.

### 3. Elegir la zona en la aplicación móvil

En la aplicación:

1. Confirmar que aparece conectada.
2. Pulsar `Seleccionar zona`.
3. Elegir la zona que se quiere probar.
4. Esperar la confirmación de la room.

Este paso debe realizarse antes de enviar la alerta. La zona elegida determina qué cliente recibirá la alerta.

### 4. Enviar una alerta a Node.js

Con la aplicación móvil suscrita a `norte`, ejecutar:

```powershell
cd D:\servicios-telematicos-api-node-flask\node-server
node emisor.js http://localhost:3001 norte
```

El emisor mostrará la respuesta ACK del servidor:

```text
Servidor acepto la alerta.
```

La aplicación móvil debe mostrar la alerta únicamente si está suscrita a `norte`.

Si no se indica una zona, el emisor manda las tres alertas de prueba:

```powershell
node emisor.js http://localhost:3001
```

### 5. Consultar la base SQLite de Node.js

```powershell
cd D:\servicios-telematicos-api-node-flask\node-server
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('alertas.db'); console.log(db.prepare('SELECT id,tipo,gravedad,zona,mensaje,emitida_en,fecha_hora FROM alertas ORDER BY id DESC').all())"
```

Debe aparecer el registro de la alerta enviada.

## Verificar la segmentación por zona

Para probar que una alerta no llega a clientes de otras zonas:

1. Conectar un cliente a `norte`.
2. Conectar otro cliente a `centro`.
3. Enviar una alerta con zona `norte`.
4. Confirmar que solo el cliente de `norte` recibe la alerta.
5. Enviar una alerta con zona `centro`.
6. Confirmar que solo el cliente de `centro` recibe la alerta.

Se puede usar la aplicación móvil y, al mismo tiempo, un cliente de prueba.

Cliente Python:

```powershell
cd D:\servicios-telematicos-api-node-flask\flask-server
python cliente_prueba.py http://localhost:5000 norte --duracion 60
python cliente_prueba.py http://localhost:3001 centro --duracion 60
```

Cliente Node.js:

```powershell
cd D:\servicios-telematicos-api-node-flask\node-server
node cliente_prueba.js http://localhost:3001 norte 60000
```

## Pruebas automatizadas de Socket.IO

Con el backend iniciado, ejecutar desde `flask-server`:

```powershell
python test_rooms.py http://localhost:5000
python test_difusion.py http://localhost:5000
python test_validacion.py http://localhost:5000
```

Para Node.js:

```powershell
python test_rooms.py http://localhost:3001
python test_difusion.py http://localhost:3001
python test_validacion.py http://localhost:3001
```

Resultados esperados:

```text
OK: cada cliente entro a su room
OK: alerta segmentada por zona
OK: las alertas invalidas se rechazan y no se difunden
OK: la alerta se normaliza y sigue llegando solo a su zona
```

## Errores frecuentes

### La aplicación móvil no conecta

- Verificar que el backend esté iniciado.
- Confirmar que `SERVER_HOST` contiene la IP correcta.
- Confirmar que el teléfono y el computador usan la misma red Wi-Fi.
- Revisar que el puerto configurado coincida con el backend activo.

### La alerta no aparece en el móvil

- Confirmar que se seleccionó una zona antes de emitir.
- Confirmar que la alerta usa exactamente la misma zona.
- Revisar la consola del backend.
- Probar primero con `cliente_prueba.py` o `cliente_prueba.js`.

### No aparece la alerta en SQLite

- Confirmar que se está consultando la base del backend correcto.
- Revisar que la alerta haya sido aceptada por el servidor.
- Verificar que el proceso tenga permisos de escritura en la carpeta.
