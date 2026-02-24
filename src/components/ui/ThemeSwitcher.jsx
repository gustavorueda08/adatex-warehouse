"use client";

import { Switch } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-6"></div>; // Placeholder para evitar salto en cliente

  return (
    <Switch
      defaultSelected={theme === "light"}
      size="sm"
      color="secondary"
      onChange={(e) => setTheme(e.target.checked ? "light" : "dark")}
      startContent={<SunIcon className="w-4 h-4" />}
      endContent={<MoonIcon className="w-4 h-4" />}
    ></Switch>
  );
}
