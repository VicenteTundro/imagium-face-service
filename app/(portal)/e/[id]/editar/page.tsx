import Link from "next/link";
import { requireManagedEvent } from "@/lib/auth";
import { getEventDetail, listCategories } from "@/lib/events";
import { signedUrl } from "@/lib/r2";
import { hhmm } from "@/lib/format";
import { mapsServerConfigured, mapsBrowserKey } from "@/lib/maps";
import { EventForm, type FormInitial } from "@/components/EventForm";
import { Camera, Xis } from "@/components/icons";
import { updateEvent, removePhotographer } from "../../../actions";

export const metadata = { title: "Editar evento" };

const money = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));
const num = (n: number) => String(n).replace(".", ",");

export default async function EditarEvento({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { profile, event: ref } = await requireManagedEvent(id);
  const [e, categories] = await Promise.all([getEventDetail(ref.id), listCategories()]);
  const [icon, cover, watermark] = await Promise.all([signedUrl(e.icon_key), signedUrl(e.cover_photo_key), signedUrl(e.watermark_key)]);

  const priv = e.event_private ?? { arrival_time: null, meeting_point: null, whatsapp_url: null, organizer_pct: 0, admin_pct: 0, platform_pct: 8 };
  const organizer = e.members.find((m) => m.role === "organizer");
  const admin = e.members.find((m) => m.role === "admin");
  const photographers = e.members.filter((m) => m.role === "photographer");

  const initial: FormInitial = {
    name: e.name, category: e.category, event_date: e.event_date, event_time: hhmm(e.event_time) ?? "",
    arrival_time: hhmm(priv.arrival_time) ?? "", city: e.city ?? "", state: e.state ?? "", address: e.address ?? "",
    latitude: e.latitude, longitude: e.longitude, google_place_id: e.google_place_id ?? "",
    meeting_point: priv.meeting_point ?? "", whatsapp_url: priv.whatsapp_url ?? "",
    price: money(e.price_cents), video_price: money(e.video_price_cents),
    tiers: (e.discount_tiers ?? []).map((t) => ({ qty: String(t.qty), pct: num(t.pct) })),
    organizer_name: organizer?.display_name ?? "", organizer_email: organizer?.email ?? "",
    organizer_pct: num(priv.organizer_pct), admin_pct: num(priv.admin_pct), platform_pct: num(priv.platform_pct),
    admin_is_photographer: !!admin?.user_id && photographers.some((p) => p.user_id === admin.user_id),
    images: { icon, cover, watermark },
  };

  return (
    <div className="pagina estreito" style={{ paddingTop: 28 }}>
      <Link href={`/e/${e.short_id}`} className="btn-texto" style={{ display: "inline-flex", alignItems: "center", paddingLeft: 0 }}>← Painel do evento</Link>
      <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, margin: "6px 0 8px" }}>Editar {e.name}</h1>
      <p className="mono accent" style={{ margin: "0 0 28px", letterSpacing: 1 }}>{e.short_id}</p>

      {sp.aviso === "fotos" && <div className="erro" role="alert" style={{ marginBottom: 20 }}>Esse fotógrafo já tem fotos no evento e não pode ser removido.</div>}
      {sp.removido && <div className="aviso" role="status" style={{ marginBottom: 20 }}>Fotógrafo removido.</div>}
      {mapsServerConfigured() && e.latitude == null && (
        <div className="aviso" role="status" style={{ marginBottom: 20 }}>Este evento ainda não tem o ponto no mapa. Busque o endereço na seção “Local” e confira o pino antes de salvar.</div>
      )}

      {photographers.length > 0 && (
        <section className="secao" style={{ borderTop: "none", paddingTop: 0, marginBottom: 40 }}>
          <h2>Fotógrafos do evento</h2>
          <div>
            {photographers.map((p) => (
              <div className="pessoa" key={p.id}>
                <Camera />
                <div className="quem">
                  <span style={{ fontWeight: 600 }}>{p.display_name || p.email}</span>
                  <span className="muted" style={{ fontSize: 12.5 }}>{p.email}</span>
                </div>
                <span className={p.invite_status === "accepted" ? "pos" : "warn"} style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {p.invite_status === "accepted" ? "Convite aceito" : p.invite_status === "declined" ? "Recusou" : "Convite pendente"}
                </span>
                <form action={removePhotographer.bind(null, e.short_id, p.id)}>
                  <button className="btn-texto" aria-label={`Remover ${p.display_name || p.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Xis />Remover</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <EventForm mode="edit" action={updateEvent.bind(null, e.short_id)} categories={categories} initial={initial}
        adminName={admin?.display_name || profile.full_name || profile.email} shortId={e.short_id}
        categoryLabel={`${e.event_categories?.name ?? ""} (${e.category})`} splitLocked={e.stats.approved_orders > 0}
        canSetPlatformPct={profile.is_platform_admin} maps={{ search: mapsServerConfigured(), browserKey: mapsBrowserKey() }} />
    </div>
  );
}
