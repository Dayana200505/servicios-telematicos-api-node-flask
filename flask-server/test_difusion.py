import sys
import time

import socketio

# Por defecto prueba el servidor Node (puerto 3001).
# Para Flask: python test_difusion.py http://localhost:5000
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"

# Nombres de eventos (iguales a EVENTS en mobile/src/config/env.ts).
SUBSCRIBE_ZONE = "suscribir_zona"
EMIT_ALERT = "emitir_alerta"
ALERT_RECEIVED = "alerta_recibida"
ZONE_CONFIRMED = "zona_confirmada"

# Dos clientes en norte, uno en centro y uno en sur.
CLIENTES = [("n1", "norte"), ("n2", "norte"), ("c1", "centro"), ("s1", "sur")]

recibidos = {nombre: [] for nombre, _ in CLIENTES}
confirmadas = {}


def crear_cliente(nombre, zona):
    sio = socketio.Client()

    @sio.on(ALERT_RECEIVED)
    def _alerta(data):
        recibidos[nombre].append(data)

    @sio.on(ZONE_CONFIRMED)
    def _confirmada(data):
        confirmadas[nombre] = data["zona"]

    sio.connect(URL, transports=["websocket"])
    sio.emit(SUBSCRIBE_ZONE, {"zona": zona})
    return sio


def emitir(emisor, alerta):
    # call() espera la respuesta (ack) del servidor: {"ok": True} o {"ok": False, "error": ...}
    respuesta = emisor.call(EMIT_ALERT, alerta, timeout=5)
    time.sleep(0.4)
    return respuesta


def total_recibidas():
    return sum(len(v) for v in recibidos.values())


clientes = {nombre: crear_cliente(nombre, zona) for nombre, zona in CLIENTES}

# El emisor no se suscribe a ninguna zona: solo publica.
emisor = socketio.Client()
emisor.connect(URL, transports=["websocket"])
time.sleep(0.6)

assert confirmadas == dict(CLIENTES), f"Rooms incorrectas: {confirmadas}"
print("OK: los 4 clientes entraron a su room")

# 1. Una alerta por zona: cada cliente debe recibir solo la de su zona.
for zona in ("norte", "centro", "sur"):
    resp = emitir(emisor, {"tipo": "incendio", "gravedad": "alta", "zona": zona, "mensaje": f"Prueba en {zona}"})
    assert resp == {"ok": True}, f"Respuesta inesperada del servidor: {resp}"

for nombre, zona in CLIENTES:
    assert len(recibidos[nombre]) == 1, f"{nombre} recibio {len(recibidos[nombre])} alertas, esperaba 1"
    assert recibidos[nombre][0]["zona"] == zona, f"{nombre} recibio una alerta de otra zona"
    assert "emitida_en" in recibidos[nombre][0], "La alerta no incluye emitida_en"
print("OK: cada alerta llego solo a los clientes de su zona")

# 2. Alertas invalidas: se rechazan y no le llegan a nadie.
invalidas = [
    {"tipo": "incendio", "gravedad": "critica", "zona": "norte", "mensaje": "gravedad invalida"},
    {"tipo": "incendio", "gravedad": "alta", "zona": "este", "mensaje": "zona invalida"},
    {"tipo": "incendio", "gravedad": "alta", "zona": "norte"},
]
for invalida in invalidas:
    resp = emitir(emisor, invalida)
    assert resp.get("ok") is False, f"El servidor acepto una alerta invalida: {invalida}"
assert total_recibidas() == 4, "Una alerta invalida llego a algun cliente"
print("OK: las alertas invalidas se rechazan y no se difunden")

# 3. Normalizacion: gravedad "Alto" -> "alta", tipo en minusculas.
resp = emitir(emisor, {"tipo": "Incendio", "gravedad": "Alto", "zona": "sur", "mensaje": "Prueba de formato"})
assert resp == {"ok": True}, f"Respuesta inesperada del servidor: {resp}"
ultima = recibidos["s1"][-1]
assert ultima["gravedad"] == "alta" and ultima["tipo"] == "incendio", f"Alerta mal normalizada: {ultima}"
assert len(recibidos["n1"]) == 1 and len(recibidos["n2"]) == 1 and len(recibidos["c1"]) == 1
print("OK: la alerta se normaliza y sigue llegando solo a su zona")

for c in list(clientes.values()) + [emisor]:
    c.disconnect()
print("Todas las verificaciones de difusion pasaron en", URL)