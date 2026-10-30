import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { PANEL_URL, STACK_PORTS } from "../config/env";
import type {
  LoadProgress,
  LoadTestConfig,
  LoadTestOutcome,
  LoadTestResult,
} from "../types/superuser";

/**
 * Se conecta al servicio de pruebas de carga (carpeta /superusuario, puerto 4000).
 * Ese servicio crea los N usuarios virtuales, emite la alerta y cuenta
 * cuantos usuarios la recibieron y cuantos no.
 */
export function useLoadTest() {
  const [panelConnected, setPanelConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [outcome, setOutcome] = useState<LoadTestOutcome | null>(null);
  const [history, setHistory] = useState<LoadTestResult[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(PANEL_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
      timeout: 6000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setPanelConnected(true));
    socket.on("disconnect", () => {
      setPanelConnected(false);
      setRunning(false);
    });
    socket.on("connect_error", () => setPanelConnected(false));

    socket.on("prueba:progreso", (p: LoadProgress) => setProgress(p));
    socket.on("prueba:resultado", (r: LoadTestOutcome) => {
      setRunning(false);
      setProgress(null);
      setOutcome(r);
      if (r.ok) setHistory((h) => [r, ...h].slice(0, 10));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const start = useCallback((cfg: LoadTestConfig) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      setOutcome({
        ok: false,
        error:
          "No hay conexión con el servicio de pruebas. Ejecuta `npm start` en la carpeta superusuario.",
      });
      return;
    }
    setRunning(true);
    setOutcome(null);
    setProgress({
      fase: "conectando",
      hechos: 0,
      total: cfg.usuarios,
      texto: "Preparando prueba…",
    });

    // El servicio corre en la PC, asi que usa la misma IP de la PC para llegar a los servidores.
    const host = PANEL_URL.replace(/:\d+$/, "");
    const port = STACK_PORTS[cfg.stack];

    socket.emit(
      "prueba:iniciar",
      {
        url: `${host}:${port}`,
        stack: cfg.stack,
        usuarios: cfg.usuarios,
        distribucion: cfg.distribucion,
        alerta: cfg.alerta,
      },
      (ack?: { ok: boolean; error?: string }) => {
        if (!ack || !ack.ok) {
          setRunning(false);
          setProgress(null);
          setOutcome({
            ok: false,
            error: ack?.error ?? "No se pudo iniciar la prueba.",
          });
        }
      }
    );
  }, []);

  return { panelConnected, running, progress, outcome, history, start };
}