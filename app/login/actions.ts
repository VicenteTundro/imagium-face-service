"use server";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type AuthState = { error?: string; ok?: string } | undefined;


export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: "Muitas tentativas. Espere alguns minutos e tente de novo." };
    return { error: "E-mail ou senha incorretos." };
  }
  redirect(safeNext(fd.get("volta")));
}

export async function sendReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Informe o e-mail." };
  const supabase = await createAuthClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.PORTAL_URL}/auth/confirm?next=/nova-senha`,
  });
  // Mesma resposta exista ou não a conta: não revela quem está cadastrado.
  return { ok: "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha." };
}

export async function setNewPassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 10) return { error: "A senha precisa ter pelo menos 10 caracteres." };
  if (password !== confirm) return { error: "As duas senhas não são iguais." };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível salvar a senha. Peça um novo link e tente de novo." };
  redirect("/eventos");
}
