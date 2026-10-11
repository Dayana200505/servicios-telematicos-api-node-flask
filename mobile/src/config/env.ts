/**
 * Configuración de entorno para la app móvil.
 * Cambia SERVER_HOST por la IP de tu PC cuando cambies de red.
 */
export const SERVER_HOST = "192.168.100.5"; // cambiar ip 
export const SERVER_PORT = 3001;

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