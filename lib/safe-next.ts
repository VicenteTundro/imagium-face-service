/** Só aceita caminho interno do portal (evita redirecionar para outro site). */
export function safeNext(raw: FormDataEntryValue | string | null | undefined, fallback = "/eventos") {
  const v = String(raw ?? "");
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
