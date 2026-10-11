import sys
import time

import socketio


# Para Flask: python test_rooms.py http://localhost:5000
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"

# Nombres de eventos 
SUBSCRIBE_ZONE = "suscribir_zona"
EMIT_ALERT = "emitir_alerta"
ALERT_RECEIVED = "alerta_recibida"
ZONE_CONFIRMED = "zona_confirmada"

recibidos = {"n1": [], "n2": [], "s1": []}
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


c1 = crear_cliente("n1", "norte")
c2 = crear_cliente("n2", "norte")
c3 = crear_cliente("s1", "sur")
time.sleep(0.5)

assert confirmadas == {"n1": "norte", "n2": "norte", "s1": "sur"}, f"Rooms incorrectas: {confirmadas}"
print("OK: cada cliente entro a su room")

# Alerta a norte: solo n1 y n2 deben recibirla.
c1.emit(EMIT_ALERT, {"tipo": "incendio", "gravedad": "alta", "zona": "norte", "mensaje": "Incendio en zona norte"})
time.sleep(0.5)
assert len(recibidos["n1"]) == 1 and len(recibidos["n2"]) == 1, "Los de norte no recibieron la alerta"
assert len(recibidos["s1"]) == 0, "El cliente de sur recibio una alerta que no le corresponde"
print("OK: alerta segmentada por zona")

# Cambio de zona sin reconectar: s1 pasa a norte.
c3.emit(SUBSCRIBE_ZONE, {"zona": "norte"})
time.sleep(0.5)
c1.emit(EMIT_ALERT, {"tipo": "inundacion", "gravedad": "media", "zona": "norte", "mensaje": "Inundacion en zona norte"})
time.sleep(0.5)
assert len(recibidos["s1"]) == 1, "s1 no recibio la alerta tras cambiar a norte"
print("OK: cambio de zona sin reconectar")

for c in (c1, c2, c3):
    c.disconnect()
print("Todas las verificaciones pasaron en", URL)