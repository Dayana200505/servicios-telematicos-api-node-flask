
# Instrucciones de ejecución: Pruebas de Throughput y Concurrencia (ID 14)

## 1. Objetivo

Este documento describe cómo ejecutar los scripts de medición de **throughput** y **concurrencia** para los servidores Node.js y Flask del proyecto Sistema de Alertas Comunitarias de Emergencia.

Las pruebas simulan 50, 100, 500 y 1000 clientes conectados simultáneamente. Un grupo de clientes se suscribe a la zona "norte" y otro grupo emite alertas para medir:
- **Throughput de ingesta:** alertas que el servidor acepta por segundo (validadas y guardadas en SQLite).
- **Throughput de entrega:** mensajes que llegan a los clientes por segundo.
- **Capacidad de concurrencia:** clientes que logran conectarse a la vez.



## 2. Scripts Involucrados

- `flask-server/medir_throughput.py`: Mide el rendimiento contra Flask o Node.
- `flask-server/tabla_throughput.py`: Genera la tabla comparativa en Excel y CSV leyendo los resultados de ambas pruebas.

---

## 3. Prueba con Flask (Puerto 5000)


### 3.1. Levantar el servidor Flask

## Abrir una terminal (Terminal 1):

```powershell
cd "ruta/donde/clonaron/servicios-telematicos-api-node-flask"
cd flask-server
.\venv\Scripts\Activate.ps1
py app.py
```

*(Mantener esta terminal abierta).*

### 3.2. Ejecutar la medición de throughput

# Abrir una **nueva terminal** (Terminal 2):

```powershell
cd "ruta/donde/clonaron/servicios-telematicos-api-node-flask"
cd flask-server
.\venv\Scripts\Activate.ps1
py medir_throughput.py http://localhost:5000 flask
```

Al finalizar, el script generará:
- `flask-server/resultados_throughput_flask.csv`
- `flask-server/resultados_throughput_flask.xlsx`



## 4. Prueba con Node.js (Puerto 3001)

### 4.1. Levantar el servidor Node.js

# Abrir una **nueva terminal** (Terminal 3):

```powershell
cd "ruta/donde/clonaron/servicios-telematicos-api-node-flask"
cd node-server
npm start
```

*(Mantener esta terminal abierta).*

### 4.2. Ejecutar la medición de throughput

# Volver a la **Terminal 2** y ejecutar:

```powershell
py medir_throughput.py http://localhost:3001 node
```

Al finalizar, el script generará:
- `flask-server/resultados_throughput_node.csv`
- `flask-server/resultados_throughput_node.xlsx`

---

## 5. Generar la Tabla Comparativa Final

Una vez ejecutadas ambas pruebas, en la 
# **Terminal 2** ejecutar:

```powershell
py tabla_throughput.py
```

Este script leerá los archivos CSV de Flask y Node, y generará automáticamente:
- `flask-server/tabla_comparativa_throughput.csv`
- `flask-server/tabla_comparativa_throughput.xlsx` (se abre automáticamente en Windows).




## 6. Interpretación de las Métricas

- **Conexiones simultáneas:** clientes que lograron conectarse a la vez.
- **Ingesta (alertas/s):** alertas que el servidor aceptó por segundo (incluye validación y guardado en SQLite).
- **Entrega (mensajes/s):** mensajes recibidos por los clientes suscritos, por segundo.
- **Errores:** suma de rechazos y timeouts.
- **Desconexiones inesperadas:** clientes que se desconectaron antes del cierre intencional.

---

## 7. Notas Importantes

1. **SQLite:** El servidor Flask guarda cada alerta en `alertas.db`. Por lo tanto, la métrica de "Ingesta" incluye el tiempo de escritura en la base de datos.
2. **Servidores saturados:** Si al correr el escenario de 1000 clientes en Flask el servidor rechaza conexiones, el script marcará "SIN MEDIR" y registrará las desconexiones. Esto es evidencia real de la saturación de Flask en Windows.
3. **Archivos generados:** Los archivos `.csv` y `.xlsx` de resultados se guardan en la carpeta `flask-server` 