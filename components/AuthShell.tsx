import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

export async function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="entrar">
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "24px 48px 0" }}>
        <ThemeToggle initial={await getTheme()} />
      </div>
      <main className="entrar-corpo">
        <div className="entrar-caixa">
          <div className="marca">
            <img src="/logo.jpg" alt="" />
            <span className="nome">Imagium Foto</span>
            <span className="selo">PORTAL</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
