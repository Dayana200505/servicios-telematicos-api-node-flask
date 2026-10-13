# test_zona.py
# Cliente de prueba que se conecta al servidor Flask‑SocketIO y envía una zona.
# Sirve para validar que el listener suscribir_zona funciona antes de lanzar la app móvil.

import socketio

# URL del servidor Flask (localhost en la misma máquina)
SERVER_URL = "http://127.0.0.1:5000"

sio = socketio.Client()

@sio.event
def connect():
    print("[OK] Connected to server")
    # Enviar zona de prueba (puedes cambiar a "centro" o "sur")
    sio.emit("suscribir_zona", "norte")

@sio.event
def zona_confirmada(data):
    print("✅ Zona confirmada por el servidor:", data)
    sio.disconnect()

@sio.event
def error_zona(data):
    print("⚠️ Error de zona recibido:", data)

@sio.event
def disconnect(*args):
    print("[WARN] Disconnected from server")

if __name__ == "__main__":
    try:
        sio.connect(SERVER_URL)
        sio.wait()
    except Exception as e:
        print("❌ No se pudo conectar:", e)
