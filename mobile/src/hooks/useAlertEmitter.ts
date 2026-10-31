import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { EVENTS, SERVER_HOST, STACK_PORTS } from "../config/env";
import type { Stack } from "../config/env";
import type { AlertDraft, EmitResult } from "../types/superuser";

export function useAlertEmitter(stack: Stack) {
  const [conn, setConn] = useState<{ stack: Stack; ok: boolean }>({ stack, ok: false });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`http://${SERVER_HOST}:${STACK_PORTS[stack]}`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 8000,
    });
    socketRef.current = socket;

    socket.on(EVENTS.CONNECT, () => setConn({ stack, ok: true }));
    socket.on(EVENTS.DISCONNECT, () => setConn({ stack, ok: false }));
    socket.on(EVENTS.CONNECT_ERROR, () => setConn({ stack, ok: false }));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [stack]);

  const connected = conn.stack === stack && conn.ok;

  const emitAlert = useCallback((alerta: AlertDraft): Promise<EmitResult> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        resolve({ ok: false, error: "Sin conexión con el servidor." });
        return;
      }
      socket.timeout(8000).emit(EVENTS.EMIT_ALERT, alerta, (err: Error | null, res?: { ok: boolean; error?: string }) => {
        if (err) resolve({ ok: false, error: "El servidor no respondió a tiempo (timeout)." });
        else if (res && res.ok) resolve({ ok: true });
        else resolve({ ok: false, error: res?.error ?? "El servidor rechazó la alerta." });
      });
    });
  }, []);

  // FUNCIÓN DE CONSULTA BLINDADA
  const fetchHistory = useCallback(async () => {
    try {
      const url = `http://${SERVER_HOST}:${STACK_PORTS[stack]}/alertas`;
      console.log("Consultando historial en:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Error HTTP:", response.status);
        return [];
      }

      const text = await response.text();
      
      // Verificamos si el servidor devolvió un HTML (página de error) en lugar de JSON
      if (text.trim().startsWith("<")) {
        console.error("El servidor devolvió HTML en lugar de JSON. Revisa la ruta /alertas.");
        return [];
      }

      const data = JSON.parse(text);
      if (data.status === "ok" && Array.isArray(data.alertas)) {
        console.log(`Historial obtenido: ${data.alertas.length} alertas.`);
        return data.alertas;
      }
      return [];
    } catch (error) {
      console.error("Error al obtener historial (catch):", error);
      return [];
    }
  }, [stack]);

  return { connected, emitAlert, fetchHistory };
}