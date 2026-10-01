import { AuthShell } from "@/components/AuthShell";
import { NewPasswordForm } from "@/components/AuthForms";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Criar senha" };

export default async function NewPasswordPage() {
  await requireProfile();
  return (
    <AuthShell>
      <h1>Criar senha</h1>
      <NewPasswordForm />
    </AuthShell>
  );
}
