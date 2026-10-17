import sys
import time

import socketio

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000"

errores = []
sio = socketio.Client()


@sio.on("error_alerta")
def on_error(data):
    errores.append(data.get("mensaje"))


sio.connect(URL, transports=["websocket"])

base = {"tipo": "incendio", "gravedad": "alto", "zona": "norte", "mensaje": "Prueba"}

# (nombre, alerta, debe_ser_rechazada)
casos = [
    ("Alerta valida", base, False),
    ("Gravedad con alias 'alta'", {**base, "gravedad": "alta"}, False),
    ("Falta el mensaje", {k: v for k, v in base.items() if k != "mensaje"}, True),
    ("Tipo vacio", {**base, "tipo": "   "}, True),
    ("Zona invalida", {**base, "zona": "este"}, True),
    ("Gravedad invalida", {**base, "gravedad": "urgente"}, True),
    ("Mensaje demasiado largo", {**base, "mensaje": "x" * 300}, True),
    ("No es un objeto", "hola", True),
]

for nombre, alerta, debe_rechazar in casos:
    errores.clear()
    sio.emit("emitir_alerta", alerta)
    time.sleep(0.5)
    rechazada = len(errores) > 0
    estado = "OK" if rechazada == debe_rechazar else "FALLO"
    detalle = errores[0] if rechazada else "aceptada"
    print(f"[{estado}] {nombre}: {detalle}")

sio.disconnect()