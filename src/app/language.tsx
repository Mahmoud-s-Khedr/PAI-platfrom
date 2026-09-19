import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Language } from "../lib/types";
import { studentState } from "../storage/student-state";

interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void; }
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(() => studentState.read().language);
  const setLanguage = (next: Language) => { studentState.setLanguage(next); setLanguageState(next); };
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
