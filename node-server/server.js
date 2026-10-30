const express = require("express");
const http = require("http");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = 3001;
const EVT = {
  SUBSCRIBE_ZONE: "suscribir_zona",
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
  ZONE_CONFIRMED: "zona_confirmada",
  ZONE_ERROR: "error_zona",
  ALERT_ERROR: "error_alerta",
};

const ZONAS_VALIDAS = ["norte", "centro", "sur"];
const GRAVEDADES_VALIDAS = ["baja", "media", "alta"];
const ALIAS_GRAVEDAD = new Map([["bajo", "baja"], ["medio", "media"], ["alto", "alta"]]);
const CAMPOS_OBLIGATORIOS = ["tipo", "gravedad", "zona", "mensaje"];
const MAX_MENSAJE = 200;

const zonaPorCliente = new Map();
const databasePath = process.env.ALERTAS_DB_PATH || path.join(__dirname, "alertas.db");
const database = new DatabaseSync(databasePath);

database.exec(`
  CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    gravedad TEXT NOT NULL CHECK (gravedad IN ('baja', 'media', 'alta')),
    zona TEXT NOT NULL CHECK (zona IN ('norte', 'centro', 'sur')),
    mensaje TEXT NOT NULL,
    emitida_en INTEGER NOT NULL,
    fecha_hora TEXT NOT NULL
  )
`);

app.get("/", (req, res) => {
  res.json({ message: "Servidor base de alertas funcionando", status: "OK" });
});

// RUTA PARA EL HISTORIAL (SOLUCIONA EL ERROR)
app.get("/alertas", (req, res) => {
  try {
    const filas = database.prepare(
      "SELECT tipo, gravedad, zona, mensaje, emitida_en, fecha_hora FROM alertas ORDER BY id DESC LIMIT 50"
    ).all();
    res.json({ status: "ok", alertas: filas });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

function normalizarZona(data) {
  const valor = typeof data === "string" ? data : data && data.zona;
  return String(valor || "").trim().toLowerCase();
}

function asignarZona(socket, data) {
  const nueva = normalizarZona(data);
  if (!ZONAS_VALIDAS.includes(nueva)) {
    socket.emit(EVT.ZONE_ERROR, { mensaje: `Zona invalida. Opciones: ${ZONAS_VALIDAS.join(", ")}` });
    return;
  }
  const anterior = zonaPorCliente.get(socket.id);
  if (anterior && anterior !== nueva) socket.leave(anterior);
  socket.join(nueva);
  zonaPorCliente.set(socket.id, nueva);
  socket.emit(EVT.ZONE_CONFIRMED, { zona: nueva });
  console.log(`Cliente ${socket.id} -> room ${nueva}`);
}

function limpiar(valor) {
  return valor !== undefined && valor !== null ? String(valor).trim() : "";
}

function validarAlerta(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { error: "La alerta debe enviarse con tipo, gravedad, zona y mensaje" };
  }
  const faltantes = CAMPOS_OBLIGATORIOS.filter((c) => !limpiar(data[c]));
  if (faltantes.length > 0) return { error: `Faltan campos obligatorios: ${faltantes.join(", ")}` };

  const zona = limpiar(data.zona).toLowerCase();
  if (!ZONAS_VALIDAS.includes(zona)) return { error: `Zona invalida. Opciones: ${ZONAS_VALIDAS.join(", ")}` };

  let gravedad = limpiar(data.gravedad).toLowerCase();
  gravedad = ALIAS_GRAVEDAD.get(gravedad) || gravedad;
  if (!GRAVEDADES_VALIDAS.includes(gravedad)) return { error: `Gravedad invalida. Opciones: ${GRAVEDADES_VALIDAS.join(", ")}` };

  const mensaje = limpiar(data.mensaje);
  if (mensaje.length > MAX_MENSAJE) return { error: `El mensaje supera ${MAX_MENSAJE} caracteres` };

  return { alerta: { tipo: limpiar(data.tipo).toLowerCase(), gravedad, zona, mensaje } };
}

function contarClientes(zona) {
  let total = 0;
  for (const z of zonaPorCliente.values()) if (z === zona) total++;
  return total;
}

function difundirAlerta(alerta) {
  const destinatarios = contarClientes(alerta.zona);
  io.to(alerta.zona).emit(EVT.ALERT_RECEIVED, alerta);
  console.log(`Alerta ${alerta.tipo}/${alerta.gravedad} -> ${alerta.zona} (${destinatarios} clientes)`);
  return destinatarios;
}

io.on("connection", (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  const inicial = (socket.handshake.auth && socket.handshake.auth.zona) || (socket.handshake.query && socket.handshake.query.zona);
  if (inicial) asignarZona(socket, inicial);

  socket.on(EVT.SUBSCRIBE_ZONE, (data) => asignarZona(socket, data));

  socket.on(EVT.EMIT_ALERT, (data, ack) => {
    const responder = typeof ack === "function" ? ack : () => {};
    const { alerta, error } = validarAlerta(data);

    if (error) {
      socket.emit(EVT.ALERT_ERROR, { mensaje: error });
      responder({ ok: false, error });
      return;
    }

    alerta.emitida_en = Date.now();
    alerta.fecha_hora = new Date().toISOString();

    try {
      database.prepare(`
        INSERT INTO alertas (tipo, gravedad, zona, mensaje, emitida_en, fecha_hora)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(alerta.tipo, alerta.gravedad, alerta.zona, alerta.mensaje, alerta.emitida_en, alerta.fecha_hora);
    } catch (databaseError) {
      const databaseMessage = "No se pudo registrar la alerta en SQLite";
      socket.emit(EVT.ALERT_ERROR, { mensaje: databaseMessage });
      responder({ ok: false, error: databaseMessage });
      return;
    }

    difundirAlerta(alerta);
    responder({ ok: true });
  });

  socket.on("disconnect", () => {
    zonaPorCliente.delete(socket.id);
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor HTTP disponible en el puerto ${PORT}`);
});