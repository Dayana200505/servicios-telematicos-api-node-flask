export type AlertSeverity = "baja" | "media" | "alta";

export interface AlertMessage {
  id?: number;
  tipo: string;
  gravedad: AlertSeverity;
  zona: "norte" | "centro" | "sur";
  mensaje: string;
  emitida_en: number;
  fecha_hora?: string;
}
