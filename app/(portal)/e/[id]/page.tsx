import Link from "next/link";
import { requireManagedEvent } from "@/lib/auth";
import { getEventDetail, getPhotographerSales, listOrders, ORDER_STATUS } from "@/lib/events";
import { splitGross, salesWeight } from "@/lib/split";
import { signedUrl } from "@/lib/r2";
import { brl, brlNumber, cityState, dateLong, dateTimeShort, hhmm, int, leadTime, mapsLinks, pct } from "@/lib/format";
import { STATUSES, STATUS_LABEL } from "@/lib/types";
import { StatusPill } from "@/components/StatusPill";
import { RoleTag } from "@/components/RoleTag";
import { Download, Lapis, Pessoas, Pino, Zap } from "@/components/icons";
import { setStatus } from "../../actions";
import { getEventWeather, type Weather } from "@/lib/weather";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: (await params).id.toUpperCase() };
}

const NOTICES: Record<string, { text: string; error?: boolean }> = {
  criado: { text: "Evento criado." },
  salvo: { text: "Alterações salvas." },
  situacao: { text: "Situação atualizada." },
  imagens: { text: "O evento foi salvo, mas alguma imagem não foi enviada. Abra “Editar” e envie de novo.", error: true },
  erro: { text: "Não foi possível salvar. Tente de novo.", error: true },
};

const fotos = (n: number) => `${int(n)} ${n === 1 ? "foto" : "fotos"}`;
const videos = (n: number) => `${int(n)} ${n === 1 ? "vídeo" : "vídeos"}`;

