"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Theme } from "@astryxdesign/core";
import { lensTheme } from "@/styles/theme/lens-theme";

type Mode = "dark" | "light";

const STORAGE_KEY = "lens-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

const ModeContext = createContext<{ mode: Mode; toggle: () => void }>({
  mode: "dark",
  toggle: () => undefined
});

function readStoredMode(): Mode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function readSystemMode(): Mode {
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

function storeMode(mode: Mode): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    return true;
  } catch {
    return false;
  }
}

export function useMode() {
  return useContext(ModeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    setMode(readStoredMode() ?? readSystemMode());
    const query = window.matchMedia(LIGHT_QUERY);
    const follow = () => {
      if (readStoredMode() === null) setMode(readSystemMode());
    };
    query.addEventListener("change", follow);
    return () => {
      query.removeEventListener("change", follow);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = current === "dark" ? "light" : "dark";
      storeMode(next);
      return next;
    });
  }, []);

  return (
    <ModeContext.Provider value={{ mode, toggle }}>
      <Theme theme={lensTheme} mode={mode}>
        {children}
      </Theme>
    </ModeContext.Provider>
  );
}
