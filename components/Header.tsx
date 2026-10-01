import Link from "next/link";
import type { Profile } from "@/lib/types";
import { canCreateEvents } from "@/lib/auth";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";
import { Nav } from "./Nav";
import { Lupa, Mais } from "./icons";

export async function Header({ profile }: { profile: Profile }) {
  const nome = profile.full_name || profile.email;
  const iniciais = nome.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
  return (
    <header className="topo">
      <Link href="/eventos" className="marca" aria-label="Imagium Foto — início do portal">
        <img src="/logo.jpg" alt="" />
        <span className="nome">Imagium Foto</span>
        <span className="selo">PORTAL</span>
      </Link>
      <Nav />
      <div className="topo-dir">
        <ThemeToggle initial={await getTheme()} />
        <form action="/eventos" role="search" className="busca">
          <label htmlFor="busca-eventos" className="sr">Buscar evento</label>
          <Lupa />
          <input id="busca-eventos" name="q" type="search" placeholder="Buscar por nome, cidade ou ID" />
        </form>
        {canCreateEvents(profile) && (
          <Link className="btn-primario" href="/eventos/novo"><Mais />Novo evento</Link>
        )}
        <details className="conta">
          <summary aria-label="Sua conta">{iniciais}</summary>
          <div className="conta-menu">
            <div>
              <div style={{ fontWeight: 600 }}>{profile.full_name || "Sem nome"}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{profile.email}</div>
            </div>
            <form action="/sair" method="post">
              <button className="btn-sec" style={{ width: "100%" }}>Sair</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
