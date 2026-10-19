const { io } = require("socket.io-client");

const SERVER_URL = process.argv[2] || "http://localhost:3001";
const ZONA = process.argv[3] || "norte";
const DURACION_MS = Number(process.argv[4] || 30000);
const ZONAS_VALIDAS = new Set(["norte", "centro", "sur"]);

if (!ZONAS_VALIDAS.has(ZONA)) {
  console.error(`Zona invalida: ${ZONA}. Usa norte, centro o sur.`);
  process.exit(1);
}

const socket = io(SERVER_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  console.log(`[OK] Conectado a ${SERVER_URL} (sid=${socket.id})`);
  socket.emit("suscribir_zona", { zona: ZONA });
});

socket.on("zona_confirmada", (data) => {
  console.log(`[OK] Suscrito a zona: ${data.zona}`);
});

socket.on("error_zona", (data) => {
  console.error(`[ERROR] No se pudo suscribir: ${data.mensaje}`);
});

socket.on("alerta_recibida", (alerta) => {
  console.log("\n[ALERTA RECIBIDA]");
  console.log(`  Tipo: ${alerta.tipo}`);
  console.log(`  Gravedad: ${alerta.gravedad}`);
  console.log(`  Zona: ${alerta.zona}`);
  console.log(`  Mensaje: ${alerta.mensaje}`);
  console.log(`  Fecha/hora: ${alerta.fecha_hora || alerta.emitida_en}`);
});

socket.on("connect_error", (error) => {
  console.error(`[ERROR] Conexion: ${error.message}`);
});

socket.on("disconnect", () => {
  console.log("[OK] Desconectado");
});

const temporizador = setTimeout(() => {
  socket.disconnect();
}, DURACION_MS);

socket.on("disconnect", () => {
  clearTimeout(temporizador);
});
