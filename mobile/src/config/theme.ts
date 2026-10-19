/**
 * Paleta de colores centralizada del proyecto.
 * Cambiar aquí afecta a toda la app.
 */
export const COLORS = {
  // Primarios
  primary: "#1e40af",
  primaryLight: "#dbeafe",
  primaryDark: "#1e3a8a",

  // Estados
  success: "#16a34a",
  successLight: "#dcfce7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  warning: "#f59e0b",
  warningLight: "#fef3c7",

  // Grises
  gray: "#6b7280",
  grayLight: "#9ca3af",
  grayBg: "#f9fafb",
  grayBgStrong: "#f3f4f6",

  // Base
  white: "#ffffff",
  black: "#000000",
  text: "#111827",
  textLight: "#374151",

  // Bordes
  border: "#e5e7eb",
  borderStrong: "#d1d5db",

  // Zonas
  zoneNorte: "#2563eb",
  zoneCentro: "#7c3aed",
  zoneSur: "#0891b2",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
} as const;
