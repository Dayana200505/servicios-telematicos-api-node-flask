# Informe de pruebas Node.js vs Flask

Fecha de ejecución: 27 de octubre de 2026. Los backends se ejecutaron por separado en el mismo equipo, usando Socket.IO sobre WebSocket, SQLite local, cinco emisores concurrentes para throughput y diez receptores para la entrega de mensajes.

## Condiciones

- Escenarios: 50, 100, 500 y 1000 clientes.
- Carga de conexión: clientes creados gradualmente cada 5 ms y mantenidos conectados durante 5 s.
- Latencia: 20 alertas por escenario; se midieron min/promedio/máximo, p95 y p99.
- Throughput: 10 s por escenario, cinco emisores concurrentes, diez receptores en la zona `norte`.
- Node.js: 24.13.1, Express 5.3.0, Socket.IO 4.8.4.
- Flask: Python 3.13.8, Flask-SocketIO 5.7.0, eventlet 0.41.2.
- Configuración móvil revisada: [env.ts](../mobile/src/config/env.ts) está apuntando a Node (`SERVER_PORT = 3001`); para probar Flask debe cambiarse a 5000 de forma local.

## Verificación funcional

Las pruebas `test_rooms.py`, `test_difusion.py` y `test_validacion.py` pasaron en ambos servidores. Se verificó entrada a rooms, difusión solo a la zona destino, cambio de zona sin reconexión y rechazo de payloads inválidos.

## Resultados comparativos

Los CSV consolidados están en [comparacion_node.csv](./node/comparacion_node.csv) y [comparacion_flask.csv](./flask/comparacion_flask.csv).

| Clientes | Node: conexión | Flask: conexión | Node: latencia promedio | Flask: latencia promedio | Node: entrega | Flask: entrega |
|---:|---:|---:|---:|---:|---:|---:|
| 50 | 50/50 | 50/50 | 13.33 ms | 17.88 ms | 2568.49 msg/s | 2061.92 msg/s |
| 100 | 100/100 | 100/100 | 17.42 ms | 18.45 ms | 1865.84 msg/s | 2118.33 msg/s |
| 500 | 500/500 | 500/500 | 26.73 ms | 38.20 ms | 1745.65 msg/s | 1824.76 msg/s |
| 1000 | 1000/1000 | 511/1000 | 47.17 ms | No medible | 1867.28 msg/s | No medible |

## Errores y diferencias

- Node completó los cuatro escenarios sin conexiones fallidas, desconexiones inesperadas ni pérdida de mensajes.
- Flask completó 50, 100 y 500 clientes sin errores y entregó todos los mensajes esperados.
- Flask falló al escalar a 1000: conectó 510–511 clientes, rechazó 489 y no pudo conectar los emisores; la latencia y el throughput de ese escenario no son medibles.
- En los escenarios válidos, Node mostró menor latencia promedio en 50, 100 y 500 clientes. Flask tuvo mejor throughput de entrega en 100 y 500, mientras Node fue mejor en 50.
- Tras el intento de sobrecarga Flask a 1000, el proceso perdió el listener. Se reinició el servidor y se repitió throughput para obtener una medición válida hasta 500 clientes; el intento auxiliar posterior al fallo, que no pudo iniciar sus 50 clientes, quedó preservado en [throughput_1000_intento_fallido.csv](./flask/throughput_1000_intento_fallido.csv).
- Eventlet emitió advertencias de deprecación y de `RLock` no greened durante la ejecución. Deben considerarse riesgos de mantenimiento y estabilidad antes de usar Flask con esta concurrencia.

## Archivos originales conservados

- Node: carpeta de [resultados Node](./node/) con únicamente los CSV de carga, latencia y throughput.
- Flask: carpeta de [resultados Flask](./flask/) con únicamente los CSV de carga, latencia y throughput.
- Los scripts originales escriben nombres fijos; por eso cada ejecución se copió inmediatamente a una carpeta con fecha y hora.

## Conclusión

Para el objetivo de soportar 1000 clientes, Node.js es el único stack que cumplió el escenario completo en esta ejecución. Flask es funcional y comparable hasta 500 clientes, pero requiere investigar el límite de conexiones/eventlet y repetir la prueba después de ajustar el servidor. Los datos de Flask para 1000 deben tratarse como fallo de capacidad, no como cero de rendimiento.
