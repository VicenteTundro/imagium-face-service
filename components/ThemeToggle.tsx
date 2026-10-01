"use client";
import { useEffect, useState } from "react";
import { Sol, Lua } from "./icons";

export function ThemeToggle({ initial }: { initial: "claro" | "escuro" }) {
  const [tema, setTema] = useState(initial);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("tema-claro", tema === "claro");
    root.classList.toggle("tema-escuro", tema === "escuro");
    document.cookie = `tema=${tema}; path=/; max-age=31536000; samesite=lax`;
  }, [tema]);
  return (
    <div className="tema" role="group" aria-label="Tema da tela">
      <button type="button" className="seg-btn" aria-label="Tema claro" title="Tema claro" aria-pressed={tema === "claro"} onClick={() => setTema("claro")}><Sol /></button>
      <button type="button" className="seg-btn" aria-label="Tema escuro" title="Tema escuro" aria-pressed={tema === "escuro"} onClick={() => setTema("escuro")}><Lua /></button>
    </div>
  );
}
