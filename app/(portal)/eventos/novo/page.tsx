import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, canCreateEvents } from "@/lib/auth";
import { listCategories, getDefaultPlatformPct } from "@/lib/events";
import { mapsServerConfigured, mapsBrowserKey } from "@/lib/maps";
import { EventForm, EMPTY_INITIAL } from "@/components/EventForm";
import { createEvent } from "../../actions";

export const metadata = { title: "Novo evento" };

export default async function NovoEventoPage() {
  const profile = await requireProfile();
  if (!canCreateEvents(profile)) redirect("/eventos");
  const [categories, platformPct] = await Promise.all([listCategories(), getDefaultPlatformPct()]);
  return (
    <div className="pagina estreito" style={{ paddingTop: 28 }}>
      <Link href="/eventos" className="btn-texto" style={{ display: "inline-flex", alignItems: "center", paddingLeft: 0 }}>← Todos os eventos</Link>
      <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, margin: "6px 0 28px" }}>Novo evento</h1>
      <EventForm mode="create" action={createEvent} categories={categories}
        initial={{ ...EMPTY_INITIAL, platform_pct: String(platformPct).replace(".", ",") }}
        adminName={profile.full_name || profile.email} canSetPlatformPct={profile.is_platform_admin}
        maps={{ search: mapsServerConfigured(), browserKey: mapsBrowserKey() }} />
    </div>
  );
}
