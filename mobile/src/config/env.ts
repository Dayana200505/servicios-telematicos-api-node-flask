
/**
 * Configuración de entorno para la app móvil.
 */

// IP de tu PC en la red local (obtenla con: ipconfig)
export const SERVER_HOST = "192.168.100.5";

// Puertos de los dos stacks
export const NODE_PORT = 3001;   // Node.js (Express + Socket.IO)
export const FLASK_PORT = 5000;  // Python Flask (Flask-SocketIO)



// 👇 Descomenta el que quieras usar:


 export const SERVER_PORT = NODE_PORT;  // Node.js
//export const SERVER_PORT = FLASK_PORT;    // Flask

// URL completa del servidor
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// Nombres de eventos Socket.IO (según documento del proyecto)
export const EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  // Selección de zona
  SUBSCRIBE_ZONE: "suscribir_zona",
  ZONE_CONFIRMED: "zona_confirmada",
  ZONE_ERROR: "error_zona",
  // Alertas
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
  ALERT_ERROR: "error_alerta",
} as const;