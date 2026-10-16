// ============================================================
// useSocket.ts
// ============================================================
// Este archivo ahora SOLO re-exporta el hook desde el contexto.
// El estado global del socket (conexión, zona actual, etc.) vive
// en src/context/SocketContext.tsx.
//
// Los componentes que usan `useSocket()` NO necesitan cambiar su
// import, porque este archivo sigue exponiendo el mismo hook.
// ============================================================

export { useSocket } from "../context/SocketContext";