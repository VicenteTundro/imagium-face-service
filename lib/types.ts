export const STATUSES = ["cadastrado", "aberto", "completo", "vendendo", "pausado", "bloqueado", "cancelado"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  cadastrado: "Cadastrado",
  aberto: "Aberto",
  completo: "Completo",
  vendendo: "Vendendo",
  pausado: "Pausado",
  bloqueado: "Bloqueado",
  cancelado: "Cancelado",
};

export type Role = "admin" | "photographer" | "organizer";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_platform_admin: boolean;
  can_create_events: boolean;
};

export type Category = { code: string; name: string; sort_order: number };

export type DiscountTier = { qty: number; pct: number };

export type Member = {
  id: string;
  role: Role;
  email: string;
  display_name: string | null;
  user_id: string | null;
  invite_status: "pending" | "accepted" | "declined";
};

export type EventStats = {
  event_id: string;
  photo_count: number;
  video_count: number;
  photographer_count: number;
  approved_orders: number;
  gross_cents: number;
  photos_sold: number;
  videos_sold: number;
};
