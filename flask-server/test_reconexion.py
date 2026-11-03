import sys
import time

import socketio

# Por defecto prueba el servidor Node (puerto 3001).
# Para Flask: python test_reconexion.py http://localhost:5000
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"

SUBSCRIBE_ZONE = "suscribir_zona"
EMIT_ALERT = "emitir_alerta"
ALERT_RECEIVED = "alerta_recibida"
ZONE_CONFIRMED = "zona_confirmada"
LOST_ALERTS = "alertas_perdidas"

ZONA = "norte"
# Etiqueta unica por corrida: la base de datos conserva alertas de corridas anteriores.
ETIQUETA = f"reconexion-{int(time.time())}"

recibidas = []
perdidas = []
confirmaciones = []


def esperar(condicion, timeout=3.0):
    limite = time.time() + timeout
    while time.time() < limite:
        if condicion():
            return True
        time.sleep(0.05)
    return False


def crear_cliente():
    c = socketio.Client(reconnection=False)

    @c.on(ALERT_RECEIVED)
    def _alerta(data):
        recibidas.append(data)

    @c.on(ZONE_CONFIRMED)
    def _confirmada(data):
        confirmaciones.append(data["zona"])

    @c.on(LOST_ALERTS)
    def _perdidas(data):
        perdidas.append(data)

    c.connect(URL, transports=["websocket"])
    return c


def emitir(zona, numero):
    alerta = {
        "tipo": "incendio",
        "gravedad": "alta",
        "zona": zona,
        "mensaje": f"{ETIQUETA}-{numero}",
    }
    resp = emisor.call(EMIT_ALERT, alerta, timeout=5)
    assert resp.get("ok") is True, f"Respuesta inesperada del servidor: {resp}"


def msg(numero):
    return f"{ETIQUETA}-{numero}"


# El emisor no se suscribe a ninguna zona: solo publica.
emisor = socketio.Client(reconnection=False)
emisor.connect(URL, transports=["websocket"])

# 1. El cliente se suscribe a norte y recibe la alerta 1 (con su id).
cliente = crear_cliente()
cliente.emit(SUBSCRIBE_ZONE, {"zona": ZONA})
assert esperar(lambda: confirmaciones), "El servidor no confirmo la zona"
emitir(ZONA, 1)
assert esperar(lambda: len(recibidas) == 1), "El cliente no recibio la alerta 1"
assert recibidas[0]["mensaje"] == msg(1)
ultimo_id = recibidas[0].get("id")
assert isinstance(ultimo_id, int), "La alerta difundida no trae el campo id"
print(f"OK: el cliente recibio la alerta 1 (id {ultimo_id})")

# 2. El cliente se desconecta.
cliente.disconnect()
time.sleep(0.5)
print("OK: el cliente se desconecto")

# 3. Mientras esta desconectado se emiten 2 alertas de norte y 1 de sur.
emitir(ZONA, 2)
emitir("sur", 3)
emitir(ZONA, 4)
print("OK: se emitieron las alertas 2 y 4 (norte) y la 3 (sur) con el cliente desconectado")

# 4. El cliente se reconecta, se vuelve a suscribir y manda su ultimo id.
recibidas.clear()
confirmaciones.clear()
cliente = crear_cliente()
cliente.emit(SUBSCRIBE_ZONE, {"zona": ZONA, "ultimo_id": ultimo_id})
assert esperar(lambda: confirmaciones), "No se confirmo la zona tras reconectar"
assert esperar(lambda: perdidas), "El servidor no envio alertas_perdidas"

lista = perdidas[0]["alertas"]
mensajes = [a["mensaje"] for a in lista]
ids = [a["id"] for a in lista]
assert mensajes == [msg(2), msg(4)], f"Alertas recuperadas incorrectas: {mensajes}"
assert ids == sorted(ids) and all(i > ultimo_id for i in ids), f"Ids incorrectos: {ids}"
print("OK: recupero las alertas 2 y 4, en orden, sin la 1 ni la de otra zona")

# 5. No hay repetidas y las alertas nuevas siguen llegando en vivo.
time.sleep(0.5)
assert not any(a["mensaje"] == msg(1) for a in recibidas), "Se repitio la alerta 1"
emitir(ZONA, 5)
assert esperar(lambda: len(recibidas) == 1), "No llego la alerta en vivo tras reconectar"
assert recibidas[0]["mensaje"] == msg(5)
print("OK: tras reconectar, las alertas nuevas llegan en vivo y sin repetirse")

cliente.disconnect()
emisor.disconnect()
print("Todas las verificaciones de reconexion pasaron en", URL)