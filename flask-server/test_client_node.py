import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("Conectado al servidor")

@sio.event
def disconnect():
    print("Desconectado")

sio.connect("http://localhost:3001")
time.sleep(2)
sio.disconnect()