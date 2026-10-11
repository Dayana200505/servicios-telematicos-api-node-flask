const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = 3001;

// Nombres de eventos 
const EVT = {
  SUBSCRIBE_ZONE: "suscribir_zona",
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
  ZONE_CONFIRMED: "zona_confirmada",
  ZONE_ERROR: "error_zona",
  ALERT_ERROR: "error_alerta",
};

// Zonas logicas permitidas (cada una es una room).
const ZONAS_VALIDAS = ["norte", "centro", "sur"];

// socket.id -> zona actual del cliente.
const zonaPorCliente = new Map();


app.get("/", (req, res) => {
  res.json({
    message: "Servidor base de alertas funcionando",
    status: "OK",
  });
});

// Acepta "norte" o { zona: "norte" }.
function normalizarZona(data) {
  const valor = typeof data === "string" ? data : data && data.zona;
  return String(valor || "").trim().toLowerCase();
}

// Incorpora al cliente a la room de su zona.
function asignarZona(socket, data) {
  const nueva = normalizarZona(data);

  if (!ZONAS_VALIDAS.includes(nueva)) {
    socket.emit(EVT.ZONE_ERROR, {
      mensaje: `Zona invalida. Opciones: ${ZONAS_VALIDAS.join(", ")}`,
    });
    return;
  }

  const anterior = zonaPorCliente.get(socket.id);
  if (anterior && anterior !== nueva) {
    socket.leave(anterior);
  }

  socket.join(nueva);
  zonaPorCliente.set(socket.id, nueva);
  socket.emit(EVT.ZONE_CONFIRMED, { zona: nueva });
  console.log(`Cliente ${socket.id} -> room ${nueva}`);
}

// Conexión de clientes mediante Socket.IO.
io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // Zona enviada al conectar (auth o query), si el cliente la manda asi.
  const inicial =
    (socket.handshake.auth && socket.handshake.auth.zona) ||
    (socket.handshake.query && socket.handshake.query.zona);
  if (inicial) {
    asignarZona(socket, inicial);
  }

  // Elegir o cambiar de zona sin reconectar.
  socket.on(EVT.SUBSCRIBE_ZONE, (data) => asignarZona(socket, data));

  // Alerta: solo llega a la room de la zona destino.
  socket.on(EVT.EMIT_ALERT, (data) => {
    const zona = normalizarZona(data);
    const { tipo, gravedad, mensaje } = data || {};

    if (!ZONAS_VALIDAS.includes(zona) || !tipo || !gravedad || !mensaje) {
      socket.emit(EVT.ALERT_ERROR, {
        mensaje: "Alerta incompleta o zona invalida",
      });
      return;
    }

    const alerta = { tipo, gravedad, zona, mensaje, emitida_en: Date.now() };
    io.to(zona).emit(EVT.ALERT_RECEIVED, alerta);
    console.log(`Alerta ${tipo}/${gravedad} -> ${zona}`);
  });

  socket.on("disconnect", () => {
    zonaPorCliente.delete(socket.id);
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Iniciar el servidor.
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP disponible en el puerto ${PORT}`);
  console.log(`Prueba local: http://localhost:${PORT}`);
});