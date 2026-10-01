const TZ = "America/Sao_Paulo";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (cents: number) => brlFmt.format(cents / 100);
export const brlNumber = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
export const pct = (n: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)}%`;
export const int = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

/** Data de hoje em São Paulo, no formato AAAA-MM-DD. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

function parts(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...opts }).format(asDate(iso)).replace(/\./g, "");
}

/** "dom 20 set" */
export const dateShort = (iso: string) =>
  `${parts(iso, { weekday: "short" })} ${parts(iso, { day: "2-digit" })} ${parts(iso, { month: "short" })}`;

/** "domingo, 20 de setembro de 2026" */
export const dateLong = (iso: string) =>
  parts(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** "domingo, 4 de outubro" */
export const dateLongNoYear = (iso: string) => parts(iso, { weekday: "long", day: "numeric", month: "long" });

/** "TER 29 SET 2026" */
export const dateBand = (iso: string) =>
  `${parts(iso, { weekday: "short" })} ${parts(iso, { day: "2-digit" })} ${parts(iso, { month: "short" })} ${parts(iso, { year: "numeric" })}`.toUpperCase();

/** "22:00:00" → "22:00" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((asDate(toISO).getTime() - asDate(fromISO).getTime()) / 86_400_000);
}

export function relativeDays(n: number): string {
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  return `em ${n} dias`;
}

/** "28/09 14:32" no fuso de São Paulo */
export function dateTimeShort(ts: string): string {
  const d = new Date(ts);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...o }).format(d);
  return `${f({ day: "2-digit", month: "2-digit" })} ${f({ hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export function dateTimeFull(ts: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ts));
}

/** Aceita "R$ 12,90", "12,9", "12.90", "1.234,56". Devolve centavos ou null. */
export function parseMoney(input: string | null | undefined): number | null {
  if (!input) return null;
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Aceita "10%", "7,5", "8.25". Devolve número com até 2 casas ou null. */
export function parsePct(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = input.replace(/[^\d.,]/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** "14:30" e "16:00" → "1h30 antes". Vazio se não houver os dois horários ou se a chegada não for antes. */
export function leadTime(arrival: string | null | undefined, start: string | null | undefined): string {
  if (!arrival || !start) return "";
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const diff = m(start) - m(arrival);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60), min = diff % 60;
  return `${h ? `${h}h` : ""}${h && min ? String(min).padStart(2, "0") : min ? `${min} min` : ""} antes`;
}

/** "São Paulo" + "SP" → "São Paulo, SP" */
export const cityState = (city: string | null | undefined, state: string | null | undefined) =>
  [city, state].filter(Boolean).join(", ");

export const mapsLinks = (lat: number, lng: number) => ({
  google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
  waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
  embed: `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`,
});
