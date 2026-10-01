import "server-only";
import { db } from "./supabase/admin";
import type { Category, EventStats, Member, Profile, Role, Status, DiscountTier } from "./types";

/** O Supabase pode devolver relação 1-para-1 como objeto ou como lista de um item. */
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export type EventRow = {
  id: string;
  short_id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  category: string;
  status: Status;
  event_categories: { name: string } | null;
  event_private: { arrival_time: string | null } | null;
};

export type ListedEvent = EventRow & { stats: EventStats | null; myRoles: Role[]; canManage: boolean };

/** Remove tudo que não for letra, número, espaço ou hífen (evita injeção no filtro). */
export const cleanSearch = (q: string) => q.normalize("NFC").replace(/[^\p{L}\p{N} -]/gu, " ").trim().slice(0, 60);

export async function listEvents(profile: Profile, q: string): Promise<ListedEvent[]> {
  const { data: mine } = await db()
    .from("event_members")
    .select("event_id, role")
    .eq("user_id", profile.id)
    .neq("invite_status", "declined");
  const rolesByEvent = new Map<string, Role[]>();
  for (const m of mine ?? []) rolesByEvent.set(m.event_id, [...(rolesByEvent.get(m.event_id) ?? []), m.role as Role]);

  let query = db()
    .from("events")
    .select("id, short_id, name, event_date, event_time, city, state, address, category, status, event_categories(name), event_private(arrival_time)")
    .not("short_id", "is", null)
    .order("event_date", { ascending: false })
    .order("event_time", { ascending: false, nullsFirst: false });

  if (!profile.is_platform_admin) {
    const ids = [...rolesByEvent.keys()];
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const term = cleanSearch(q);
  if (term) query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%,address.ilike.%${term}%,short_id.ilike.%${term}%`);

  const { data: events, error } = await query;
  if (error) throw error;
  const rows = ((events ?? []) as unknown as EventRow[]).map((e) => ({
    ...e,
    event_private: one(e.event_private),
    event_categories: one(e.event_categories),
  }));
  if (rows.length === 0) return [];

  const { data: stats } = await db().from("event_stats").select("*").in("event_id", rows.map((e) => e.id));
  const statsById = new Map((stats ?? []).map((s) => [s.event_id, s as EventStats]));

  return rows.map((e) => {
    const myRoles = rolesByEvent.get(e.id) ?? [];
    return { ...e, stats: statsById.get(e.id) ?? null, myRoles, canManage: profile.is_platform_admin || myRoles.includes("admin") };
  });
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await db().from("event_categories").select("code, name, sort_order").order("sort_order");
  return (data ?? []) as Category[];
}

export type EventDetail = {
  id: string;
  short_id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  map_query: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  location_confirmed_at: string | null;
  category: string;
  status: Status;
  price_cents: number;
  video_price_cents: number | null;
  discount_tiers: DiscountTier[];
  icon_key: string | null;
  cover_photo_key: string | null;
  watermark_key: string | null;
  event_categories: { name: string } | null;
  event_private: {
    arrival_time: string | null;
    meeting_point: string | null;
    whatsapp_url: string | null;
    organizer_pct: number;
    admin_pct: number;
    platform_pct: number;
  } | null;
  members: Member[];
  stats: EventStats;
};

export async function getEventDetail(eventId: string): Promise<EventDetail> {
  const [{ data: e, error }, { data: members }, { data: stats }] = await Promise.all([
    db()
      .from("events")
      .select("id, short_id, name, event_date, event_time, city, state, address, map_query, latitude, longitude, google_place_id, location_confirmed_at, category, status, price_cents, video_price_cents, discount_tiers, icon_key, cover_photo_key, watermark_key, event_categories(name), event_private(arrival_time, meeting_point, whatsapp_url, organizer_pct, admin_pct, platform_pct)")
      .eq("id", eventId)
      .single(),
    db().from("event_members").select("id, role, email, display_name, user_id, invite_status").eq("event_id", eventId).order("created_at"),
    db().from("event_stats").select("*").eq("event_id", eventId).single(),
  ]);
  if (error || !e) throw error ?? new Error("Evento não encontrado");
  const raw = e as unknown as EventDetail;
  const priv = one(raw.event_private);
  return {
    ...raw,
    event_categories: one(raw.event_categories),
    event_private: priv ? { ...priv, organizer_pct: Number(priv.organizer_pct), admin_pct: Number(priv.admin_pct), platform_pct: Number(priv.platform_pct) } : null,
    members: (members ?? []) as Member[],
    stats: (stats as EventStats) ?? { event_id: eventId, photo_count: 0, video_count: 0, photographer_count: 0, approved_orders: 0, gross_cents: 0, photos_sold: 0, videos_sold: 0 },
  };
}

export type PhotographerSales = {
  photographer_member_id: string | null;
  photos_published: number; videos_published: number; photos_sold: number; videos_sold: number;
};

export async function getPhotographerSales(eventId: string): Promise<PhotographerSales[]> {
  const { data } = await db().from("event_photographer_sales")
    .select("photographer_member_id, photos_published, videos_published, photos_sold, videos_sold").eq("event_id", eventId);
  return (data ?? []) as PhotographerSales[];
}

export type OrderRow = {
  id: string;
  created_at: string;
  approved_at: string | null;
  amount_cents: number;
  status: string;
  photo_ids: string[];
  mp_fee_cents: number | null;
};

export async function listOrders(eventId: string, limit?: number): Promise<OrderRow[]> {
  let q = db()
    .from("orders")
    .select("id, created_at, approved_at, amount_cents, status, photo_ids, mp_fee_cents")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return (data ?? []) as OrderRow[];
}

export const ORDER_STATUS: Record<string, { label: string; tone: "pos" | "warn" | "neg" }> = {
  approved: { label: "Aprovado", tone: "pos" },
  pending: { label: "Pendente", tone: "warn" },
  rejected: { label: "Recusado", tone: "neg" },
  cancelled: { label: "Cancelado", tone: "neg" },
  refunded: { label: "Estornado", tone: "neg" },
};

export async function getDefaultPlatformPct(): Promise<number> {
  const { data } = await db().from("platform_settings").select("default_platform_pct").single();
  return Number(data?.default_platform_pct ?? 8);
}