export default async function PainelEvento({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { event: ref, access } = await requireManagedEvent(id);
  const [e, sales, orders] = await Promise.all([getEventDetail(ref.id), getPhotographerSales(ref.id), listOrders(ref.id, 20)]);
  const [cover, icon, weather] = await Promise.all([signedUrl(e.cover_photo_key), signedUrl(e.icon_key), getEventWeather(e)]);

  const photographers = e.members.filter((m) => m.role === "photographer");
  const organizer = e.members.find((m) => m.role === "organizer");
  const admin = e.members.find((m) => m.role === "admin");
  const priv = e.event_private ?? { arrival_time: null, meeting_point: null, whatsapp_url: null, organizer_pct: 0, admin_pct: 0, platform_pct: 8 };

  const nameOf = (memberId: string | null) => {
    const m = photographers.find((p) => p.id === memberId);
    return m ? m.display_name || m.email : "Sem fotógrafo atribuído";
  };
  const split = splitGross({
    grossCents: Number(e.stats.gross_cents),
    organizerPct: priv.organizer_pct, adminPct: priv.admin_pct, platformPct: priv.platform_pct,
    photographers: sales.map((s) => ({
      id: s.photographer_member_id, name: nameOf(s.photographer_member_id),
      photosSold: s.photos_sold, videosSold: s.videos_sold,
      weight: salesWeight(s.photos_sold, s.videos_sold, e.price_cents, e.video_price_cents),
    })),
  });
  const centsOf = (memberId: string | null) => split.perPhotographer.find((p) => p.id === memberId)?.cents ?? 0;

  // Planilha: todos os fotógrafos convidados + a linha "sem fotógrafo", se houver itens sem dono
  const rows = photographers.map((p) => {
    const s = sales.find((x) => x.photographer_member_id === p.id);
    return { key: p.id, name: p.display_name || p.email, email: p.email, invite: p.invite_status as string,
      pp: s?.photos_published ?? 0, vp: s?.videos_published ?? 0, ps: s?.photos_sold ?? 0, vs: s?.videos_sold ?? 0, cents: centsOf(p.id) };
  });
  const orphan = sales.find((s) => s.photographer_member_id === null);
  if (orphan) rows.push({ key: "sem", name: "Sem fotógrafo atribuído", email: "", invite: "", pp: orphan.photos_published,
    vp: orphan.videos_published, ps: orphan.photos_sold, vs: orphan.videos_sold, cents: centsOf(null) });
  const total = rows.reduce((t, r) => ({ pp: t.pp + r.pp, vp: t.vp + r.vp, ps: t.ps + r.ps, vs: t.vs + r.vs, cents: t.cents + r.cents }),
    { pp: 0, vp: 0, ps: 0, vs: 0, cents: 0 });

  const notice = sp.criado ? NOTICES.criado : sp.salvo ? NOTICES.salvo : sp.situacao ? NOTICES.situacao : sp.aviso ? NOTICES[sp.aviso] : null;
  const chegada = hhmm(priv.arrival_time);
  const hora = hhmm(e.event_time);
  const antes = leadTime(chegada, hora);
  const acceptedCount = photographers.filter((p) => p.invite_status !== "declined").length;
  const links = e.latitude != null && e.longitude != null ? mapsLinks(e.latitude, e.longitude) : null;

  return (
    <>
      <section className={`painel-cab ${cover ? "com-capa" : ""}`}
        style={cover ? { backgroundImage: `linear-gradient(to right, var(--bg) 35%, color-mix(in srgb, var(--bg) 70%, transparent)), url("${cover}")` } : undefined}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Link href="/eventos" className="btn-texto" style={{ paddingLeft: 0, display: "inline-flex", alignItems: "center" }}>← Todos os eventos</Link>
          <span className="rotulo">PAINEL DO EVENTO · {e.short_id}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {icon && <img src={icon} alt="" className="icone-evento" />}
          <h1>{e.name}</h1>
          <StatusPill status={e.status} />
          <RoleTag roles={access.roles} />
        </div>
        <div style={{ fontSize: 16 }}>
          {dateLong(e.event_date)}
          {chegada && <> · chegada <b>{chegada}</b></>}
          {hora && <> · início {hora}</>}
          {antes && <span className="muted"> ({antes})</span>}
        </div>
        <div className="meta">
          <span><Pino />{[e.address, cityState(e.city, e.state)].filter(Boolean).join(" — ")}</span>
          <span><Pessoas />{acceptedCount} {acceptedCount === 1 ? "fotógrafo" : "fotógrafos"}</span>
          {priv.whatsapp_url && (
            <a className="link" href={priv.whatsapp_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Zap size={15} />Entrar no grupo de WhatsApp
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
          <Link href={`/e/${e.short_id}/editar`} className="btn-sec"><Lapis />Editar evento</Link>
          <form action={setStatus.bind(null, e.short_id)} style={{ display: "flex", gap: 8 }}>
            <label htmlFor="status" className="sr">Situação do evento</label>
            <select id="status" name="status" className="campo" defaultValue={e.status} style={{ width: 170 }}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button className="btn-sec">Mudar situação</button>
          </form>
        </div>
        {notice && <div className={notice.error ? "erro" : "aviso"} role="status" style={{ maxWidth: 640 }}>{notice.text}</div>}
      </section>

      <div className="painel-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <div className="kpis tres">
            <div className="kpi">
              <span className="col-cab">Faturamento bruto</span>
              <span className="valor"><small>R$</small>{brlNumber(Number(e.stats.gross_cents))}</span>
              <span className="muted">{int(e.stats.approved_orders)} {e.stats.approved_orders === 1 ? "pedido aprovado" : "pedidos aprovados"}</span>
            </div>
            <div className="kpi">
              <span className="col-cab">Fotos vendidas</span>
              <span className="valor">{int(e.stats.photos_sold)}</span>
              <span className="muted">de {fotos(e.stats.photo_count)} publicadas</span>
            </div>
            <div className="kpi">
              <span className="col-cab">Vídeos vendidos</span>
              <span className="valor">{int(e.stats.videos_sold)}</span>
              <span className="muted">de {videos(e.stats.video_count)} publicados</span>
            </div>
          </div>

          <section className="cartao" aria-labelledby="div-titulo">
            <div>
              <h2 id="div-titulo">Divisão do valor bruto</h2>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Base de cálculo: valor bruto. Porcentagens definidas no cadastro do evento.</p>
            </div>
            <div>
              <div className="div-linha total"><span>Faturamento bruto</span><span>100%</span><span>{brl(Number(e.stats.gross_cents))}</span></div>
              <div className="div-linha"><span>Fotógrafos <span className="muted" style={{ fontWeight: 400 }}>(detalhe na planilha abaixo)</span></span><span>{pct(split.photographersPct)}</span><span>{brl(split.photographersCents)}</span></div>
              <div className="div-linha"><span>Organizador{organizer ? ` — ${organizer.display_name || organizer.email}` : ""}</span><span>{pct(priv.organizer_pct)}</span><span>{brl(split.organizerCents)}</span></div>
              <div className="div-linha"><span>Administrador{admin ? ` — ${admin.display_name || admin.email}` : ""}</span><span>{pct(priv.admin_pct)}</span><span>{brl(split.adminCents)}</span></div>
              <div className="div-linha"><span>Imagium Foto — plataforma</span><span>{pct(priv.platform_pct)}</span><span>{brl(split.platformCents)}</span></div>
            </div>
          </section>

          <section className="cartao" aria-labelledby="fot-titulo">
            <div>
              <h2 id="fot-titulo">Fotógrafos</h2>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                A parte dos fotógrafos ({pct(split.photographersPct)}) é dividida pelo valor de tabela do que cada um vendeu
                ({brl(e.price_cents)} por foto{e.video_price_cents ? `, ${brl(e.video_price_cents)} por vídeo` : ""}).
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nenhum fotógrafo convidado. <Link className="link" href={`/e/${e.short_id}/editar`}>Convidar</Link></p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="planilha">
                  <thead>
                    <tr className="col-cab">
                      <th>Fotógrafo</th><th>Fotos publicadas</th><th>Vídeos publicados</th><th>Fotos vendidas</th><th>Vídeos vendidos</th><th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.name}</span>
                          {r.invite && (
                            <span className={r.invite === "accepted" ? "pos" : r.invite === "declined" ? "neg" : "warn"} style={{ display: "block", fontSize: 12 }}>
                              {r.invite === "accepted" ? "Convite aceito" : r.invite === "declined" ? "Recusou" : "Convite pendente"}
                            </span>
                          )}
                        </td>
                        <td>{int(r.pp)}</td><td>{int(r.vp)}</td><td>{int(r.ps)}</td><td>{int(r.vs)}</td><td>{brl(r.cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td>Total</td><td>{int(total.pp)}</td><td>{int(total.vp)}</td><td>{int(total.ps)}</td><td>{int(total.vs)}</td><td>{brl(total.cents)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}
            {orphan && <p className="ajuda" style={{ margin: 0 }}>Itens sem fotógrafo atribuído foram enviados antes do painel do fotógrafo. A partir dele, cada envio já fica com o dono certo.</p>}
          </section>

          <section className="cartao" aria-labelledby="ped-titulo">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 id="ped-titulo">Pedidos recentes</h2>
              {orders.length > 0 && <a className="btn-sec" href={`/e/${e.short_id}/pedidos.csv`} download><Download />Exportar CSV</a>}
            </div>
            {orders.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Nenhum pedido ainda. Os pedidos aparecem aqui quando o evento estiver vendendo.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="pedidos">
                  <thead><tr className="col-cab"><th>Pedido</th><th>Data</th><th>Itens</th><th className="dir">Bruto</th><th className="dir">Situação</th></tr></thead>
                  <tbody>
                    {orders.map((o) => {
                      const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: "warn" as const };
                      const n = Array.isArray(o.photo_ids) ? o.photo_ids.length : 0;
                      return (
                        <tr key={o.id}>
                          <td className="mono" style={{ fontSize: 12.5 }}>{o.id.slice(0, 8)}</td>
                          <td>{dateTimeShort(o.created_at)}</td>
                          <td>{n} {n === 1 ? "item" : "itens"}</td>
                          <td className="dir">{brl(o.amount_cents)}</td>
                          <td className={`dir ${st.tone}`} style={{ fontWeight: 600 }}>{st.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="cartao" aria-labelledby="previa-titulo">
            <h2 id="previa-titulo">Como o cliente vê</h2>
            <div className="previa">
              <div className="capa" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}>{!cover && "Sem capa"}</div>
              <div className="corpo">
                {icon ? <img src={icon} alt="" /> : <span className="sem-icone" aria-hidden="true" />}
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>{e.name}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{dateLong(e.event_date)} · {cityState(e.city, e.state)}</div>
                </div>
              </div>
            </div>
            <p className="ajuda" style={{ margin: 0 }}>Prévia aproximada: o desenho final da página do cliente pode mudar.</p>
          </section>

          <WeatherCard w={weather} />

          <section className="cartao" aria-labelledby="loc-titulo">
            <h2 id="loc-titulo">Local e chegada</h2>
            {links ? (
              <iframe className="mapa" title="Mapa do local" loading="lazy" referrerPolicy="no-referrer" src={links.embed} />
            ) : e.map_query ? (
              <iframe className="mapa" title="Mapa do local" loading="lazy" referrerPolicy="no-referrer"
                src={`https://www.google.com/maps?q=${encodeURIComponent(e.map_query)}&output=embed`} />
            ) : null}
            {links ? (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <a className="link" href={links.google} target="_blank" rel="noopener noreferrer">Abrir no Google Maps ↗</a>
                <a className="link" href={links.waze} target="_blank" rel="noopener noreferrer">Abrir no Waze ↗</a>
              </div>
            ) : (
              <p className="warn" style={{ margin: 0, fontSize: 13 }}>Sem ponto confirmado no mapa. <Link className="link" href={`/e/${e.short_id}/editar`}>Marcar o local</Link></p>
            )}
            <dl className="info" style={{ margin: 0 }}>
              <dt>Endereço</dt><dd>{[e.address, cityState(e.city, e.state)].filter(Boolean).join(" — ") || "—"}</dd>
              <dt>Horários</dt><dd>{chegada ? `Chegada ${chegada}` : "Chegada —"} · {hora ? `início ${hora}` : "início —"}{antes && ` (${antes})`}</dd>
              <dt>Ponto de encontro</dt><dd>{priv.meeting_point || "—"}</dd>
              <dt>Preço</dt>
              <dd>
                {brl(e.price_cents)} por foto{e.video_price_cents ? ` · ${brl(e.video_price_cents)} por vídeo` : " · vídeo sem preço próprio"}
                {e.discount_tiers?.length > 0 && (
                  <span className="muted" style={{ display: "block", fontSize: 12.5 }}>
                    {e.discount_tiers.map((t) => `${t.qty}+ itens: ${pct(t.pct)} de desconto`).join(" · ")}
                  </span>
                )}
              </dd>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function WeatherCard({ w }: { w: Weather }) {
  if (w.kind === "past") return null;
  const when = (iso: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .format(new Date(iso)).replace(/\./g, "");
  return (
    <section className="cartao" aria-labelledby="tempo-titulo">
      <h2 id="tempo-titulo">Previsão do tempo</h2>
      {w.kind === "forecast" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">{w.icon}</span>
            <div>
              <div style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }} className="num">{Number.isFinite(w.tempC) ? `${w.tempC}°C` : "—"}</div>
              <div>{w.label}</div>
            </div>
          </div>
          <dl className="info" style={{ margin: 0 }}>
            <dt>Para</dt><dd>{when(w.at)}{w.approximate && " · na região da cidade"}</dd>
            <dt>Chuva prevista</dt><dd>{w.rainMm == null ? "—" : `${String(w.rainMm).replace(".", ",")} mm`}</dd>
            <dt>Vento · umidade</dt><dd>{w.windKmh == null ? "—" : `${w.windKmh} km/h`} · {w.humidity == null ? "—" : `${w.humidity}%`}</dd>
          </dl>
        </>
      ) : w.kind === "later" ? (
        <p className="muted" style={{ margin: 0 }}>A previsão aparece a partir de {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${w.availableFrom}T12:00:00Z`))}, 9 dias antes do evento.</p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>{w.reason}</p>
      )}
      <p className="ajuda" style={{ margin: 0 }}>Fonte: MET Norway (yr.no). Previsões mudam; confira de novo perto do dia.</p>
    </section>
  );
}
