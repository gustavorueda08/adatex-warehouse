import { useState, useEffect } from "react";

/**
 * Hook to detect the current screen size category.
 * @returns {string} - 'sm', 'md', or 'lg'
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState("sm");

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize("sm");
      } else if (width < 1024) {
        setScreenSize("md");
      } else {
        setScreenSize("lg");
      }
    };

    // Initial check
    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenSize;
}
