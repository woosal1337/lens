"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { createTranslator, isLanguage, type Language, type Translator } from "@/lib/i18n/translate";

const STORAGE_KEY = "lens-language";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translator;
} | null>(null);

function readLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>("en");

  useEffect(() => {
    updateLanguage(readLanguage());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) updateLanguage(readLanguage());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      updateLanguage(next);
    }
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: createTranslator(language) }),
    [language, setLanguage]
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === null) throw new Error("Language provider is missing.");
  return context;
}

export function useTranslation() {
  return useLanguage().t;
}
