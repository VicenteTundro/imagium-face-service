import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volta?: string; erro?: string }> }) {
  const { volta, erro } = await searchParams;
  return (
    <AuthShell>
      <h1>Entrar</h1>
      <p className="muted" style={{ margin: "-8px 0 0" }}>Acesso para administradores, fotógrafos e organizadores.</p>
      {erro === "link" && <div className="erro" role="alert">O link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.</div>}
      <LoginForm volta={volta} />
    </AuthShell>
  );
}
