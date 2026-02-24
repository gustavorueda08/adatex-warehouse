"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }) {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
        <ToastProvider />
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
}
