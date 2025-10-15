// src/providers/SocketProvider.js
"use client";

import { createContext, useContext } from "react";

export const SocketContext = createContext(null);

/**
 * SocketProvider ligero que NO conecta automáticamente.
 * Ahora solo provee el contexto. La conexión real se hace bajo demanda
 * usando el hook useSocketOptional en componentes específicos.
 */
export function SocketProvider({ children }) {
  // No conectar automáticamente - solo proveer el contexto
  return (
    <SocketContext.Provider value={null}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext debe usarse dentro de SocketProvider");
  }
  return context;
}
