import sys
import time

import socketio

# Por defecto prueba el servidor Node (puerto 3001).
# Para Flask: python test_cambio_zona.py http://localhost:5000
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"

# Nombres de eventos (iguales a EVENTS en mobile/src/config/env.ts).
SUBSCRIBE_ZONE = "suscribir_zona"
EMIT_ALERT = "emitir_alerta"
ALERT_RECEIVED = "alerta_recibida"
ZONE_CONFIRMED = "zona_confirmada"
ZONE_ERROR = "error_zona"

ZONAS = ["norte", "centro", "sur"]

recibidas = []
confirmaciones = []
errores = []
desconexiones = []

cliente = socketio.Client()


@cliente.on(ALERT_RECEIVED)
def _alerta(data):
    recibidas.append(data)


@cliente.on(ZONE_CONFIRMED)
def _confirmada(data):
    confirmaciones.append(data["zona"])


@cliente.on(ZONE_ERROR)
def _error(data):
    errores.append(data)


@cliente.event
def disconnect():
    desconexiones.append(True)


def cambiar_zona(zona):
    cliente.emit(SUBSCRIBE_ZONE, {"zona": zona})
    time.sleep(0.4)


def emitir(zona):
    alerta = {
        "tipo": "incendio",
        "gravedad": "alta",
        "zona": zona,
        "mensaje": f"Prueba de cambio de zona: {zona}",
    }
    resp = emisor.call(EMIT_ALERT, alerta, timeout=5)
    assert resp == {"ok": True}, f"Respuesta inesperada del servidor: {resp}"
    time.sleep(0.4)


cliente.connect(URL, transports=["websocket"])
sid_inicial = cliente.sid

# El emisor no se suscribe a ninguna zona: solo publica.
emisor = socketio.Client()
emisor.connect(URL, transports=["websocket"])
time.sleep(0.5)

# 1. El cliente cambia varias veces de zona y en cada una recibe solo la alerta de su zona actual.
secuencia = ["norte", "sur", "centro", "norte", "centro", "sur"]
for zona_actual in secuencia:
    cambiar_zona(zona_actual)
    assert confirmaciones[-1] == zona_actual, f"No se confirmo la zona {zona_actual}"

    antes = len(recibidas)
    for zona in ZONAS:
        emitir(zona)
    nuevas = recibidas[antes:]
    assert len(nuevas) == 1, f"En {zona_actual} recibio {len(nuevas)} alertas, esperaba 1"
    assert nuevas[0]["zona"] == zona_actual, f"En {zona_actual} recibio una alerta de {nuevas[0]['zona']}"
print("OK: tras cada cambio el cliente recibe solo la alerta de su zona actual")

# 2. Una zona invalida no altera la suscripcion: el cliente sigue en la ultima zona valida.
ultima_zona = secuencia[-1]
cambiar_zona("este")
assert len(errores) == 1, "El servidor no aviso que la zona era invalida"
antes = len(recibidas)
for zona in ZONAS:
    emitir(zona)
nuevas = recibidas[antes:]
assert len(nuevas) == 1 and nuevas[0]["zona"] == ultima_zona, "La zona invalida altero la suscripcion"
print("OK: una zona invalida no cambia la suscripcion actual")

# 3. Volver a suscribirse a la misma zona no duplica las alertas.
cambiar_zona(ultima_zona)
antes = len(recibidas)
emitir(ultima_zona)
assert len(recibidas) - antes == 1, "Se duplicaron las alertas al repetir la zona"
print("OK: repetir la misma zona no duplica alertas")

# 4. Todo ocurrio con la misma conexion: no hubo desconexiones ni cambio de ID.
assert cliente.connected and cliente.sid == sid_inicial, "La conexion cambio durante las pruebas"
assert not desconexiones, "El cliente se desconecto durante las pruebas"
print(f"OK: el cliente mantuvo la misma conexion ({sid_inicial}) en todos los cambios")

cliente.disconnect()
emisor.disconnect()
print("Todas las verificaciones de cambio de zona pasaron en", URL)