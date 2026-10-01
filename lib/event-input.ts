import { parseMoney, parsePct } from "./format";
import type { DiscountTier } from "./types";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const str = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

function parseJsonArray(raw: string): unknown[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Lê e valida o formulário do evento. Tudo é conferido de novo aqui, no servidor. */
export function parseEventForm(fd: FormData, opts: { requireCategory: boolean; categories: string[]; requireLocation: boolean }) {
  const errors: Record<string, string> = {};

  const name = str(fd, "name", 120);
  if (!name) errors.name = "Informe o nome do evento";

  const category = str(fd, "category", 2);
  if (opts.requireCategory && !opts.categories.includes(category)) errors.category = "Escolha a categoria";

  const event_date = str(fd, "event_date", 10);
  if (!DATE.test(event_date) || Number.isNaN(Date.parse(event_date))) errors.event_date = "Informe a data";

  const event_time = str(fd, "event_time", 5);
  if (!TIME.test(event_time)) errors.event_time = "Informe o horário do evento";
  const arrival_time = str(fd, "arrival_time", 5);
  if (!TIME.test(arrival_time)) errors.arrival_time = "Informe o horário sugerido para chegada";

  const city = str(fd, "city", 80);
  if (!city) errors.city = "Informe a cidade";
  const address = str(fd, "address", 200);
  if (!address) errors.address = "Informe o local ou endereço";
  const state = str(fd, "state", 2).toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) errors.state = "Use a sigla do estado (ex.: SP)";
  const latRaw = str(fd, "latitude", 20);
  const lngRaw = str(fd, "longitude", 20);
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lngRaw ? Number(lngRaw) : null;
  const hasCoords = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const google_place_id = str(fd, "google_place_id", 300);
  if (opts.requireLocation) {
    if (!hasCoords) errors.location = "Busque o endereço e escolha um resultado para marcar o local no mapa";
    else if (fd.get("location_confirmed") !== "on") errors.location = "Confira o pino no mapa e marque a caixa de conferência";
  }
  const meeting_point = str(fd, "meeting_point", 300);

  const whatsapp_url = str(fd, "whatsapp_url", 200);
  if (whatsapp_url && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/.test(whatsapp_url)) {
    errors.whatsapp_url = "Cole o link de convite do grupo (começa com https://chat.whatsapp.com/)";
  }

  const price_cents = parseMoney(str(fd, "price", 20));
  if (price_cents == null || price_cents <= 0) errors.price = "Informe o preço por foto";
  const videoRaw = str(fd, "video_price", 20);
  const video_price_cents = videoRaw ? parseMoney(videoRaw) : null;
  if (videoRaw && (video_price_cents == null || video_price_cents <= 0)) errors.video_price = "Preço de vídeo inválido";

  const tiers: DiscountTier[] = [];
  for (const t of parseJsonArray(str(fd, "tiers", 2000))) {
    const qty = Math.trunc(Number((t as DiscountTier).qty));
    const p = parsePct(String((t as DiscountTier).pct ?? ""));
    if (!qty && p == null) continue;
    if (!(qty >= 2 && qty <= 1000) || p == null || p <= 0 || p >= 100) {
      errors.tiers = "Cada faixa precisa de quantidade (2 ou mais) e desconto entre 0% e 100%";
      break;
    }
    tiers.push({ qty, pct: p });
  }
  tiers.sort((a, b) => a.qty - b.qty);
  if (new Set(tiers.map((t) => t.qty)).size !== tiers.length) errors.tiers = "Há duas faixas com a mesma quantidade";

  const organizer_name = str(fd, "organizer_name", 120);
  const organizer_email = str(fd, "organizer_email", 200).toLowerCase();
  if (organizer_email && !EMAIL.test(organizer_email)) errors.organizer_email = "E-mail do organizador inválido";

  const organizer_pct = parsePct(str(fd, "organizer_pct", 10)) ?? 0;
  const admin_pct = parsePct(str(fd, "admin_pct", 10)) ?? 0;
  const platform_pct = parsePct(str(fd, "platform_pct", 10)) ?? 8;
  if ([organizer_pct, admin_pct, platform_pct].some((p) => p < 0 || p > 100)) errors.split = "Porcentagem inválida";
  else if (organizer_pct + admin_pct + platform_pct > 100) errors.split = "A soma das porcentagens passa de 100%";
  if (organizer_pct > 0 && !organizer_email) errors.organizer_email = "Informe o e-mail do organizador (há comissão para ele)";

  const admin_is_photographer = fd.get("admin_is_photographer") === "on";
  const admin_photographer_name = str(fd, "admin_photographer_name", 120);

  const photographers: { name: string; email: string }[] = [];
  const seen = new Set<string>();
  for (const p of parseJsonArray(str(fd, "photographers", 5000))) {
    const email = String((p as { email?: string }).email ?? "").trim().toLowerCase().slice(0, 200);
    const pname = String((p as { name?: string }).name ?? "").trim().slice(0, 120);
    if (!email && !pname) continue;
    if (!EMAIL.test(email)) { errors.photographers = `E-mail inválido: ${email || pname}`; break; }
    if (seen.has(email)) continue;
    seen.add(email);
    photographers.push({ name: pname, email });
  }

  const payload = {
    name, category, event_date, event_time, arrival_time, city, state, address, meeting_point, whatsapp_url,
    latitude: hasCoords ? latitude : null, longitude: hasCoords ? longitude : null, google_place_id: hasCoords ? google_place_id : "",
    price_cents, video_price_cents, discount_tiers: tiers,
    organizer_name, organizer_email, organizer_pct, admin_pct, platform_pct,
    admin_is_photographer, admin_photographer_name, photographers,
  };
  return { payload, errors };
}
