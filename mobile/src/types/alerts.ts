export type AlertSeverity = "baja" | "media" | "alta";

export interface AlertMessage {
  tipo: string;
  gravedad: AlertSeverity;
  zona: "norte" | "centro" | "sur";
  mensaje: string;
  emitida_en: number;
  fecha_hora?: string;
}
