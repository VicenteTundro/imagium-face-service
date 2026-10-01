import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createAuthClient } from "./supabase/server";
import { db } from "./supabase/admin";
import type { Profile, Role } from "./types";

/** Perfil de quem está logado (validado no servidor do Supabase a cada pedido). */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await db()
    .from("profiles")
    .select("id, email, full_name, is_platform_admin, can_create_events")
    .eq("id", data.user.id)
    .single();
  return (profile as Profile) ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export const canCreateEvents = (p: Profile) => p.is_platform_admin || p.can_create_events;

export type EventAccess = { roles: Role[]; canManage: boolean; canView: boolean };

export async function getEventAccess(profile: Profile, eventId: string): Promise<EventAccess> {
  const { data } = await db()
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .neq("invite_status", "declined");
  const roles = (data ?? []).map((r) => r.role as Role);
  const canManage = profile.is_platform_admin || roles.includes("admin");
  return { roles, canManage, canView: canManage || roles.length > 0 };
}

const SHORT_ID = /^[0-9]{4}[A-Z]{2}[0-9]{4}$/;

/** Evento pelo ID curto, só para quem administra. Qualquer outro caso vira 404 (não revela que o evento existe). */
export async function requireManagedEvent(shortIdParam: string) {
  const profile = await requireProfile();
  const shortId = shortIdParam.toUpperCase();
  if (!SHORT_ID.test(shortId)) notFound();
  const { data: event } = await db().from("events").select("id, short_id").eq("short_id", shortId).single();
  if (!event) notFound();
  const access = await getEventAccess(profile, event.id);
  if (!access.canManage) notFound();
  return { profile, event: event as { id: string; short_id: string }, access };
}
