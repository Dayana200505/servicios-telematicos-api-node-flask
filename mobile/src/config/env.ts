// ============================================================
// Configuración de Entorno para la App Móvil
// ============================================================

/**
 * IP de tu PC en la red local (obtenla con: ipconfig).
 * Si tu IP cambia, debes actualizarla aquí.
 */
export const SERVER_HOST = "192.168.100.5"; 

// ============================================================
// Puertos de los dos Stacks del proyecto
// ============================================================
//   - Node.js (Express + Socket.IO)  → puerto 3001
//   - Python Flask (Flask-SocketIO)  → puerto 5000
//
// Descomenta el que quieras usar por defecto para la app del usuario final:

export const SERVER_PORT = 3001; // Node.js
// export const SERVER_PORT = 5000; // Flask

// URL completa del servidor (para el usuario final)
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// ============================================================
// Nombres de Eventos Socket.IO (Según documento del proyecto)
// ============================================================
export const EVENTS = {
  // Conexión
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",

  // Selección de zona (Sprint 2)
  SUBSCRIBE_ZONE: "suscribir_zona",
  ZONE_CONFIRMED: "zona_confirmada",
  ZONE_ERROR: "error_zona",

  // Alertas (Sprint 2 y 3)
  EMIT_ALERT: "emitir_alerta",
  ALERT_RECEIVED: "alerta_recibida",
  ALERT_ERROR: "error_alerta",
} as const;


// ============================================================
// Panel de superusuario (Sprint 4)
// ============================================================

export type Stack = "node" | "flask";

// Puertos de cada servidor para que el superusuario pueda elegir a cuál emitir.
export const STACK_PORTS: Record<Stack, number> = {
  node: 3001,
  flask: 5000,
};

// Servicio de pruebas de carga (Carpeta /superusuario, ejecutar con `npm start`).
export const PANEL_PORT = 4000;
export const PANEL_URL = `http://${SERVER_HOST}:${PANEL_PORT}`;