import "server-only";

export const mapsServerConfigured = () => Boolean(process.env.GOOGLE_MAPS_SERVER_KEY);
export const mapsBrowserKey = () => process.env.GOOGLE_MAPS_BROWSER_KEY || null;

export type Suggestion = { placeId: string; main: string; secondary: string };

export type PlaceResult = {
  placeId: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  formatted: string;
};

const API = "https://places.googleapis.com/v1";

export async function autocomplete(input: string, sessionToken: string): Promise<Suggestion[]> {
  const res = await fetch(`${API}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_SERVER_KEY! },
    body: JSON.stringify({ input, sessionToken, languageCode: "pt-BR", regionCode: "BR", includedRegionCodes: ["br"] }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google autocomplete ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }));
}

type Component = { longText: string; shortText: string; types: string[] };

export async function placeDetails(placeId: string, sessionToken: string): Promise<PlaceResult> {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) throw new Error("placeId inválido");
  const url = `${API}/places/${placeId}?languageCode=pt-BR&regionCode=BR&sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_SERVER_KEY!,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents,types",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google details ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as {
    id: string; displayName?: { text: string }; formattedAddress?: string;
    location?: { latitude: number; longitude: number }; addressComponents?: Component[]; types?: string[];
  };
  if (!d.location) throw new Error("Lugar sem coordenadas");
  const comp = (type: string, short = false) => {
    const c = d.addressComponents?.find((x) => x.types.includes(type));
    return c ? (short ? c.shortText : c.longText) : "";
  };
  const street = [comp("route"), comp("street_number")].filter(Boolean).join(", ");
  const district = comp("sublocality_level_1") || comp("sublocality");
  const name = d.displayName?.text ?? "";
  const isPlace = !(d.types ?? []).some((t) => ["street_address", "route", "premise", "subpremise"].includes(t));
  const streetLine = [street, district].filter(Boolean).join(" - ");
  const address = isPlace && name && !streetLine.startsWith(name) ? [name, streetLine].filter(Boolean).join(" — ") : streetLine || name;
  const state = comp("administrative_area_level_1", true).toUpperCase();
  return {
    placeId: d.id,
    address,
    city: comp("administrative_area_level_2") || comp("locality"),
    state: /^[A-Z]{2}$/.test(state) ? state : "",
    latitude: d.location.latitude,
    longitude: d.location.longitude,
    formatted: d.formattedAddress ?? "",
  };
}
