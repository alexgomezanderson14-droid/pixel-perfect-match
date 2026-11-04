import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang, T } from "@/content/fiestas";

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (x: T) => string }>({
  lang: "es",
  setLang: () => {},
  t: (x) => x.es,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");
  useEffect(() => {
    const s = localStorage.getItem("lang");
    if (s === "es" || s === "va") setLangState(s);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "va" ? "ca" : "es";
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };
  return <Ctx.Provider value={{ lang, setLang, t: (x) => x[lang] }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
