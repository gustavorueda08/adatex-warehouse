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
  const callbacksRef = useRef({ onConnect, onDisconnect, onError });

  // Mantener callbacks actualizados sin causar re-renders
  useEffect(() => {
    callbacksRef.current = { onConnect, onDisconnect, onError };
  }, [onConnect, onDisconnect, onError]);

  // Función para obtener token fresco
  const getToken = useCallback(async () => {
    const response = await fetch("/api/auth/token", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("No authenticated");
    }

    const { token } = await response.json();

    if (!token) {
      throw new Error("No token received");
    }

    return token;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let reconnectTimeout = null;

    async function initializeSocket() {
      try {
        setIsAuthenticating(true);

        const token = await getToken();

        if (cancelled) return;

        if (cancelled) return;

        const socketUrl =
          process.env.NEXT_PUBLIC_STRAPI_URL ||
          process.env.STRAPI_URL ||
          "http://localhost:1337";

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
          callbacksRef.current.onConnect?.();
        });

        socket.on("disconnect", (reason) => {
          console.log("Socket desconectado:", reason);
          setIsConnected(false);
          callbacksRef.current.onDisconnect?.(reason);

          // Si la desconexión es por el servidor, intentar reconectar con token fresco
          if (
            reason === "io server disconnect" ||
            reason === "transport close"
          ) {
            reconnectTimeout = setTimeout(async () => {
              if (!cancelled && socketRef.current) {
                try {
                  const newToken = await getToken();
                  socket.auth = { token: newToken };
                  socket.io.opts.extraHeaders = {
                    Authorization: `Bearer ${newToken}`,
                  };
                  socket.connect();
                } catch (err) {
                  console.error("Error al renovar token:", err);
                  setError(err);
                  callbacksRef.current.onError?.(err);
                }
              }
            }, 1000);
          }
        });

        socket.on("connect_error", async (err) => {
          console.error("Error de conexión:", err.message);
          setIsConnected(false);
          setIsAuthenticating(false);

          // Si es error de autenticación, intentar renovar token
          if (
            err.message.includes("auth") ||
            err.message.includes("token") ||
            err.message.includes("jwt")
          ) {
            try {
              const newToken = await getToken();
              if (!cancelled && socketRef.current) {
                socket.auth = { token: newToken };
                socket.io.opts.extraHeaders = {
                  Authorization: `Bearer ${newToken}`,
                };
              }
            } catch (tokenErr) {
              setError(tokenErr);
              callbacksRef.current.onError?.(tokenErr);
              return;
            }
          }

          setError(err);
          callbacksRef.current.onError?.(err);
        });

        // Manejar errores de autenticación del servidor
        socket.on("error", (err) => {
          console.error("Socket error:", err);
          setError(err);
          callbacksRef.current.onError?.(err);
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Error al inicializar socket:", err.message);
          setError(err);
          setIsAuthenticating(false);
          callbacksRef.current.onError?.(err);
        }
      }
    }

    initializeSocket();

    return () => {
      cancelled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
        socketRef.current = null;
      }
    };
  }, [
    autoConnect,
    reconnection,
    reconnectionDelay,
    reconnectionAttempts,
    getToken,
  ]);

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
