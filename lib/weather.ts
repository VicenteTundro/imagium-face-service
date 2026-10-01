import "server-only";
import { db } from "./supabase/admin";
import { todayISO, daysBetween } from "./format";

/*
 * Previsão do tempo: MET Norway (api.met.no), gratuita e com uso comercial permitido
 * (dados CC BY 4.0 — a fonte é citada na tela). Coordenadas da cidade: OpenStreetMap
 * (Nominatim), consultadas uma única vez por cidade e guardadas em city_coords.
 */
const UA = "imagium-portal/1.0 (+https://imagium-portal.vercel.app)";
const HORIZON_DAYS = 9;

export type Weather =
  | { kind: "forecast"; at: string; tempC: number; label: string; icon: string; rainMm: number | null; windKmh: number | null; humidity: number | null; approximate: boolean }
  | { kind: "later"; availableFrom: string }
  | { kind: "past" }
  | { kind: "unavailable"; reason: string };

const LABELS: Record<string, [string, string]> = {
  clearsky: ["Céu limpo", "☀️"], fair: ["Poucas nuvens", "🌤️"], partlycloudy: ["Parcialmente nublado", "⛅"],
  cloudy: ["Nublado", "☁️"], fog: ["Neblina", "🌫️"],
  lightrain: ["Chuva fraca", "🌦️"], rain: ["Chuva", "🌧️"], heavyrain: ["Chuva forte", "🌧️"],
  lightrainshowers: ["Pancadas fracas", "🌦️"], rainshowers: ["Pancadas de chuva", "🌦️"], heavyrainshowers: ["Pancadas fortes", "🌧️"],
  lightrainandthunder: ["Chuva fraca com trovoadas", "⛈️"], rainandthunder: ["Chuva com trovoadas", "⛈️"], heavyrainandthunder: ["Chuva forte com trovoadas", "⛈️"],
  lightrainshowersandthunder: ["Pancadas com trovoadas", "⛈️"], rainshowersandthunder: ["Pancadas com trovoadas", "⛈️"], heavyrainshowersandthunder: ["Temporal", "⛈️"],
  sleet: ["Chuva com granizo", "🌨️"], lightsleet: ["Granizo fraco", "🌨️"], heavysleet: ["Granizo forte", "🌨️"],
  snow: ["Neve", "❄️"], lightsnow: ["Neve fraca", "❄️"], heavysnow: ["Neve forte", "❄️"],
};
function describe(symbol: string | undefined): [string, string] {
  const base = (symbol ?? "").replace(/_(day|night|polartwilight)$/, "");
  return LABELS[base] ?? [base ? base : "Sem descrição", "🌡️"];
}

async function cityCoords(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const key = { city: city.trim(), state: (state || "").trim().toUpperCase() };
  const { data: cached } = await db().from("city_coords").select("latitude, longitude, found, looked_up_at")
    .eq("city", key.city).eq("state", key.state).maybeSingle();
  // Cidade não encontrada: tenta de novo só depois de 7 dias
  if (cached && (cached.found || Date.now() - new Date(cached.looked_up_at).getTime() < 7 * 86_400_000)) {
    return cached.found ? { lat: cached.latitude, lng: cached.longitude } : null;
  }
  const q = [key.city, key.state, "Brasil"].filter(Boolean).join(", ");
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": UA, "Accept-Language": "pt-BR" }, cache: "no-store" });
    if (!res.ok) return null;
    const list = (await res.json()) as { lat: string; lon: string }[];
    const hit = list[0];
    await db().from("city_coords").upsert({
      ...key, found: Boolean(hit), latitude: hit ? Number(hit.lat) : null, longitude: hit ? Number(hit.lon) : null, looked_up_at: new Date().toISOString(),
    });
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

type Series = {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number; relative_humidity?: number } };
    next_1_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
  };
}[];

export async function getEventWeather(e: {
  event_date: string; event_time: string | null; city: string | null; state: string | null;
  latitude: number | null; longitude: number | null;
}): Promise<Weather> {
  const today = todayISO();
  const days = daysBetween(today, e.event_date);
  if (days < 0) return { kind: "past" };
  if (days > HORIZON_DAYS) {
    const d = new Date(`${e.event_date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - HORIZON_DAYS);
    return { kind: "later", availableFrom: d.toISOString().slice(0, 10) };
  }

  let coords = e.latitude != null && e.longitude != null ? { lat: e.latitude, lng: e.longitude } : null;
  const approximate = !coords;
  if (!coords && e.city) coords = await cityCoords(e.city, e.state ?? "");
  if (!coords) return { kind: "unavailable", reason: "Informe a cidade e o estado do evento para ver a previsão." };

  try {
    const lat = coords.lat.toFixed(4), lon = coords.lng.toFixed(4);
    const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": UA }, next: { revalidate: 1800 } });
    if (!res.ok) return { kind: "unavailable", reason: "O serviço de previsão não respondeu agora. Tente mais tarde." };
    const series = ((await res.json()) as { properties: { timeseries: Series } }).properties.timeseries;

    // Horário do evento em São Paulo (UTC−3); sem horário, considera meio-dia
    const target = new Date(`${e.event_date}T${(e.event_time ?? "12:00").slice(0, 5)}:00-03:00`).getTime();
    let best = series[0];
    for (const s of series) if (Math.abs(new Date(s.time).getTime() - target) < Math.abs(new Date(best.time).getTime() - target)) best = s;
    if (!best || Math.abs(new Date(best.time).getTime() - target) > 6 * 3_600_000) {
      return { kind: "unavailable", reason: "Ainda não há previsão para o horário do evento." };
    }
    const next = best.data.next_1_hours ?? best.data.next_6_hours;
    const [label, icon] = describe(next?.summary.symbol_code);
    const d = best.data.instant.details;
    return {
      kind: "forecast", at: best.time, approximate,
      tempC: Math.round(d.air_temperature ?? NaN), label, icon,
      rainMm: next?.details?.precipitation_amount ?? null,
      windKmh: d.wind_speed != null ? Math.round(d.wind_speed * 3.6) : null,
      humidity: d.relative_humidity != null ? Math.round(d.relative_humidity) : null,
    };
  } catch {
    return { kind: "unavailable", reason: "O serviço de previsão não respondeu agora. Tente mais tarde." };
  }
}
