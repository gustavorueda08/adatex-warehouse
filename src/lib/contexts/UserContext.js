"use client";

import { createContext, useEffect, useState, useCallback, useRef } from "react";

export const UserContext = createContext();

// Tiempo de caché: 30 minutos
const CACHE_DURATION = 30 * 60 * 1000;
const USER_CACHE_KEY = "user";
const USER_CACHE_TIMESTAMP_KEY = "user_timestamp";

export function UserProvider(props) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { children } = props;
  const isFetchingRef = useRef(false);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_TIMESTAMP_KEY);
      setUser(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }, []);

  const getUser = useCallback(async (forceRefetch = false) => {
    // Prevenir múltiples fetches simultáneos
    if (isFetchingRef.current && !forceRefetch) {
      return;
    }

    try {
      setLoading(true);

      // Verificar caché si no es refetch forzado
      if (!forceRefetch) {
        const cachedUser = localStorage.getItem(USER_CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(USER_CACHE_TIMESTAMP_KEY);

        if (cachedUser && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp, 10);

          // Si el caché es válido (menos de 30 min), usarlo
          if (age < CACHE_DURATION) {
            const userData = JSON.parse(cachedUser);
            setUser(userData);
            setLoading(false);
            return userData;
          }
        }
      }

      // Si no hay caché válido o es refetch forzado, hacer fetch
      isFetchingRef.current = true;
      const response = await fetch("/api/auth/me?populate=seller");

      if (response.ok) {
        const data = await response.json();
        setUser(data);

        // Guardar en caché con timestamp
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(USER_CACHE_TIMESTAMP_KEY, Date.now().toString());

        return data;
      } else {
        // Si falla, limpiar caché
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem(USER_CACHE_TIMESTAMP_KEY);
      }
    } catch (error) {
      console.error("Error al obtener usuario:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    user,
    loading,
    signOut,
    setUser,
    getUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
