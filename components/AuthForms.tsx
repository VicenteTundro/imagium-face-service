"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signIn, sendReset, setNewPassword, type AuthState } from "@/app/login/actions";

function Msg({ state }: { state: AuthState }) {
  if (state?.error) return <div className="erro" role="alert">{state.error}</div>;
  if (state?.ok) return <div className="aviso" role="status">{state.ok}</div>;
  return null;
}

export function LoginForm({ volta }: { volta?: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="volta" value={volta ?? ""} />
      <div className="campo-bloco">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="campo" placeholder="voce@email.com" autoComplete="email" required />
      </div>
      <div className="campo-bloco">
        <label htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="campo" autoComplete="current-password" required />
      </div>
      <Msg state={state} />
      <button className="btn-primario" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      <Link href="/esqueci-senha" className="btn-texto" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center" }}>Esqueci minha senha</Link>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(sendReset, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="campo-bloco">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="campo" placeholder="voce@email.com" autoComplete="email" required />
      </div>
      <Msg state={state} />
      <button className="btn-primario" disabled={pending}>{pending ? "Enviando…" : "Enviar link"}</button>
      <Link href="/login" className="btn-texto" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center" }}>Voltar para entrar</Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="campo-bloco">
        <label htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" className="campo" autoComplete="new-password" minLength={10} required />
        <span className="ajuda">Pelo menos 10 caracteres.</span>
      </div>
      <div className="campo-bloco">
        <label htmlFor="confirm">Repita a nova senha</label>
        <input id="confirm" name="confirm" type="password" className="campo" autoComplete="new-password" minLength={10} required />
      </div>
      <Msg state={state} />
      <button className="btn-primario" disabled={pending}>{pending ? "Salvando…" : "Salvar senha"}</button>
    </form>
  );
}
