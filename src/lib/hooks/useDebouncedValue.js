// src/lib/hooks/useDebouncedValue.js
import { useState, useEffect } from "react";

/**
 * Hook para debouncer un valor con un delay específico
 * @param {any} value - Valor a debouncer
 * @param {number} delay - Delay en milisegundos (default: 300)
 * @returns {any} Valor debounced
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Si el valor es igual al ya debounced, no hacer nada
    if (value === debouncedValue) return;

    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay, debouncedValue]);

  return debouncedValue;
}
