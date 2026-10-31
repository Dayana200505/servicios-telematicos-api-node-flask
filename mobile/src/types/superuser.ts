import type { Stack } from "../config/env";
import type { AlertSeverity } from "./alerts";
import type { Zone } from "./zones";

/** Borrador de alerta que escribe el superusuario en el formulario. */
export interface AlertDraft {
  tipo: string;
  gravedad: AlertSeverity;
  zona: Zone;
  mensaje: string;
}

export type EmitResult = { ok: true } | { ok: false; error: string };

export type Distribution = "destino" | "repartido";

export interface LoadTestConfig {
  stack: Stack;
  usuarios: number;
  distribucion: Distribution;
  alerta: AlertDraft;
}

export interface LoadProgress {
  fase: "conectando" | "emitiendo" | "esperando";
  hechos: number;
  total: number;
  texto: string;
}

export interface ZoneBreakdown {
  zona: Zone;
  simulados: number;
  conectados: number;
  recibieron: number;
  destino: boolean;
}

export interface LoadTestResult {
  ok: true;
  id: number;
  fecha: string;
  stack: Stack;
  usuarios: number;
  distribucion: Distribution;
  zona: Zone;
  suscritos: number;
  fallidos: number;
  objetivo: number;
  recibieron: number;
  no_recibieron: number;
  sin_conexion: number;
  sin_recepcion: number;
  fuera_de_zona: number;
  entrega_pct: number;
  latencia: {
    min: number | null;
    prom: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
  };
  ms_total: number;
  por_zona: ZoneBreakdown[];
}

export type LoadTestOutcome = LoadTestResult | { ok: false; error: string };