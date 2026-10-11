import { io, Socket } from "socket.io-client";
import { SERVER_URL, EVENTS } from "../config/env";

type ConnectionListener = (connected: boolean) => void;

/** Logs solo en desarrollo, para no ensuciar la consola en producción. */
const log = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

/**
 * Cliente Socket.IO persistente.
 * - Reconexión automática
 * - Una única instancia durante toda la sesión
 * - Notifica a React solo cuando el estado realmente cambia
 */
class SocketService {
  private socket: Socket | null = null;
  private listeners: Set<ConnectionListener> = new Set();
  private lastNotified: boolean | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Conecta al servidor. Si ya hay una conexión, no hace nada.
   */
  connect(): Socket {
    if (this.socket?.connected) {
      log("[Socket] Ya está conectado:", this.socket.id);
      return this.socket;
    }

    if (!this.socket) {
      log("[Socket] Conectando a", SERVER_URL);
      this.socket = io(SERVER_URL, {
        transports: ["websocket"], // forzar WS, sin fallback a polling
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5, // evita que varios clientes reconecten a la vez
        timeout: 10000,
        autoConnect: true,
      });

      this.registerBaseEvents(this.socket);
    } else {
      this.socket.connect();
    }

    return this.socket;
  }

  /**
   * Eventos base de conexión / desconexión.
   */
  private registerBaseEvents(socket: Socket) {
    socket.on(EVENTS.CONNECT, () => {
      log("[Socket] ✅ Conectado. ID:", socket.id);
      this.notify(true);
    });

    socket.on(EVENTS.DISCONNECT, (reason) => {
      log("[Socket] ❌ Desconectado. Razón:", reason);
      this.notify(false);
    });

    socket.on(EVENTS.CONNECT_ERROR, (err) => {
      log("[Socket] ⚠️ Error de conexión:", err.message);
      this.notify(false);
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      log(`[Socket] 🔄 Intento de reconexión #${attempt}`);
    });

    socket.io.on("reconnect", (attempt) => {
      log(`[Socket] 🎉 Reconectado tras ${attempt} intentos`);
    });
  }

  /**
   * Desconecta manualmente. Tras esto Socket.IO NO reintenta solo;
   * hay que llamar a connect() o reconnect().
   */
  disconnect() {
    this.clearReconnectTimer();
    if (this.socket) {
      log("[Socket] Desconectando manualmente");
      this.socket.disconnect();
    }
  }

  /**
   * Reinicia la conexión: corta y vuelve a conectar tras una pausa corta.
   * Si se llama varias veces seguidas, solo cuenta la última.
   */
  reconnect(delayMs = 500) {
    log("[Socket] Reconectando manualmente...");
    this.disconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  /**
   * Cierra todo y limpia listeners (útil al cerrar sesión o la app).
   */
  dispose() {
    this.disconnect();
    this.socket?.removeAllListeners();
    this.socket?.io.removeAllListeners();
    this.socket = null;
    this.listeners.clear();
    this.lastNotified = null;
  }

  /**
   * Devuelve el socket actual (puede ser null).
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * ¿Está conectado?
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Suscribirse a cambios de estado (para React).
   * Devuelve la función para cancelar la suscripción.
   */
  onConnectionChange(callback: ConnectionListener): () => void {
    this.listeners.add(callback);
    // Notificar estado actual de inmediato
    callback(this.isConnected());
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Escuchar un evento del servidor (ej. EVENTS.ALERT_RECEIVED).
   * Devuelve la función para dejar de escucharlo.
   */
  on<T = unknown>(event: string, handler: (payload: T) => void): () => void {
    const socket = this.socket ?? this.connect();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }

  /**
   * Enviar un evento al servidor (ej. EVENTS.EMIT_ALERT).
   * Devuelve false si no hay conexión, para que la UI pueda avisar.
   */
  emit(event: string, ...args: unknown[]): boolean {
    if (!this.socket?.connected) {
      log(`[Socket] No se pudo emitir "${event}": sin conexión`);
      return false;
    }
    this.socket.emit(event, ...args);
    return true;
  }

  /**
   * Notifica solo si el estado cambió (evita re-renders por cada
   * connect_error durante los reintentos) y aísla errores de listeners.
   */
  private notify(connected: boolean) {
    if (this.lastNotified === connected) return;
    this.lastNotified = connected;

    this.listeners.forEach((cb) => {
      try {
        cb(connected);
      } catch (e) {
        console.warn("[Socket] Error en un listener:", e);
      }
    });
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Exportamos una única instancia (singleton)
export const socketService = new SocketService();