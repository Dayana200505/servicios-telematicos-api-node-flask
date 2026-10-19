# Plataforma de alertas comunitarias

API telemática para emitir y distribuir alertas de emergencia en tiempo real mediante WebSockets. El mismo servicio se implementa en dos stacks para comparar Node.js y Python Flask.

## Funcionalidades

- Selección de zona lógica: `norte`, `centro` o `sur`.
- Suscripción de clientes a rooms por zona.
- Emisión de alertas con tipo, gravedad, zona y mensaje.
- Validación de campos obligatorios, zonas y gravedades.
- Registro de alertas en SQLite.
- Difusión exclusiva a la zona de destino.
- Recepción en la aplicación móvil y clientes de prueba.

## Requisitos

- Python 3.10 a 3.13.
- Node.js 22.5 o superior.
- npm.
- Expo Go para probar la aplicación móvil.

## Backend Flask

```powershell
cd flask-server
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

El servidor escucha en `http://localhost:5000` y crea `flask-server/alertas.db`.

## Backend Node.js

Node.js utiliza `node:sqlite`, incluido desde Node.js 22.5.

```powershell
cd node-server
npm install
npm start
```

El servidor escucha en `http://localhost:3001` y crea `node-server/alertas.db`.

## Cliente de prueba

Cliente Python compatible con ambos servidores:

```powershell
cd flask-server
python cliente_prueba.py http://localhost:5000 norte --duracion 60
python cliente_prueba.py http://localhost:3001 sur --duracion 60
```

Cliente Node.js:

```powershell
cd node-server
node cliente_prueba.js http://localhost:3001 norte 60000
```

El último argumento del cliente Node está expresado en milisegundos.

## Emisión de alertas de prueba

Desde otra terminal se puede usar el emisor Python:

```powershell
cd flask-server
python enviar_alerta.py http://localhost:5000 norte
```

Para Node.js:

```powershell
cd node-server
node emisor.js http://localhost:3001 norte
```

Si no se indica una zona en `emisor.js`, se envían las tres alertas de prueba.
El emisor muestra la respuesta de aceptación o rechazo del servidor.

## Aplicación móvil

1. Editar `mobile/src/config/env.ts` y configurar `SERVER_HOST` con la IP del equipo.
2. Activar solo el puerto del backend seleccionado: `3001` para Node.js o `5000` para Flask.
3. Ejecutar:

```powershell
cd mobile
npm install
npx expo start
```

La aplicación permite seleccionar la zona y muestra las alertas recibidas con tipo, gravedad, zona, mensaje y fecha/hora.

## Consultar SQLite

Con Python se pueden consultar las alertas registradas:

```powershell
cd flask-server
python -c "import sqlite3; c=sqlite3.connect('alertas.db'); print(*c.execute('SELECT id,tipo,gravedad,zona,mensaje,fecha_hora FROM alertas ORDER BY id DESC'), sep='\n')"
```

Para Node.js:

```powershell
cd node-server
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('alertas.db'); console.log(db.prepare('SELECT id,tipo,gravedad,zona,mensaje,fecha_hora FROM alertas ORDER BY id DESC').all())"
```

La ubicación de cada base puede cambiarse con `ALERTAS_DB_PATH`.

## Pruebas de integración

Con el backend correspondiente iniciado:

```powershell
cd flask-server
python test_rooms.py http://localhost:5000
python test_difusion.py http://localhost:5000
python test_validacion.py http://localhost:5000
```

Para Node.js se cambia la URL por `http://localhost:3001`.

Las pruebas verifican la suscripción por zona, el cambio de room, la validación, el registro y la difusión segmentada.
