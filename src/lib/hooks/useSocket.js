// src/lib/hooks/useSocket.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useSocket(options = {}) {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function initializeSocket() {
      try {
        setIsAuthenticating(true);

        // Obtener token de la cookie vía API
        const response = await fetch("/api/auth/token", {
          credentials: "include", // Importante para enviar cookies
        });

        if (!response.ok) {
          throw new Error("No authenticated");
        }

        const { token } = await response.json();

        if (cancelled) return;

        if (!token) {
          throw new Error("No token received");
        }

        const socketUrl =
          process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";

        // Crear conexión con token
        const socket = io(socketUrl, {
          autoConnect,
          reconnection,
          reconnectionDelay,
          reconnectionAttempts,
          auth: {
            token,
          },
          extraHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) {
          socket.disconnect();
          return;
        }

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Socket conectado:", socket.id);
          setIsConnected(true);
          setError(null);
          setIsAuthenticating(false);
          onConnect?.();
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket desconectado:", reason);
          setIsConnected(false);
          onDisconnect?.(reason);
        });

        socket.on("connect_error", (err) => {
          console.error("Error de conexión:", err.message);
          setError(err);
          setIsConnected(false);
          setIsAuthenticating(false);
          onError?.(err);
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Error al obtener token:", err.message);
          setError(err);
          setIsAuthenticating(false);
          onError?.(err);
        }
      }
    }

    initializeSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
      }
    };
  }, [autoConnect, reconnection, reconnectionDelay, reconnectionAttempts]);

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("Socket no conectado. No se puede emitir:", event);
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
  }, []);

  const once = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.once(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const joinOrder = useCallback(
    (orderId) => {
      emit("join:order", orderId);
    },
    [emit]
  );

  const leaveOrder = useCallback(
    (orderId) => {
      emit("leave:order", orderId);
    },
    [emit]
  );

  return {
    socket: socketRef.current,
    isConnected,
    isAuthenticating,
    error,
    emit,
    on,
    once,
    off,
    joinOrder,
    leaveOrder,
  };
}
