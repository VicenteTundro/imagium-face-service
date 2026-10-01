"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireProfile, canCreateEvents, requireManagedEvent } from "@/lib/auth";
import { listCategories } from "@/lib/events";
import { parseEventForm, type FormState } from "@/lib/event-input";
import { checkImage, storeImage, r2Configured, type CheckedImage, type ImageSlot } from "@/lib/r2";
import { STATUSES, type Status } from "@/lib/types";
import { mapsServerConfigured } from "@/lib/maps";
import { getDefaultPlatformPct } from "@/lib/events";

const SLOTS: ImageSlot[] = ["icon", "cover", "watermark"];

async function readImages(fd: FormData, errors: Record<string, string>): Promise<CheckedImage[]> {
  const out: CheckedImage[] = [];
  for (const slot of SLOTS) {
    const f = fd.get(slot);
    if (!(f instanceof File) || f.size === 0) continue;
    if (!r2Configured()) { errors[slot] = "O envio de imagens ainda não está configurado no servidor"; continue; }
    try { out.push(await checkImage(slot, f)); } catch (e) { errors[slot] = (e as Error).message; }
  }
  return out;
}

/** Envia as imagens e grava as chaves. Devolve false se alguma falhar (o evento já está salvo). */
async function saveImages(eventId: string, images: CheckedImage[]): Promise<boolean> {
  if (images.length === 0) return true;
  const updates: Record<string, string> = {};
  let ok = true;
  for (const img of images) {
    try {
      const { column, key } = await storeImage(eventId, img);
      updates[column] = key;
    } catch (e) {
      console.error("Falha ao enviar imagem", img.slot, e);
      ok = false;
    }
  }
  if (Object.keys(updates).length) {
    const { error } = await db().from("events").update(updates).eq("id", eventId);
    if (error) { console.error(error); ok = false; }
  }
  return ok;
}

export async function createEvent(_: FormState, fd: FormData): Promise<FormState> {
  const profile = await requireProfile();
  if (!canCreateEvents(profile)) return { error: "Sua conta não tem permissão para cadastrar eventos." };

  const categories = (await listCategories()).map((c) => c.code);
  const { payload, errors } = parseEventForm(fd, { requireCategory: true, categories, requireLocation: mapsServerConfigured() });
  // A comissão da plataforma só é definida pelo administrador da plataforma.
  if (!profile.is_platform_admin) payload.platform_pct = await getDefaultPlatformPct();
  if (payload.organizer_pct + payload.admin_pct + payload.platform_pct > 100) errors.split = "A soma das porcentagens passa de 100%";
  const images = await readImages(fd, errors);
  if (Object.keys(errors).length) return { error: "Confira os campos marcados.", fieldErrors: errors };

  const { data, error } = await db().rpc("portal_create_event", { p: payload, p_user: profile.id });
  if (error || !data) {
    console.error("portal_create_event", error);
    return { error: "Não foi possível criar o evento. Nada foi salvo; tente de novo." };
  }
  const { id, short_id } = data as { id: string; short_id: string };
  const imagesOk = await saveImages(id, images);

  revalidatePath("/eventos");
  redirect(`/e/${short_id}?${imagesOk ? "criado=1" : "aviso=imagens"}`);
}

export async function updateEvent(shortId: string, _: FormState, fd: FormData): Promise<FormState> {
  const { event, profile } = await requireManagedEvent(shortId);
  const { payload, errors } = parseEventForm(fd, { requireCategory: false, categories: [], requireLocation: mapsServerConfigured() });
  if (!profile.is_platform_admin) {
    const { data: current } = await db().from("event_private").select("platform_pct").eq("event_id", event.id).single();
    payload.platform_pct = Number(current?.platform_pct ?? (await getDefaultPlatformPct()));
  }
  if (payload.organizer_pct + payload.admin_pct + payload.platform_pct > 100) errors.split = "A soma das porcentagens passa de 100%";
  const images = await readImages(fd, errors);
  if (Object.keys(errors).length) return { error: "Confira os campos marcados.", fieldErrors: errors };

  const { error } = await db().rpc("portal_update_event", { p_event: event.id, p: payload, p_user: profile.id });
  if (error) {
    if (error.message.includes("divisão não pode mudar")) {
      return { error: "Confira os campos marcados.", fieldErrors: { split: "A divisão não pode mudar: o evento já tem vendas aprovadas." } };
    }
    console.error("portal_update_event", error);
    return { error: "Não foi possível salvar. Nada foi alterado; tente de novo." };
  }
  const imagesOk = await saveImages(event.id, images);

  revalidatePath("/eventos");
  revalidatePath(`/e/${event.short_id}`);
  redirect(`/e/${event.short_id}?${imagesOk ? "salvo=1" : "aviso=imagens"}`);
}

export async function setStatus(shortId: string, fd: FormData) {
  const { event } = await requireManagedEvent(shortId);
  const status = String(fd.get("status") ?? "") as Status;
  if (!STATUSES.includes(status)) redirect(`/e/${event.short_id}`);
  const { error } = await db().from("events").update({ status }).eq("id", event.id);
  if (error) console.error("setStatus", error);
  revalidatePath("/eventos");
  revalidatePath(`/e/${event.short_id}`);
  redirect(`/e/${event.short_id}?${error ? "aviso=erro" : "situacao=1"}`);
}

export async function removePhotographer(shortId: string, memberId: string) {
  const { event } = await requireManagedEvent(shortId);
  const { count } = await db()
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("photographer_member_id", memberId);
  if ((count ?? 0) > 0) redirect(`/e/${event.short_id}/editar?aviso=fotos`);
  await db().from("event_members").delete().eq("id", memberId).eq("event_id", event.id).eq("role", "photographer");
  revalidatePath(`/e/${event.short_id}`);
  redirect(`/e/${event.short_id}/editar?removido=1`);
}
