# Actividades implementadas y validadas

## 1. Estado general

Todas las actividades descritas están implementadas para Node.js y Flask. La app móvil permite seleccionar el backend, emitir alertas, consultar el historial y ejecutar pruebas de carga desde el panel de superusuario.

| Actividad | Responsable | Node.js | Flask | Evidencia |
|---|---|---:|---:|---|
| Interfaz de superusuario y emisión | Lineth | Implementado | Implementado | `mobile/src/screens/SuperuserScreen.tsx`, `mobile/src/hooks/useAlertEmitter.ts` |
| Validación y manejo de errores | Dolly | Implementado | Implementado | `node-server/server.js`, `flask-server/app.py`, prueba `validacion` |
| Desconexión, reconexión y recuperación | Jherson | Implementado | Implementado | `mobile/src/services/socket.ts`, `flask-server/test_reconexion.py` |
| Comparación Node.js vs Flask | Dayana | Implementado | Implementado | `resultados/INFORME_PRUEBAS_NODE_FLASK.md`, CSV de `resultados/` |
| Tasa de entrega emitidas/recibidas | Sarahi | Implementado | Implementado | `superusuario/server.js`, pestaña `Pruebas` |
| Validación funcional y repetición | Stefany | Implementado | Implementado | `flask-server/ejecutar_pruebas.py`, CSV de `flask-server/resultados_validacion/` |

## 2. Funcionalidad entregada

### Panel de superusuario

- Campos obligatorios: tipo, gravedad, zona y mensaje.
- Valores permitidos: ocho tipos de alerta, tres gravedades y las zonas norte, centro y sur.
- Validación de mensaje vacío, longitud mínima de la interfaz y máximo de 200 caracteres.
- Confirmación antes de emitir, mensaje de éxito/error y consulta del historial por backend y zona.
- Selección de Node.js o Flask desde la interfaz.
- Pruebas de carga con 50, 100, 500 y 1000 usuarios, distribuidos en la zona destino o entre las tres zonas.
- Resultado visible: objetivo, conectados en destino, recibieron, no recibieron, sin conexión, latencia y porcentaje de entrega.

### Servidores

Ambos servidores validan y normalizan el payload antes de persistirlo y difundirlo. Una alerta inválida no se guarda ni se envía. Las alertas se almacenan en SQLite y se entregan únicamente a la room de la zona elegida.

La reconexión conserva la zona y el último id recibido. Al reconectar, el cliente vuelve a suscribirse y recibe `alertas_perdidas` en orden. La app móvil evita duplicar alertas recuperadas y actualiza el último id para futuras reconexiones.

## 3. Pruebas ejecutadas

El ejecutor `flask-server/ejecutar_pruebas.py` se ejecutó una vez contra cada backend el 3 de noviembre de 2026:

| Backend | HTTP raíz | Historial | Rooms | Difusión | Validación | Cambio de zona | Reconexión |
|---|---:|---:|---:|---:|---:|---:|---:|
| Node.js | PASA | PASA | PASA | PASA | PASA | PASA | PASA |
| Flask | PASA | PASA | PASA | PASA | PASA | PASA | PASA |

Evidencias generadas:

- Node.js: `flask-server/resultados_validacion/validacion_20261103_175341.csv` y su resumen.
- Flask: `flask-server/resultados_validacion/validacion_20261103_175506.csv` y su resumen.
- Comparativa de carga, latencia y throughput: `resultados/INFORME_PRUEBAS_NODE_FLASK.md`.

La app móvil pasa `npx tsc --noEmit` y `npm run lint`. La validación reproducible está definida en `mobile/.tsupgrader/runtime-validation/eval-plan.json`.

## 4. Lectura de los escenarios 50, 100 y 1000

En la pestaña **Pruebas**, el panel reporta explícitamente si la alerta llegó a todos los usuarios objetivo (`recibieron = objetivo`) o cuántos quedaron pendientes (`no_recibieron`). Si hay clientes que no pudieron conectarse, se separan en `sin_conexion`. Para distinguir pérdida de conexión de pérdida de recepción también se muestran los conectados de la zona y el porcentaje respecto a los conectados.

Los datos experimentales existentes muestran que Node.js completó 50, 100, 500 y 1000 clientes; Flask completó 50, 100 y 500, mientras que el escenario de 1000 alcanzó aproximadamente 511 conexiones. Ese resultado se reporta como límite de capacidad de Flask, no como una tasa de entrega cero.

## 5. Observación técnica

Flask inicia con advertencias de deprecación de Eventlet y de `RLock` no greened. No impidieron las pruebas funcionales, pero deben considerarse para una futura migración del modo de concurrencia.
