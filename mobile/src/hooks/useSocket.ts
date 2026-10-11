import { useEffect, useState } from "react";
import { socketService } from "../services/socket";

/**
 * Hook para usar el socket desde cualquier componente.
 * Devuelve el estado de conexión y funciones útiles.
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState<boolean>(
    socketService.isConnected()
  );
  const [socketId, setSocketId] = useState<string | null>(
    socketService.getSocket()?.id ?? null
  );

  useEffect(() => {
    // Conectar al montar
    const socket = socketService.connect();

    // Suscribirse a cambios de conexión
    const unsubscribe = socketService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setSocketId(socket.id ?? null);
    });

    // Actualizar el ID cuando cambie
    const onConnect = () => setSocketId(socket.id ?? null);
    socket.on("connect", onConnect);

    return () => {
      unsubscribe();
      socket.off("connect", onConnect);
      // ⚠️ NO desconectamos aquí porque queremos conexión persistente
      // durante toda la sesión. Solo desconectaríamos al cerrar la app.
    };
  }, []);

  const reconnect = () => {
    console.log("[useSocket] Reconectando manualmente...");
    socketService.disconnect();
    setTimeout(() => socketService.connect(), 500);
  };

  return {
    socket: socketService.getSocket(),
    isConnected,
    socketId,
    reconnect,
  };
}