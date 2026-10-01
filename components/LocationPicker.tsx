"use client";
import { useEffect, useRef, useState } from "react";
import { searchAddress, getPlace } from "@/app/(portal)/maps-actions";
import type { Suggestion } from "@/lib/maps";
import { Pino, Lupa } from "./icons";

export type LocationValue = {
  address: string; city: string; state: string;
  latitude: number | null; longitude: number | null; placeId: string;
};

type Props = {
  initial: LocationValue;
  searchEnabled: boolean;
  browserKey: string | null;
  errors: Record<string, string>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { __gmaps?: Promise<any>; __gmapsReady?: () => void; google?: any } }

function loadMaps(key: string): Promise<any> {
  if (!window.__gmaps) {
    window.__gmaps = new Promise((resolve, reject) => {
      window.__gmapsReady = () => resolve(window.google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=pt-BR&region=BR&callback=__gmapsReady`;
      s.async = true;
      s.onerror = () => { window.__gmaps = undefined; reject(new Error("maps")); };
      document.head.appendChild(s);
    });
  }
  return window.__gmaps;
}

const newToken = () => crypto.randomUUID();
const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function LocationPicker({ initial, searchEnabled, browserKey, errors }: Props) {
  const [loc, setLoc] = useState(initial);
  const [confirmed, setConfirmed] = useState(initial.latitude != null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const token = useRef(newToken());
  const mapDiv = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const hasCoords = loc.latitude != null && loc.longitude != null;

  // Busca com espera de 350 ms entre teclas (menos chamadas ao Google)
  useEffect(() => {
    if (!searchEnabled) return;
    const q = query.trim();
    if (q.length < 3) { setItems([]); return; }
    const t = setTimeout(async () => {
      const r = await searchAddress(q, token.current);
      if (r.ok) { setItems(r.data); setActive(-1); setMsg(r.data.length ? null : "Nenhum endereço encontrado. Tente com número e cidade."); }
      else setMsg(r.error);
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchEnabled]);

  // Mapa interativo: o pino fica fixo no centro; arrastar o mapa ajusta o ponto
  useEffect(() => {
    if (!browserKey || !hasCoords || !mapDiv.current) return;
    let cancelled = false;
    loadMaps(browserKey).then(async (gm) => {
      if (cancelled || !mapDiv.current) return;
      const { Map } = await gm.importLibrary("maps");
      const center = { lat: loc.latitude!, lng: loc.longitude! };
      if (!map.current) {
        map.current = new Map(mapDiv.current, {
          center, zoom: 17, mapTypeControl: true, streetViewControl: true, fullscreenControl: true,
          clickableIcons: false, gestureHandling: "greedy",
        });
        map.current.addListener("dragend", () => {
          const c = map.current.getCenter();
          setLoc((l) => ({ ...l, latitude: round(c.lat()), longitude: round(c.lng()) }));
          setConfirmed(false);
        });
      } else {
        const c = map.current.getCenter();
        if (Math.abs(c.lat() - center.lat) > 1e-6 || Math.abs(c.lng() - center.lng) > 1e-6) map.current.setCenter(center);
      }
    }).catch(() => setMapFailed(true));
    return () => { cancelled = true; };
  }, [browserKey, hasCoords, loc.latitude, loc.longitude]);

  async function choose(s: Suggestion) {
    setBusy(true); setItems([]); setMsg(null);
    const r = await getPlace(s.placeId, token.current);
    token.current = newToken();
    setBusy(false);
    if (!r.ok) { setMsg(r.error); return; }
    const p = r.data;
    setLoc({ address: p.address, city: p.city, state: p.state, latitude: round(p.latitude), longitude: round(p.longitude), placeId: p.placeId });
    setConfirmed(false);
    setQuery("");
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === "Escape") setItems([]);
  }

  const gLink = hasCoords ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}` : null;
  const err = (k: string) => (errors[k] ? <span className="erro-campo" id={`${k}-erro`}>{errors[k]}</span> : null);

  return (
    <div className="campos">
      {searchEnabled && (
        <div className="campo-bloco c6 busca-local">
          <label htmlFor="busca-endereco">Buscar local ou endereço</label>
          <div className="campo-icone">
            <Lupa />
            <input id="busca-endereco" className="campo" value={query} autoComplete="off" spellCheck={false}
              role="combobox" aria-expanded={items.length > 0} aria-controls="sugestoes-endereco" aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `sug-${active}` : undefined}
              placeholder="Ex.: Neo Química Arena  ·  Rua José Capobianco, 232, São Paulo"
              onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} />
          </div>
          {items.length > 0 && (
            <ul id="sugestoes-endereco" role="listbox" className="sugestoes">
              {items.map((s, i) => (
                <li key={s.placeId} id={`sug-${i}`} role="option" aria-selected={i === active}>
                  <button type="button" onClick={() => choose(s)} onMouseEnter={() => setActive(i)}>
                    <Pino /><span><b>{s.main}</b><span className="muted"> {s.secondary}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {busy && <span className="ajuda">Abrindo o endereço…</span>}
          {msg && <span className="ajuda" role="status">{msg}</span>}
          <span className="ajuda">Escolha um resultado: cidade, estado e o ponto no mapa são preenchidos sozinhos.</span>
        </div>
      )}

      <div className="campo-bloco c4">
        <label htmlFor="address">Local / endereço</label>
        <input id="address" name="address" className="campo" autoComplete="off" value={loc.address}
          onChange={(e) => setLoc({ ...loc, address: e.target.value })} placeholder="Ex.: Neo Química Arena — Av. Miguel Ignácio Curi, 111"
          aria-invalid={errors.address ? true : undefined} />
        {err("address")}
      </div>
      <div className="campo-bloco" style={{ gridColumn: "span 1" }}>
        <label htmlFor="city">Cidade</label>
        <input id="city" name="city" className="campo" autoComplete="off" value={loc.city}
          onChange={(e) => setLoc({ ...loc, city: e.target.value })} aria-invalid={errors.city ? true : undefined} />
        {err("city")}
      </div>
      <div className="campo-bloco" style={{ gridColumn: "span 1" }}>
        <label htmlFor="state">Estado</label>
        <input id="state" name="state" className="campo" autoComplete="off" maxLength={2} value={loc.state}
          onChange={(e) => setLoc({ ...loc, state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} placeholder="SP"
          aria-invalid={errors.state ? true : undefined} />
        {err("state")}
      </div>

      <input type="hidden" name="latitude" value={loc.latitude ?? ""} />
      <input type="hidden" name="longitude" value={loc.longitude ?? ""} />
      <input type="hidden" name="google_place_id" value={loc.placeId} />

      {searchEnabled && (
        <div className="campo-bloco c6">
          {hasCoords ? (
            <>
              {browserKey && !mapFailed ? (
                <div className="mapa-editor">
                  <div ref={mapDiv} className="mapa" style={{ height: 320 }} />
                  <div className="pino-centro" aria-hidden="true"><Pino size={36} className="pino-svg" /></div>
                </div>
              ) : (
                <iframe className="mapa" style={{ height: 320 }} title="Mapa do local" loading="lazy" referrerPolicy="no-referrer"
                  src={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}&z=17&output=embed`} />
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                {browserKey && !mapFailed && <span className="ajuda">Arraste o mapa para colocar o pino no ponto exato (ex.: o portão de entrada). Use “Satélite” para ver melhor.</span>}
                {gLink && <a className="link" href={gLink} target="_blank" rel="noopener noreferrer">Abrir no Google Maps para conferir ↗</a>}
                <span className="ajuda mono">{loc.latitude}, {loc.longitude}</span>
              </div>
              <label className={`check conferencia ${confirmed ? "ok" : ""}`}>
                <input type="checkbox" name="location_confirmed" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                Conferi no mapa: o pino está no local do evento.
              </label>
              {err("location")}
            </>
          ) : (
            <>
              <div className="mapa">O mapa aparece aqui depois que você escolher um endereço na busca</div>
              {err("location")}
            </>
          )}
        </div>
      )}
    </div>
  );
}
