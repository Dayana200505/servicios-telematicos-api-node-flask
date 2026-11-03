import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Vibration, Platform } from "react-native"; // <-- Solo Vibration
import { socketService } from "../services/socket";
import { EVENTS } from "../config/env";
import type { Zone } from "../types/zones";
import type { AlertMessage } from "../types/alerts";

interface SocketContextValue {
  isConnected: boolean;
  socketId: string | null;
  currentZone: Zone | null;
  zoneError: string | null;
  alerts: AlertMessage[];
  reconnect: () => void;
  subscribeToZone: (zone: Zone) => boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean>(
    socketService.isConnected()
  );
  const [socketId, setSocketId] = useState<string | null>(
    socketService.getSocket()?.id ?? null
  );
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  useEffect(() => {
    const socket = socketService.connect();

    const unsubscribe = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setSocketId(socket.id ?? null);
      // La zona se conserva mientras Socket.IO reintenta. El servicio vuelve a
      // suscribirla al conectar y solicita las alertas posteriores al último id.
    });

    const onConnect = () => setSocketId(socket.id ?? null);

    const onZoneConfirmed = (data: { zona: Zone }) => {
      console.log("[Context] Zona confirmada:", data.zona);
      setCurrentZone(data.zona);
      setZoneError(null);
    };

    const onZoneError = (data: { mensaje: string }) => {
      console.warn("[Context] Error de zona:", data.mensaje);
      setZoneError(data.mensaje);
    };

    const onAlertReceived = (data: AlertMessage) => {
      if (
        !data ||
        typeof data.tipo !== "string" ||
        typeof data.gravedad !== "string" ||
        typeof data.zona !== "string" ||
        typeof data.mensaje !== "string"
      ) {
        console.warn("[Context] Alerta recibida con formato invalido", data);
        return;
      }

      // --- VIBRACIÓN FUERTE DE TODO EL CELULAR ---
      // Patrón: 0ms espera, 500ms vibra, 200ms pausa, 500ms vibra (1 segundo en total)
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 500, 200, 500]);
      } else {
        Vibration.vibrate(1000); 
      }
      // -------------------------------------------

      setAlerts((current) => {
        const nueva = { ...data, emitida_en: data.emitida_en ?? Date.now() };
        if (typeof data.id === "number" && current.some((alerta) => alerta.id === data.id)) {
          return current;
        }
        return [nueva, ...current].slice(0, 50);
      });
    };

    socket.on("connect", onConnect);
    socket.on(EVENTS.ZONE_CONFIRMED, onZoneConfirmed);
    socket.on(EVENTS.ZONE_ERROR, onZoneError);
    socket.on(EVENTS.ALERT_RECEIVED, onAlertReceived);

    return () => {
      unsubscribe();
      socket.off("connect", onConnect);
      socket.off(EVENTS.ZONE_CONFIRMED, onZoneConfirmed);
      socket.off(EVENTS.ZONE_ERROR, onZoneError);
      socket.off(EVENTS.ALERT_RECEIVED, onAlertReceived);
    };
  }, []);

  const reconnect = useCallback(() => {
    console.log("[Context] Reconectando manualmente...");
    socketService.disconnect();
    setTimeout(() => socketService.connect(), 500);
  }, []);

  const subscribeToZone = useCallback((zone: Zone): boolean => {
    setZoneError(null);
    return socketService.subscribeToZone(zone);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        socketId,
        currentZone,
        zoneError,
        alerts,
        reconnect,
        subscribeToZone,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook para consumir el contexto desde cualquier componente.
 */
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket debe usarse dentro de <SocketProvider>");
  }
  return ctx;
}
