# Eventlet deprecated – removed. Using threading async mode.

import time
from datetime import datetime
from flask import Flask, request
from db.alertas import init_db, guardar_alerta
from flask_socketio import SocketIO, join_room, leave_room, emit


app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
# Inicializamos la base de datos al arrancar
init_db()

# Nombres de eventos (deben coincidir con EVENTS en mobile/src/config/env.ts).
EVT_SUBSCRIBE_ZONE = "suscribir_zona"
EVT_EMIT_ALERT = "emitir_alerta"
EVT_ALERT_RECEIVED = "alerta_recibida"
EVT_ZONE_CONFIRMED = "zona_confirmada"
EVT_ZONE_ERROR = "error_zona"
EVT_ALERT_ERROR = "error_alerta"

# Zonas logicas permitidas (cada una es una room).
ZONAS_VALIDAS = ["norte", "centro", "sur"]

GRAVEDADES_VALIDAS = ["baja", "media", "alta"]
ALIAS_GRAVEDAD = {"bajo": "baja", "medio": "media", "alto": "alta"}
CAMPOS_OBLIGATORIOS = ["tipo", "gravedad", "zona", "mensaje"]
MAX_MENSAJE = 200

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


def limpiar(valor):
    return str(valor).strip() if valor is not None else ""


# Devuelve (alerta_limpia, None) si es valida, o (None, motivo) si no.
def validar_alerta(data):
    if not isinstance(data, dict):
        return None, "La alerta debe enviarse con tipo, gravedad, zona y mensaje"

    faltantes = [c for c in CAMPOS_OBLIGATORIOS if not limpiar(data.get(c))]
    if faltantes:
        return None, f"Faltan campos obligatorios: {', '.join(faltantes)}"

    zona = limpiar(data["zona"]).lower()
    if zona not in ZONAS_VALIDAS:
        return None, f"Zona invalida. Opciones: {', '.join(ZONAS_VALIDAS)}"

    gravedad = limpiar(data["gravedad"]).lower()
    gravedad = ALIAS_GRAVEDAD.get(gravedad, gravedad)
    if gravedad not in GRAVEDADES_VALIDAS:
        return None, f"Gravedad invalida. Opciones: {', '.join(GRAVEDADES_VALIDAS)}"

    mensaje = limpiar(data["mensaje"])
    if len(mensaje) > MAX_MENSAJE:
        return None, f"El mensaje supera {MAX_MENSAJE} caracteres"

    return {
        "tipo": limpiar(data["tipo"]).lower(),
        "gravedad": gravedad,
        "zona": zona,
        "mensaje": mensaje,
    }, None


# Cantidad de clientes suscritos a una zona.
def contar_clientes(zona):
    return sum(1 for z in zona_por_cliente.values() if z == zona)


# Difusion segmentada (pub/sub): publica la alerta solo en la room de la zona destino.
def difundir_alerta(alerta):
    destinatarios = contar_clientes(alerta["zona"])
    socketio.emit(EVT_ALERT_RECEIVED, alerta, to=alerta["zona"])
    print(f"Alerta {alerta['tipo']}/{alerta['gravedad']} -> {alerta['zona']} ({destinatarios} clientes)")
    return destinatarios


# Alerta: se valida, se registra y solo llega a la room de la zona destino.
@socketio.on(EVT_EMIT_ALERT)
def handle_emitir_alerta(data):
    alerta, error = validar_alerta(data)

    if error:
        print(f"Alerta rechazada: {error}")
        emit(EVT_ALERT_ERROR, {"mensaje": error}) 
        return {"ok": False, "error": error}

    alerta["emitida_en"] = int(time.time() * 1000)

    # TODO aqui se registra la alerta en SQLite/log.
    difundir_alerta(alerta)
    return {"ok": True}


@socketio.on("disconnect")
def handle_disconnect():
    zona_por_cliente.pop(request.sid, None)
    print(f"Cliente desconectado: {request.sid}")


if __name__ == "__main__":
    print("Flask‑SocketIO server listening on http://0.0.0.0:5000")
    socketio.run(app, host="0.0.0.0", port=5000)
    