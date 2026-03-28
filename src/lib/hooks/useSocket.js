/**
 * @fileoverview Socket.io client hook with automatic JWT refresh.
 *
 * Fetches a fresh JWT from `/api/auth/token`, opens a Socket.io connection
 * to the Strapi backend, and keeps the token alive by refreshing it whenever
 * the server disconnects or returns an auth error.
 *
 * The hook handles the full lifecycle:
 *  - Initialises the socket on mount and tears it down on unmount.
 *  - Exposes typed event helpers (`on`, `once`, `off`, `emit`).
 *  - Provides order-room helpers (`joinOrder`, `leaveOrder`).
 *
 * @example
 * ```jsx
 * const { isConnected, on, joinOrder, leaveOrder } = useSocket();
 *
 * useEffect(() => {
 *   joinOrder(orderId);
 *   const unsub = on("order:updated", handleUpdate);
 *   return () => { leaveOrder(orderId); unsub?.(); };
 * }, [orderId]);
 * ```
 */
// src/lib/hooks/useSocket.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

/**
 * @typedef {Object} UseSocketOptions
 * @property {boolean} [autoConnect=true] - Connect immediately on hook mount.
 * @property {boolean} [reconnection=true] - Enable Socket.io auto-reconnect.
 * @property {number}  [reconnectionDelay=1000] - Ms between reconnect attempts.
 * @property {number}  [reconnectionAttempts=5] - Max reconnect attempts before giving up.
 * @property {Function} [onConnect] - Called when the socket connects successfully.
 * @property {Function} [onDisconnect] - Called with the disconnect reason string.
 * @property {Function} [onError] - Called with the Error object on connection error.
 */

/**
 * @typedef {Object} UseSocketResult
 * @property {import("socket.io-client").Socket|null} socket - The raw socket instance.
 * @property {boolean} isConnected - Whether the socket is currently connected.
 * @property {boolean} isAuthenticating - True while fetching the initial JWT.
 * @property {Error|null} error - The last connection or auth error, if any.
 * @property {function(string, *): void} emit - Emit an event (no-op if disconnected).
 * @property {function(string, Function): Function|undefined} on - Subscribe to an event. Returns an unsubscribe function.
 * @property {function(string, Function): void} once - Subscribe to an event once.
 * @property {function(string, Function): void} off - Unsubscribe from an event.
 * @property {function(number|string): void} joinOrder - Join `order:<id>` room.
 * @property {function(number|string): void} leaveOrder - Leave `order:<id>` room.
 */

/**
 * Opens an authenticated Socket.io connection to the Strapi backend.
 *
 * @param {UseSocketOptions} [options={}]
 * @returns {UseSocketResult}
 */
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

  // Store callbacks in a ref so event handlers always see the latest version
  // without needing to be recreated (and without triggering effect re-runs).
  const callbacksRef = useRef({ onConnect, onDisconnect, onError });
  useEffect(() => {
    callbacksRef.current = { onConnect, onDisconnect, onError };
  }, [onConnect, onDisconnect, onError]);

  /** Fetches a fresh JWT from the Next.js session endpoint. */
  const getToken = useCallback(async () => {
    const response = await fetch("/api/auth/token", { credentials: "include" });
    if (!response.ok) throw new Error("No authenticated");
    const { token } = await response.json();
    if (!token) throw new Error("No token received");
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

        const socketUrl =
          process.env.NEXT_PUBLIC_STRAPI_URL ||
          process.env.STRAPI_URL ||
          "http://localhost:1337";

        const socket = io(socketUrl, {
          autoConnect,
          reconnection,
          reconnectionDelay,
          reconnectionAttempts,
          auth: { token },
          extraHeaders: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) {
          socket.disconnect();
          return;
        }

        socketRef.current = socket;

        socket.on("connect", () => {
          setIsConnected(true);
          setError(null);
          setIsAuthenticating(false);
          callbacksRef.current.onConnect?.();
        });

        socket.on("disconnect", (reason) => {
          setIsConnected(false);
          callbacksRef.current.onDisconnect?.(reason);

          // Server-initiated disconnects require a new token before reconnecting
          if (reason === "io server disconnect" || reason === "transport close") {
            reconnectTimeout = setTimeout(async () => {
              if (!cancelled && socketRef.current) {
                try {
                  const newToken = await getToken();
                  socket.auth = { token: newToken };
                  socket.io.opts.extraHeaders = { Authorization: `Bearer ${newToken}` };
                  socket.connect();
                } catch (err) {
                  console.error("[useSocket] Token renewal failed:", err);
                  setError(err);
                  callbacksRef.current.onError?.(err);
                }
              }
            }, 1000);
          }
        });

        socket.on("connect_error", async (err) => {
          setIsConnected(false);
          setIsAuthenticating(false);

          // Auth errors: try refreshing the token before the next reconnect attempt
          const isAuthError =
            err.message.includes("auth") ||
            err.message.includes("token") ||
            err.message.includes("jwt") ||
            err.message === "Unauthorized";

          if (isAuthError) {
            try {
              const newToken = await getToken();
              if (!cancelled && socketRef.current) {
                socket.auth = { token: newToken };
                socket.io.opts.extraHeaders = { Authorization: `Bearer ${newToken}` };
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

        socket.on("error", (err) => {
          console.error("[useSocket] Server error:", err);
          setError(err);
          callbacksRef.current.onError?.(err);
        });
      } catch (err) {
        if (!cancelled) {
          console.error("[useSocket] Initialization error:", err.message);
          setError(err);
          setIsAuthenticating(false);
          callbacksRef.current.onError?.(err);
        }
      }
    }

    initializeSocket();

    return () => {
      cancelled = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.removeAllListeners();
        socketRef.current = null;
      }
    };
  }, [autoConnect, reconnection, reconnectionDelay, reconnectionAttempts, getToken]);

  /** Emit an event. Silent no-op if the socket is not connected. */
  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[useSocket] Cannot emit "${event}" — not connected`);
    }
  }, []);

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => socketRef.current?.off(event, callback);
    }
  }, []);

  /** Subscribe to a socket event exactly once. */
  const once = useCallback((event, callback) => {
    socketRef.current?.once(event, callback);
  }, []);

  /** Unsubscribe a specific callback from a socket event. */
  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  /** Join the `order:<id>` room to receive real-time order updates. */
  const joinOrder = useCallback((orderId) => emit("join:order", orderId), [emit]);

  /** Leave the `order:<id>` room. */
  const leaveOrder = useCallback((orderId) => emit("leave:order", orderId), [emit]);

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
