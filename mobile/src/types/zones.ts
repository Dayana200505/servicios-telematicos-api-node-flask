/**
 * Tipos y constantes de zonas lógicas del sistema.
 * Según el documento del proyecto: norte, centro, sur.
 *
 * IMPORTANTE: las zonas son LÓGICAS, no geográficas.
 * No se usan coordenadas GPS ni mapas digitales.
 */

export type Zone = "norte" | "centro" | "sur";

export interface ZoneInfo {
  id: Zone;
  nombre: string;
  descripcion: string;
  color: string;
}

export const ZONES: ZoneInfo[] = [
  {
    id: "norte",
    nombre: "Norte",
    descripcion: "Zona norte de la ciudad",
    color: "#2563eb",
  },
  {
    id: "centro",
    nombre: "Centro",
    descripcion: "Zona céntrica de la ciudad",
    color: "#7c3aed",
  },
  {
    id: "sur",
    nombre: "Sur",
    descripcion: "Zona sur de la ciudad",
    color: "#0891b2",
  },
];