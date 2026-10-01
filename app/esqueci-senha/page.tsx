import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "@/components/AuthForms";

export const metadata = { title: "Esqueci minha senha" };

export default function ResetPage() {
  return (
    <AuthShell>
      <h1>Nova senha</h1>
      <p className="muted" style={{ margin: "-8px 0 0" }}>Enviamos um link para o seu e-mail. Ele vale por uma hora.</p>
      <ResetForm />
    </AuthShell>
  );
}
