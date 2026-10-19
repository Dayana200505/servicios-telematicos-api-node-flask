import { useState, useEffect } from "react";
import { socketService } from "../services/socket";
import { EVENTS } from "../config/env";

/**
 * Hook para manejar la selección de zona del cliente.
 * - Mantiene el estado de la zona seleccionada.
 * - Al conectarse (o si ya está conectado) envía el evento
 *   `EVENTS.SUBSCRIBE_ZONE` al servidor.
 * - Re‑envía el evento cada vez que la zona cambia.
 */
export function useZoneSelection() {
  const zones = ["norte", "centro", "sur"] as const;
  const [selectedZone, setSelectedZone] = useState<string>(zones[0]);

  // Cuando el socket se conecta o ya está conectado, enviamos la zona.
  useEffect(() => {
    const handler = (connected: boolean) => {
      if (connected) {
        socketService.emit(EVENTS.SUBSCRIBE_ZONE, selectedZone);
        console.log(`[useZoneSelection] Subscribed zone ${selectedZone}`);
      }
    };

    // Suscripción al estado de conexión del socket
    const unsubscribe = socketService.onConnectionChange(handler);

    // Caso en que ya está conectado al montar el hook
    if (socketService.isConnected()) {
      socketService.emit(EVENTS.SUBSCRIBE_ZONE, selectedZone);
    }

    return unsubscribe;
  }, [selectedZone]);

  return { zones, selectedZone, setSelectedZone };
}
