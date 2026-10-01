import Link from "next/link";
import { requireProfile, canCreateEvents } from "@/lib/auth";
import { listEvents, cleanSearch, type ListedEvent } from "@/lib/events";
import { brl, dateBand, dateShort, hhmm, int, leadTime, todayISO } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";
import { RoleTag } from "@/components/RoleTag";
import { Camera, Mais, Pessoas, Pino, Relogio } from "@/components/icons";

const Video = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ic-cam" style={{ flexShrink: 0 }}>
    <rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" />
  </svg>
);

export const metadata = { title: "Eventos" };

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const profile = await requireProfile();
  const q = cleanSearch((await searchParams).q ?? "");
  const events = await listEvents(profile, q);
  const today = todayISO();

  const future = events.filter((e) => e.event_date > today);
  const todays = events.filter((e) => e.event_date === today);
  const past = events.filter((e) => e.event_date < today);

  return (
    <>

      <div className="lista-titulo">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h2>{q ? `Busca: “${q}”` : "Todos os eventos"}</h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {int(events.length)} {events.length === 1 ? "evento" : "eventos"} · {int(todays.length)} hoje · {int(future.length)} por vir
          </span>
          {q && <Link href="/eventos" className="link" style={{ fontSize: 12.5 }}>Limpar busca</Link>}
        </div>
        <span className="muted" style={{ fontSize: 12.5 }}>Ordenados por data e hora, do mais distante ao mais antigo</span>
      </div>

      {events.length === 0 ? (
        <div className="vazio">
          {q ? (
            <p>Nenhum evento encontrado para “{q}”. Busque pelo nome, pela cidade ou pelo ID (ex.: 2610SH0001).</p>
          ) : canCreateEvents(profile) ? (
            <>
              <p>Nenhum evento cadastrado ainda.</p>
              <Link className="btn-primario" href="/eventos/novo"><Mais />Cadastrar o primeiro evento</Link>
            </>
          ) : (
            <p>Você ainda não participa de nenhum evento. Quando um administrador convidar você, o evento aparece aqui.</p>
          )}
        </div>
      ) : (
        <div className="lista">
          <div className="lista-int">
            <div className="grade cab-grade col-cab">
              <span>ID</span><span>Chegada · início</span><span>Evento</span><span>Cidade · local</span>
              <span>Fotógrafos</span><span>Fotos</span><span>Vídeos</span><span style={{ textAlign: "right" }}>Faturamento</span><span style={{ textAlign: "right" }}>Situação</span>
            </div>
            {future.length > 0 && (
              <div className="bloco futuro"><div className="tira" aria-hidden="true" /><div className="linhas">{future.map((e) => <Linha key={e.id} e={e} />)}</div></div>
            )}
            <div className={`faixa-hoje ${todays.length ? "" : "vazia"}`}>
              <span className="rotulo">HOJE · {dateBand(today)}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {todays.length === 0 ? "nenhum evento hoje" : todays.length === 1 ? "1 evento hoje" : `${todays.length} eventos hoje`}
              </span>
              <span style={{ flex: 1 }} />
              <span className="muted" style={{ fontSize: 12 }}>{int(future.length)} por vir</span>
              <span className="muted" style={{ fontSize: 12 }}>{int(past.length)} já realizados</span>
            </div>
            {todays.length > 0 && (
              <div className="bloco hoje"><div className="tira" aria-hidden="true" /><div className="linhas">{todays.map((e) => <Linha key={e.id} e={e} />)}</div></div>
            )}
            {past.length > 0 && (
              <div className="bloco"><div className="tira" aria-hidden="true" /><div className="linhas">{past.map((e) => <Linha key={e.id} e={e} />)}</div></div>
            )}
          </div>
        </div>
      )}

      <Legenda />
    </>
  );
}

function Linha({ e }: { e: ListedEvent }) {
  const chegada = hhmm(e.event_private?.arrival_time);
  const hora = hhmm(e.event_time);
  const s = e.stats;
  const semVenda = !s || s.gross_cents === 0;
  const cells = (
    <>
      <span className="id">{e.short_id}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="sub num">{dateShort(e.event_date)}</span>
        <span className="hora">{chegada ?? "—"}<span className="sub" style={{ fontWeight: 500, letterSpacing: 0 }}> chegada</span></span>
        <span className="sub num">{hora ? `início ${hora}` : "início —"}{leadTime(chegada, hora) && ` · ${leadTime(chegada, hora)}`}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span className="evento">{e.name}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }} className="sub">
          <span>{e.event_categories?.name}</span>
          <RoleTag roles={e.myRoles} />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 500 }}><Pino />{[e.city, e.state].filter(Boolean).join(", ") || "—"}</span>
        <span className="sub" style={{ paddingLeft: 22, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.address}</span>
      </div>
      <span className="qtd"><Pessoas />{s?.photographer_count ?? 0}</span>
      <span className={`qtd ${s?.photo_count ? "" : "muted"}`}><Camera />{s?.photo_count ? int(s.photo_count) : "—"}</span>
      <span className={`qtd ${s?.video_count ? "" : "muted"}`}><Video />{s?.video_count ? int(s.video_count) : "—"}</span>
      <span className={`num ${semVenda ? "muted" : ""}`} style={{ textAlign: "right", fontSize: 15 }}>{semVenda ? "—" : brl(s!.gross_cents)}</span>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><StatusPill status={e.status} /></div>
    </>
  );
  return e.canManage ? (
    <Link href={`/e/${e.short_id}`} className="linha grade" aria-label={`Abrir painel de ${e.name} (${e.short_id})`}>{cells}</Link>
  ) : (
    <div className="linha grade" title="O painel do fotógrafo chega na próxima etapa"><>{cells}</></div>
  );
}

function Legenda() {
  return (
    <div style={{ margin: "26px 48px 48px", display: "flex", flexDirection: "column", gap: 14, fontSize: 12.5 }} className="muted">
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 14px" }}>
        <span className="col-cab" style={{ width: 118 }}>Situação</span>
        <StatusPill status="cadastrado" /><StatusPill status="aberto" /><StatusPill status="completo" /><StatusPill status="vendendo" />
        <span aria-hidden="true" style={{ width: 1, height: 18, background: "var(--line2)", margin: "0 4px" }} />
        <span>fora do fluxo</span>
        <StatusPill status="pausado" /><StatusPill status="bloqueado" /><StatusPill status="cancelado" />
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px 14px" }}>
        <span className="col-cab" style={{ width: 118 }}>Seu papel</span>
        <RoleTag roles={["admin"]} /><span>só administra</span>
        <span aria-hidden="true" style={{ width: 1, height: 18, background: "var(--line2)", margin: "0 4px" }} />
        <RoleTag roles={["admin", "photographer"]} /><span>administra e fotografa</span>
        <span aria-hidden="true" style={{ width: 1, height: 18, background: "var(--line2)", margin: "0 4px" }} />
        <span>sem marca: só fotografa</span>
        <span style={{ marginLeft: 12, display: "inline-flex", alignItems: "center", gap: 6 }}><Relogio />a hora grande é a chegada sugerida; abaixo, o início do evento</span>
      </div>
    </div>
  );
}
