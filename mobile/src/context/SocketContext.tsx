import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { socketService } from "../services/socket";
import { EVENTS } from "../config/env";
import type { Zone } from "../types/zones";

interface SocketContextValue {
  isConnected: boolean;
  socketId: string | null;
  currentZone: Zone | null;
  zoneError: string | null;
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

  useEffect(() => {
    const socket = socketService.connect();

    const unsubscribe = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setSocketId(socket.id ?? null);
      if (!connected) {
        // Al desconectar, perdemos la zona asignada
        setCurrentZone(null);
      }
    });

    const onConnect = () => setSocketId(socket.id ?? null);

    const onZoneConfirmed = (data: { zona: Zone }) => {
      console.log("[Context] ✅ Zona confirmada:", data.zona);
      setCurrentZone(data.zona);
      setZoneError(null);
    };

    const onZoneError = (data: { mensaje: string }) => {
      console.warn("[Context] ❌ Error de zona:", data.mensaje);
      setZoneError(data.mensaje);
    };

    socket.on("connect", onConnect);
    socket.on(EVENTS.ZONE_CONFIRMED, onZoneConfirmed);
    socket.on(EVENTS.ZONE_ERROR, onZoneError);

    return () => {
      unsubscribe();
      socket.off("connect", onConnect);
      socket.off(EVENTS.ZONE_CONFIRMED, onZoneConfirmed);
      socket.off(EVENTS.ZONE_ERROR, onZoneError);
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