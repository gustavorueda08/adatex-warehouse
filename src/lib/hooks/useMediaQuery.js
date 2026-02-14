import { useState, useEffect } from "react";

/**
 * Hook to detect if a media query matches the current window state.
 * @param {string} query - The media query to match (e.g. "(min-width: 768px)")
 * @returns {boolean} - True if the media query matches, false otherwise.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}
