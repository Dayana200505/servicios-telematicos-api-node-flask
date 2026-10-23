# Instrucciones de ejecución: pruebas de carga Socket.IO

## 1. Objetivo

Este documento describe cómo ejecutar los scripts de simulación de carga de los servidores Node.js y Flask del proyecto Sistema de Alertas Comunitarias de Emergencia.

Las pruebas permiten simular 50, 100, 500 y 1000 clientes conectados mediante Socket.IO, registrando conexiones exitosas, conexiones fallidas, desconexiones y tiempo promedio de conexión.

Cada servidor cuenta con un script independiente:

- **Node.js:** `node-server/prueba_carga.js`
- **Flask:** `flask-server/prueba_carga.py`



## 2. Prueba de carga para Node.js

### 2.1. Instalar las dependencias

Abrir una terminal de PowerShell:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\node-server"
npm install
```

El archivo `package.json` contiene las dependencias necesarias, incluidas Socket.IO y ExcelJS.

### 2.2. Iniciar el servidor

En una primera terminal:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\node-server"
npm start
```

El servidor debe iniciar y escuchar en el puerto 3001.

Mantener esta terminal abierta mientras se ejecuta la prueba.

### 2.3. Ejecutar la simulación de carga

Abrir una segunda terminal:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\node-server"
node prueba_carga.js http://localhost:3001
```

El script ejecutará los escenarios configurados de 50, 100, 500 y 1000 clientes.

Al finalizar, mostrará las estadísticas en la terminal y generará los siguientes archivos:

- `node-server/resultados_carga_node.csv`
- `node-server/resultados_carga_node.xlsx`

## 3. Prueba de carga para Flask

### 3.1. Crear y activar el entorno virtual

Abrir una terminal de PowerShell:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\flask-server"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Si el entorno virtual ya existe, solamente es necesario activarlo.

### 3.2. Instalar las dependencias

Con el entorno virtual activado:

```powershell
python -m pip install -r requirements.txt
```

El archivo `requirements.txt` contiene las dependencias del servidor y las utilizadas por el script de carga, incluidas `python-socketio`, `aiohttp` y `openpyxl`.

### 3.3. Iniciar el servidor Flask

En una primera terminal:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\flask-server"
.\.venv\Scripts\Activate.ps1
python app.py
```

El servidor debe iniciar y escuchar en el puerto 5000.

Mantener esta terminal abierta mientras se ejecuta la prueba.

### 3.4. Ejecutar la simulación de carga

Abrir una segunda terminal:

```powershell
cd "$HOME\Desktop\SistemaDeAlertas\flask-server"
.\.venv\Scripts\Activate.ps1
python prueba_carga.py http://localhost:5000
```

El script ejecutará los escenarios configurados de 50, 100, 500 y 1000 clientes.

Al finalizar, mostrará las estadísticas en la terminal y generará:

- `flask-server/resultados_carga_flask.csv`
- `flask-server/resultados_carga_flask.xlsx`

## 4. Escenarios de carga

Los escenarios definidos para la evaluación son:

| Escenario | Clientes solicitados |
|---|---:|
| 1 | 50 |
| 2 | 100 |
| 3 | 500 |
| 4 | 1000 |


## 5. Archivos de resultados

Cada script genera dos formatos:

### CSV

El archivo CSV conserva los datos de la ejecución y facilita su procesamiento, consolidación y análisis con otras herramientas.

### Excel

El archivo XLSX permite consultar los resultados en columnas separadas y utilizar filtros para revisar los escenarios.

Las columnas incluyen, según la implementación del script:

- Fecha y hora de ejecución.
- Servidor utilizado.
- Clientes solicitados.
- Conexiones exitosas.
- Conexiones fallidas.
- Desconexiones inesperadas.
- Desconexiones controladas.
- Tiempo promedio de conexión.
- Duración total de los intentos.


## 6. Interpretación de las métricas

- **Conexiones exitosas:** clientes que consiguieron establecer una conexión Socket.IO.
- **Conexiones fallidas:** clientes que no consiguieron conectarse dentro del tiempo de espera.
- **Desconexiones inesperadas:** desconexiones registradas antes del cierre intencional de los clientes.
- **Desconexiones controladas:** clientes desconectados intencionalmente al finalizar el escenario.
- **Tiempo promedio de conexión:** promedio del tiempo empleado por las conexiones exitosas en establecerse.
- **Duración total:** tiempo transcurrido durante la ejecución del escenario, según la medición del script.
