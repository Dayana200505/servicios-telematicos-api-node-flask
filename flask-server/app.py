import eventlet
eventlet.monkey_patch()

import time

from flask import Flask, request
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Nombres de eventos (deben coincidir con EVENTS en mobile/src/config/env.ts).
EVT_SUBSCRIBE_ZONE = "suscribir_zona"
EVT_EMIT_ALERT = "emitir_alerta"
EVT_ALERT_RECEIVED = "alerta_recibida"
EVT_ZONE_CONFIRMED = "zona_confirmada"
EVT_ZONE_ERROR = "error_zona"
EVT_ALERT_ERROR = "error_alerta"

# Zonas logicas permitidas (cada una es una room).
ZONAS_VALIDAS = ["norte", "centro", "sur"]

# sid -> zona actual del cliente.
zona_por_cliente = {}


@app.route("/")
def index():
    return {"status": "ok", "server": "flask"}


# Acepta "norte" o {"zona": "norte"}.
def normalizar_zona(data):
    valor = data if isinstance(data, str) else (data or {}).get("zona")
    return str(valor or "").strip().lower()


# Incorpora al cliente a la room de su zona (y lo saca de la anterior).
def asignar_zona(data):
    nueva = normalizar_zona(data)

    if nueva not in ZONAS_VALIDAS:
        emit(EVT_ZONE_ERROR, {"mensaje": f"Zona invalida. Opciones: {', '.join(ZONAS_VALIDAS)}"})
        return

    anterior = zona_por_cliente.get(request.sid)
    if anterior and anterior != nueva:
        leave_room(anterior)

    join_room(nueva)
    zona_por_cliente[request.sid] = nueva
    emit(EVT_ZONE_CONFIRMED, {"zona": nueva})
    print(f"Cliente {request.sid} -> room {nueva}")


@socketio.on("connect")
def handle_connect(auth=None):
    print(f"Cliente conectado: {request.sid}")

    # Zona enviada al conectar (auth o query), si el cliente la manda asi.
    inicial = auth.get("zona") if isinstance(auth, dict) else None
    inicial = inicial or request.args.get("zona")
    if inicial:
        asignar_zona(inicial)


# Elegir o cambiar de zona sin reconectar.
@socketio.on(EVT_SUBSCRIBE_ZONE)
def handle_suscribir_zona(data):
    asignar_zona(data)


# Alerta: solo llega a la room de la zona destino.
@socketio.on(EVT_EMIT_ALERT)
def handle_emitir_alerta(data):
    data = data or {}
    zona = normalizar_zona(data)
    tipo, gravedad, mensaje = data.get("tipo"), data.get("gravedad"), data.get("mensaje")

    if zona not in ZONAS_VALIDAS or not tipo or not gravedad or not mensaje:
        emit(EVT_ALERT_ERROR, {"mensaje": "Alerta incompleta o zona invalida"})
        return

    alerta = {
        "tipo": tipo,
        "gravedad": gravedad,
        "zona": zona,
        "mensaje": mensaje,
        "emitida_en": int(time.time() * 1000),
    }
    socketio.emit(EVT_ALERT_RECEIVED, alerta, to=zona)
    print(f"Alerta {tipo}/{gravedad} -> {zona}")


@socketio.on("disconnect")
def handle_disconnect():
    zona_por_cliente.pop(request.sid, None)
    print(f"Cliente desconectado: {request.sid}")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)