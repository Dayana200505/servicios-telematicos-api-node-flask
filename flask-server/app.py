# Eventlet deprecated – removed. Using threading async mode.

# eventlet.monkey_patch() removed – not needed with threading async mode.


from flask import Flask, request
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

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
    print("Flask‑SocketIO server listening on http://0.0.0.0:5000")
    socketio.run(app, host="0.0.0.0", port=5000)