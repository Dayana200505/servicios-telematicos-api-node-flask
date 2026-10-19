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

// Nombres de eventos (deben coincidir con EVENTS en mobile/src/config/env.ts).
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

const GRAVEDADES_VALIDAS = ["baja", "media", "alta"];
const ALIAS_GRAVEDAD = new Map([
  ["bajo", "baja"],
  ["medio", "media"],
  ["alto", "alta"],
]);
const CAMPOS_OBLIGATORIOS = ["tipo", "gravedad", "zona", "mensaje"];
const MAX_MENSAJE = 200;

// socket.id -> zona actual del cliente.
const zonaPorCliente = new Map();

// Ruta HTTP para comprobar que el servidor funciona.
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

// Incorpora al cliente a la room de su zona (y lo saca de la anterior).
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

function limpiar(valor) {
  return valor !== undefined && valor !== null ? String(valor).trim() : "";
}

// Devuelve { alerta } si es valida, o { error } si no.
function validarAlerta(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { error: "La alerta debe enviarse con tipo, gravedad, zona y mensaje" };
  }

  const faltantes = CAMPOS_OBLIGATORIOS.filter((c) => !limpiar(data[c]));
  if (faltantes.length > 0) {
    return { error: `Faltan campos obligatorios: ${faltantes.join(", ")}` };
  }

  const zona = limpiar(data.zona).toLowerCase();
  if (!ZONAS_VALIDAS.includes(zona)) {
    return { error: `Zona invalida. Opciones: ${ZONAS_VALIDAS.join(", ")}` };
  }

  let gravedad = limpiar(data.gravedad).toLowerCase();
  gravedad = ALIAS_GRAVEDAD.get(gravedad) || gravedad;
  if (!GRAVEDADES_VALIDAS.includes(gravedad)) {
    return { error: `Gravedad invalida. Opciones: ${GRAVEDADES_VALIDAS.join(", ")}` };
  }

  const mensaje = limpiar(data.mensaje);
  if (mensaje.length > MAX_MENSAJE) {
    return { error: `El mensaje supera ${MAX_MENSAJE} caracteres` };
  }

  return {
    alerta: {
      tipo: limpiar(data.tipo).toLowerCase(),
      gravedad,
      zona,
      mensaje,
    },
  };
}

// Cantidad de clientes suscritos a una zona.
function contarClientes(zona) {
  let total = 0;
  for (const z of zonaPorCliente.values()) {
    if (z === zona) total++;
  }
  return total;
}

// Difusion segmentada (pub/sub): publica la alerta solo en la room de la zona destino.
function difundirAlerta(alerta) {
  const destinatarios = contarClientes(alerta.zona);
  io.to(alerta.zona).emit(EVT.ALERT_RECEIVED, alerta);
  console.log(
    `Alerta ${alerta.tipo}/${alerta.gravedad} -> ${alerta.zona} (${destinatarios} clientes)`
  );
  return destinatarios;
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

  // Alerta: se valida, se registra y solo llega a la room de la zona destino.
  socket.on(EVT.EMIT_ALERT, (data, ack) => {
    const responder = typeof ack === "function" ? ack : () => {};
    const { alerta, error } = validarAlerta(data);

    if (error) {
      console.log(`Alerta rechazada: ${error}`);
      socket.emit(EVT.ALERT_ERROR, { mensaje: error });
      responder({ ok: false, error });
      return;
    }

    alerta.emitida_en = Date.now();

    // TODO (Sarahi): aqui se registra la alerta en SQLite/log.
    difundirAlerta(alerta);
    responder({ ok: true });
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