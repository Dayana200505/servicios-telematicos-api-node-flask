/**
 * Configuración de entorno para la app móvil.
 * Cambia SERVER_HOST por la IP de tu PC cuando cambies de red.
 */

export const SERVER_HOST = "192.168.100.5"; // ← cambiar si tu IP cambia

// ============================================================
// Puertos de los dos stacks del proyecto
// ============================================================
// Este proyecto contempla DOS stacks de servidor:
//   - Node.js (Express + Socket.IO)  → puerto 3001
//   - Python Flask (Flask-SocketIO)  → puerto 5000
//
// Descomenta el que quieras usar:

// export const SERVER_PORT = 3001; // Node.js
export const SERVER_PORT = 5000; // Flask

// URL completa del servidor
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// ============================================================
// Nombres de eventos Socket.IO (según documento del proyecto)
// ============================================================
export const EVENTS = {
  // Conexión
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  // Selección de zona (ID 5)
  SUBSCRIBE_ZONE: "suscribir_zona",
  ZONE_CONFIRMED: "zona_confirmada",
  ZONE_ERROR: "error_zona",

  // Alertas (IDs 6-10)
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
  ALERT_ERROR: "error_alerta",
} as const;