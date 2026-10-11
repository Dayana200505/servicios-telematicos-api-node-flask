import eventlet
eventlet.monkey_patch()

from flask import Flask, request
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

@app.route("/")
def index():
    return {"status": "ok", "server": "flask"}

@socketio.on("connect")
def handle_connect():
    print(f"Cliente conectado: {request.sid}")

@socketio.on("disconnect")
def handle_disconnect():
    print(f"Cliente desconectado: {request.sid}")

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)