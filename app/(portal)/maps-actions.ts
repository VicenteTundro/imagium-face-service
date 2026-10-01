"use server";
import { db } from "@/lib/supabase/admin";
import { requireProfile, canCreateEvents } from "@/lib/auth";
import { autocomplete, placeDetails, mapsServerConfigured, type PlaceResult, type Suggestion } from "@/lib/maps";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const PER_MINUTE = 40;
const PER_DAY = 400;

/** Só quem cadastra ou administra eventos usa a busca; cada uso fica registrado e limitado por pessoa. */
async function guard(kind: "autocomplete" | "details"): Promise<string | null> {
  if (!mapsServerConfigured()) return "A busca de endereço ainda não está configurada.";
  const profile = await requireProfile();
  if (!canCreateEvents(profile)) {
    const { count } = await db().from("event_members").select("id", { count: "exact", head: true })
      .eq("user_id", profile.id).eq("role", "admin");
    if (!count) return "Sem permissão para buscar endereços.";
  }
  const now = Date.now();
  const [{ count: lastMinute }, { count: lastDay }] = await Promise.all([
    db().from("map_lookups").select("id", { count: "exact", head: true })
      .eq("user_id", profile.id).gte("created_at", new Date(now - 60_000).toISOString()),
    db().from("map_lookups").select("id", { count: "exact", head: true })
      .eq("user_id", profile.id).gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);
  if ((lastMinute ?? 0) >= PER_MINUTE) return "Muitas buscas seguidas. Espere um minuto.";
  if ((lastDay ?? 0) >= PER_DAY) return "Limite diário de buscas atingido.";
  await db().from("map_lookups").insert({ user_id: profile.id, kind });
  return null;
}

const validToken = (t: string) => /^[0-9a-f-]{36}$/i.test(t);

export async function searchAddress(input: string, sessionToken: string): Promise<Result<Suggestion[]>> {
  const q = String(input ?? "").trim().slice(0, 120);
  if (q.length < 3 || !validToken(sessionToken)) return { ok: true, data: [] };
  const blocked = await guard("autocomplete");
  if (blocked) return { ok: false, error: blocked };
  try {
    return { ok: true, data: await autocomplete(q, sessionToken) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "A busca de endereço falhou. Tente de novo." };
  }
}

export async function getPlace(placeId: string, sessionToken: string): Promise<Result<PlaceResult>> {
  if (!validToken(sessionToken)) return { ok: false, error: "Busca inválida" };
  const blocked = await guard("details");
  if (blocked) return { ok: false, error: blocked };
  try {
    return { ok: true, data: await placeDetails(String(placeId), sessionToken) };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Não foi possível abrir esse endereço. Tente outro resultado." };
  }
}
