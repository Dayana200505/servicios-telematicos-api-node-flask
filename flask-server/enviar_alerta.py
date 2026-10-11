import sys
import time

import socketio

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3001"
ZONA = sys.argv[2] if len(sys.argv) > 2 else "norte"

sio = socketio.Client()
sio.connect(URL, transports=["websocket"])
sio.emit("emitir_alerta", {"tipo": "incendio", "gravedad": "alta", "zona": ZONA, "mensaje": f"Prueba de alerta en zona {ZONA}"})
time.sleep(0.5)
sio.disconnect()
print(f"Alerta enviada a {ZONA} en {URL}")