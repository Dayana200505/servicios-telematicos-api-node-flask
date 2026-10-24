# Medición de latencia por escenario de carga

Este documento explica cómo ejecutar `flask-server/medir_latencia.py`, que mide cuánto tarda una alerta en llegar a los clientes suscritos a una zona, tanto en el servidor Flask como en el servidor Node.js.

## Qué mide

- **Latencia:** tiempo entre el envío de una alerta y su recepción por cada cliente suscrito a la zona `norte`.
- **Escenarios:** 50, 100, 500 y 1000 clientes conectados.
- **Alertas por escenario:** 20, una cada 0,5 segundos (más una de calentamiento que no se mide).
- **Resultados:** mínima, promedio, máxima, P95 y P99, en milisegundos.

El script usa el mismo cliente (Python) y el mismo reloj para ambos servidores, por lo que los resultados son comparables entre sí.

## Requisitos

- Python 3.10 o superior y el entorno virtual de `flask-server` con las dependencias instaladas.
- Node.js, si se va a medir el servidor Node.
- La librería `aiohttp`, necesaria para los clientes asíncronos:

```
pip install aiohttp
```

## Medir el servidor Flask (puerto 5000)

**Terminal 1: servidor**

```
cd flask-server
venv\Scripts\activate
python app.py
```

**Terminal 2: medición**

```
cd flask-server
venv\Scripts\activate
python medir_latencia.py http://localhost:5000 flask
```

Al terminar se crea `flask-server/resultados_latencia_flask.csv`.

## Medir el servidor Node.js (puerto 3001)

**Terminal 1: servidor**

```
cd node-server
npm install
npm start
```

**Terminal 2: medición**

```
cd flask-server
venv\Scripts\activate
python medir_latencia.py http://localhost:3001 node
```

Al terminar se crea `flask-server/resultados_latencia_node.csv`.

## Ejecutar solo algunos escenarios

El tercer argumento permite elegir los escenarios, separados por coma:

```
python medir_latencia.py http://localhost:5000 flask 50,100,500
python medir_latencia.py http://localhost:5000 flask 1000
```

El archivo de resultados lleva el sufijo de los escenarios, por ejemplo `resultados_latencia_flask_50-100-500.csv`, para no sobrescribir la corrida completa.

## Columnas del CSV

| Columna | Significado |
|---|---|
| `clientes_solicitados` | Clientes que se intentó conectar |
| `clientes_conectados` | Clientes que lograron conectarse |
| `clientes_suscritos` | Clientes que confirmaron su suscripción a la zona |
| `mensajes_esperados` | Clientes conectados × alertas enviadas |
| `mensajes_recibidos` | Mensajes que efectivamente llegaron |
| `latencia_min_ms`, `latencia_prom_ms`, `latencia_max_ms` | Latencia mínima, promedio y máxima |
| `p95_ms`, `p99_ms` | Percentiles 95 y 99 de la latencia |
| `nota` | Observaciones, por ejemplo si no se pudo medir un escenario |

## Recomendaciones

- Ejecutar **un servidor a la vez** y detener el anterior con `Ctrl + C`.
- Cerrar el navegador, Expo y otros programas pesados durante la medición.
- Reiniciar el servidor entre mediciones para empezar sin conexiones previas.
- Repetir cada escenario varias veces y promediar: los valores varían entre ejecuciones.
- Registrar las características del equipo (procesador, RAM, sistema operativo), porque los resultados dependen de él.

## Resultados obtenidos (en mi equipo osea yo Jherson, Windows)

Valores en milisegundos.

| Clientes | Servidor | Mensajes recibidos | Promedio | P95 |
|---|---|---|---|---|
| 50 | Flask | 1000 de 1000 | 11,00 | 14,91 |
| 50 | Node.js | 1000 de 1000 | 8,91 | 12,48 |
| 100 | Flask | 2000 de 2000 | 17,86 | 28,77 |
| 100 | Node.js | 2000 de 2000 | 11,42 | 15,85 |
| 500 | Flask | 10000 de 10000 | 55,76 | 94,00 |
| 500 | Node.js | 10000 de 10000 | 30,83 | 45,41 |
| 1000 | Flask | No medido | n/d | n/d |
| 1000 | Node.js | 20000 de 20000 | 59,86 | 120,04 |

## Observaciones

- Con 1000 clientes, Flask conectó solo 509 y el servidor se detuvo con el error `ValueError: too many file descriptors in select()`. Con este resultado no fue posible medir la latencia en ese escenario. El error proviene de eventlet sobre Windows, por lo que el resultado no debe generalizarse a otros sistemas operativos ni a otros motores asíncronos.
- Cada escenario se ejecutó una vez. En dos corridas de Flask con 500 clientes los promedios fueron 39,32 ms y 55,76 ms, por lo que los valores exactos varían entre ejecuciones.
- Los clientes, el emisor y el servidor se ejecutan en la misma computadora (`localhost`), de modo que la medición no incluye tiempo de red real.
