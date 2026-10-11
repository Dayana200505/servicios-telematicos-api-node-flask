/**
 * Configuración de entorno para la app móvil.
 * Cambia SERVER_HOST por la IP de tu PC cuando cambies de red.
 */
export const SERVER_HOST = "192.168.100.5"; // cambiar ip 


// Puerto del servidor
// ============================================================
// Este proyecto tiene dos stacks de servidor:
//   - Node.js (Express + Socket.IO)  → puerto 3001
//   - Python Flask (Flask-SocketIO)  → puerto 5000
//
// Descomenta el que quieras usar:


// export const SERVER_PORT = 3001; Node.js 
export const SERVER_PORT = 5000; // Flask

export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Nombres de eventos Socket.IO (según documento del proyecto)
export const EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  // Estos se usarán en tareas futuras (IDs 4 y 5)
  SUBSCRIBE_ZONE: "suscribir_zona",
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
} as const;