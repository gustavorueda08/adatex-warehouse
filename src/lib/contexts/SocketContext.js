// src/providers/SocketProvider.js
"use client";

import { createContext, useContext, useEffect } from "react";
import { useSocket } from "@/lib/hooks/useSocket";
import toast from "react-hot-toast";

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socket = useSocket({
    autoConnect: true,
    onConnect: () => {
      console.log("Conectado a Strapi WebSocket");
    },
    onDisconnect: (reason) => {
      console.log("Desconectado:", reason);
      if (reason === "io server disconnect") {
        toast.error("Desconectado del servidor", { id: "socket-disconnect" });
      }
    },
    onError: (error) => {
      console.error("Error Socket:", error.message);
      if (
        error.message === "No authenticated" ||
        error.message === "Unauthorized"
      ) {
        console.warn("Sin autenticación para socket");
      }
    },
  });

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext debe usarse dentro de SocketProvider");
  }
  return context;
}
