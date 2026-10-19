"""
    python cliente_prueba.py http://localhost:5000 norte
    python cliente_prueba.py http://localhost:3001 sur --duracion 30
"""

import argparse
import time

import socketio

ZONAS_VALIDAS = {"norte", "centro", "sur"}


def main():
    parser = argparse.ArgumentParser(description="Cliente de prueba de alertas por zona")
    parser.add_argument("url", nargs="?", default="http://localhost:5000")
    parser.add_argument("zona", nargs="?", default="norte", choices=sorted(ZONAS_VALIDAS))
    parser.add_argument("--duracion", type=float, default=30, help="segundos de escucha")
    args = parser.parse_args()

    sio = socketio.Client()

    @sio.event
    def connect():
        print(f"[OK] Conectado a {args.url} (sid={sio.sid})")
        sio.emit("suscribir_zona", {"zona": args.zona})

    @sio.on("zona_confirmada")
    def zona_confirmada(data):
        print(f"[OK] Suscrito a zona: {data.get('zona')}")

    @sio.on("error_zona")
    def error_zona(data):
        print(f"[ERROR] No se pudo suscribir: {data.get('mensaje')}")

    @sio.on("alerta_recibida")
    def alerta_recibida(data):
        print("\n[ALERTA RECIBIDA]")
        print(f"  Tipo: {data.get('tipo')}")
        print(f"  Gravedad: {data.get('gravedad')}")
        print(f"  Zona: {data.get('zona')}")
        print(f"  Mensaje: {data.get('mensaje')}")
        print(f"  Fecha/hora: {data.get('fecha_hora', data.get('emitida_en'))}")

    @sio.on("error_alerta")
    def error_alerta(data):
        print(f"[ERROR] Alerta rechazada: {data.get('mensaje')}")

    @sio.event
    def disconnect():
        print("[OK] Desconectado")

    try:
        sio.connect(args.url, transports=["websocket"])
        time.sleep(args.duracion)
    finally:
        if sio.connected:
            sio.disconnect()


if __name__ == "__main__":
    main()
