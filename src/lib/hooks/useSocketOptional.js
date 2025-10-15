// src/lib/hooks/useSocketOptional.js
"use client";

import { useContext } from "react";
import { SocketContext } from "@/lib/contexts/SocketContext";

/**
 * Hook opcional para usar el socket solo cuando sea necesario.
 * A diferencia de useSocketContext, este no lanza error si no hay socket disponible.
 *
 * @returns {Object|null} El objeto socket o null si no está disponible
 */
export function useSocketOptional() {
  const context = useContext(SocketContext);
  return context;
}
