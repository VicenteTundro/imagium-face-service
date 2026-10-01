"use client";
import { useActionState, useEffect, useMemo, useRef, useState, startTransition } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/event-input";
import type { Category } from "@/lib/types";
import { Mais, Xis } from "./icons";
import { LocationPicker } from "./LocationPicker";

export type FormInitial = {
  name: string; category: string; event_date: string; event_time: string; arrival_time: string;
  city: string; state: string; address: string; latitude: number | null; longitude: number | null; google_place_id: string;
  meeting_point: string; whatsapp_url: string;
  price: string; video_price: string; tiers: { qty: string; pct: string }[];
  organizer_name: string; organizer_email: string;
  organizer_pct: string; admin_pct: string; platform_pct: string;
  admin_is_photographer: boolean;
  images: { icon: string | null; cover: string | null; watermark: string | null };
};

export const EMPTY_INITIAL: FormInitial = {
  name: "", category: "", event_date: "", event_time: "", arrival_time: "", city: "", state: "", address: "",
  latitude: null, longitude: null, google_place_id: "",
  meeting_point: "", whatsapp_url: "", price: "", video_price: "", tiers: [{ qty: "", pct: "" }],
  organizer_name: "", organizer_email: "", organizer_pct: "0", admin_pct: "0", platform_pct: "8",
  admin_is_photographer: false, images: { icon: null, cover: null, watermark: null },
};

type Props = {
  mode: "create" | "edit";
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  categories: Category[];
  initial: FormInitial;
  adminName: string;
  shortId?: string;
  categoryLabel?: string;
  splitLocked?: boolean;
  /** Só o administrador da plataforma altera a comissão da plataforma. */
  canSetPlatformPct: boolean;
  maps: { search: boolean; browserKey: string | null };
};

const toNum = (s: string) => {
  const n = Number(String(s).replace("%", "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
};
const fmtPct = (n: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)}%`;

async function shrink(file: File, max: number, keepPng: boolean): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1_200_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const type = keepPng && file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.86));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, type === "image/png" ? ".png" : ".jpg"), { type });
  } catch {
    return file;
  }
}

export function EventForm({ mode, action, categories, initial, adminName, shortId, categoryLabel, splitLocked, canSetPlatformPct, maps }: Props) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const fe = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);

  const [tiers, setTiers] = useState(initial.tiers.length ? initial.tiers : [{ qty: "", pct: "" }]);
  const [invites, setInvites] = useState<{ name: string; email: string }[]>([]);
  const [orgPct, setOrgPct] = useState(initial.organizer_pct);
  const [admPct, setAdmPct] = useState(initial.admin_pct);
  const [platPct, setPlatPct] = useState(initial.platform_pct);
  const [adminPhoto, setAdminPhoto] = useState(initial.admin_is_photographer);
  const [previews, setPreviews] = useState(initial.images);

  const rest = useMemo(() => 100 - toNum(orgPct) - toNum(admPct) - toNum(platPct), [orgPct, admPct, platPct]);

  useEffect(() => {
    if (state?.error) document.getElementById("form-erro")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  function onImage(slot: "icon" | "cover" | "watermark", e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreviews((p) => ({ ...p, [slot]: f ? URL.createObjectURL(f) : initial.images[slot] }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tiers", JSON.stringify(tiers));
    fd.set("photographers", JSON.stringify(invites));
    const icon = fd.get("icon");
    if (icon instanceof File && icon.size) fd.set("icon", await shrink(icon, 512, true));
    const cover = fd.get("cover");
    if (cover instanceof File && cover.size) fd.set("cover", await shrink(cover, 2000, false));
    startTransition(() => dispatch(fd));
  }

  const err = (k: string) => (fe[k] ? <span className="erro-campo" id={`${k}-erro`}>{fe[k]}</span> : null);
  const inv = (k: string) => (fe[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-erro` } : {});

  return (
    <form ref={formRef} onSubmit={onSubmit} className="form" noValidate>
      {state?.error && <div className="erro" id="form-erro" role="alert">{state.error}</div>}

      <section className="secao" style={{ borderTop: "none", paddingTop: 0 }}>
        <h2>Dados do evento</h2>
        <p>
          {mode === "create"
            ? "O ID é gerado ao salvar: ano, mês, categoria e número (ex.: 2610SH0001). Ele não muda depois."
            : `ID ${shortId}. O ID e a categoria não mudam depois de criados.`}
        </p>
        <div className="campos">
          <div className="campo-bloco c4">
            <label htmlFor="name">Nome do evento</label>
            <input id="name" name="name" className="campo" autoComplete="off" defaultValue={initial.name} placeholder="Ex.: Corinthians x Chapecoense" maxLength={120} {...inv("name")} />
            {err("name")}
          </div>
          <div className="campo-bloco c2">
            <label htmlFor="category">Categoria</label>
            {mode === "create" ? (
              <select id="category" name="category" className="campo" defaultValue={initial.category} {...inv("category")}>
                <option value="" disabled>Escolha…</option>
                {categories.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
              </select>
            ) : (
              <input id="category" className="campo" value={categoryLabel ?? ""} disabled readOnly />
            )}
            {err("category")}
          </div>
          <div className="campo-bloco c2">
            <label htmlFor="event_date">Data</label>
            <input id="event_date" name="event_date" type="date" className="campo" defaultValue={initial.event_date} {...inv("event_date")} />
            {mode === "edit" && <span className="ajuda">Mudar a data não muda o ID.</span>}
            {err("event_date")}
          </div>
          <div className="campo-bloco c2">
            <label htmlFor="event_time">Horário do evento</label>
            <input id="event_time" name="event_time" type="time" className="campo" defaultValue={initial.event_time} {...inv("event_time")} />
            {err("event_time")}
          </div>
          <div className="campo-bloco c2">
            <label htmlFor="arrival_time">Horário sugerido para chegada</label>
            <input id="arrival_time" name="arrival_time" type="time" className="campo" defaultValue={initial.arrival_time} {...inv("arrival_time")} />
            {err("arrival_time")}
          </div>
          <LeadNote />
        </div>
      </section>

      <section className="secao">
        <h2>Local</h2>
        <p>O fotógrafo recebe o ponto exato do mapa, com links para o Google Maps e o Waze.</p>
        <LocationPicker
          initial={{ address: initial.address, city: initial.city, state: initial.state, latitude: initial.latitude, longitude: initial.longitude, placeId: initial.google_place_id }}
          searchEnabled={maps.search} browserKey={maps.browserKey} errors={fe} />
        <div className="campos">
          <div className="campo-bloco c6">
            <label htmlFor="meeting_point">Ponto de encontro / instruções de chegada (opcional)</label>
            <input id="meeting_point" name="meeting_point" className="campo" autoComplete="off" defaultValue={initial.meeting_point} placeholder="Ex.: Entrada pelo Portão 3, credenciamento na sala de imprensa" maxLength={300} />
            <span className="ajuda">Aparece para o fotógrafo junto com o horário sugerido para chegada.</span>
          </div>
          <div className="campo-bloco c6">
            <label htmlFor="whatsapp_url">Link do grupo de WhatsApp (opcional)</label>
            <input id="whatsapp_url" name="whatsapp_url" type="url" className="campo" autoComplete="off" defaultValue={initial.whatsapp_url} placeholder="https://chat.whatsapp.com/…" {...inv("whatsapp_url")} />
            <span className="ajuda">Crie o grupo no WhatsApp, copie o link de convite e cole aqui. Os fotógrafos veem o botão “Entrar no grupo” na tela do evento.</span>
            {err("whatsapp_url")}
          </div>
        </div>
      </section>

      <section className="secao">
        <h2>Imagens</h2>
        <div className="campos">
          <ImageDrop slot="icon" label="Ícone (tela inicial)" hint="Arraste uma imagem ou clique para enviar" preview={previews.icon} onChange={onImage} error={fe.icon} />
          <ImageDrop slot="cover" label="Capa (cabeçalho do evento)" hint="Arraste uma imagem ou clique para enviar" preview={previews.cover} onChange={onImage} error={fe.cover} />
          <ImageDrop slot="watermark" label="Marca d’água (opcional — usa a padrão da plataforma se ficar vazia)" hint="Arraste um PNG com transparência ou clique para enviar" preview={previews.watermark} onChange={onImage} error={fe.watermark} png />
        </div>
      </section>

      <section className="secao">
        <h2>Preço e descontos</h2>
        <div className="campos">
          <div className="campo-bloco c2">
            <label htmlFor="price">Preço por foto</label>
            <input id="price" name="price" className="campo" inputMode="decimal" defaultValue={initial.price} placeholder="R$ 12,90" {...inv("price")} />
            {err("price")}
          </div>
          <div className="campo-bloco c2">
            <label htmlFor="video_price">Preço por vídeo (opcional)</label>
            <input id="video_price" name="video_price" className="campo" inputMode="decimal" defaultValue={initial.video_price} placeholder="R$ 25,00" {...inv("video_price")} />
            {err("video_price")}
          </div>
          <div className="campo-bloco c6">
            <span className="campo-rotulo">Descontos por quantidade</span>
            <span className="ajuda">A partir de quantas fotos o desconto vale, e de quanto ele é. Ex.: 5 fotos ou mais → 5% de desconto.</span>
            <div className="faixas">
              {tiers.length > 0 && (
                <div className="cab-campos col-cab" aria-hidden="true"><span>Quantidade mínima</span><span>Desconto (%)</span><span /></div>
              )}
              {tiers.map((t, i) => (
                <div className="faixa" key={i}>
                  <input className="campo" inputMode="numeric" aria-label={`Quantidade mínima de fotos, faixa ${i + 1}`} placeholder="5" autoComplete="off"
                    value={t.qty} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/\D/g, "") } : x)))} />
                  <input className="campo" inputMode="decimal" aria-label={`Desconto da faixa ${i + 1}, em porcentagem`} placeholder="5" autoComplete="off"
                    value={t.pct} onChange={(e) => setTiers(tiers.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
                  <button type="button" className="btn-texto" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}>remover</button>
                </div>
              ))}
              <button type="button" className="btn-sec" style={{ alignSelf: "flex-start" }} onClick={() => setTiers([...tiers, { qty: "", pct: "" }])}><Mais />Adicionar faixa</button>
            </div>
            {err("tiers")}
          </div>
        </div>
      </section>

      <section className="secao">
        <h2>Divisão do valor bruto</h2>
        <p>Todas as porcentagens incidem sobre o valor bruto da venda.{splitLocked && " O evento já tem vendas aprovadas, então a divisão não pode mais mudar."}</p>
        <div className="tabela-div">
          <span className="col-cab">Parte</span><span className="col-cab">Nome</span><span className="col-cab">E-mail (acesso ao faturamento)</span><span className="col-cab">%</span>

          <span style={{ fontWeight: 600 }}>Organizador</span>
          <input name="organizer_name" className="campo" autoComplete="off" aria-label="Nome do organizador" defaultValue={initial.organizer_name} placeholder="Ex.: Grand Plaza Shopping" />
          <input name="organizer_email" type="email" className="campo" autoComplete="off" aria-label="E-mail do organizador" defaultValue={initial.organizer_email} placeholder="organizador@email.com" {...inv("organizer_email")} />
          <input name="organizer_pct" className="campo num" inputMode="decimal" aria-label="Comissão do organizador em porcentagem" value={orgPct} onChange={(e) => setOrgPct(e.target.value)} disabled={splitLocked} />

          <span style={{ fontWeight: 600 }}>Administrador</span>
          <input className="campo" aria-label="Nome do administrador" value={adminName} disabled readOnly />
          {mode === "create" ? (
            <label className="check">
              <input type="checkbox" name="admin_is_photographer" checked={adminPhoto} onChange={(e) => setAdminPhoto(e.target.checked)} />
              Também sou fotógrafo neste evento
            </label>
          ) : <span className="ajuda">{initial.admin_is_photographer ? "Também fotografa neste evento" : ""}</span>}
          <input name="admin_pct" className="campo num" inputMode="decimal" aria-label="Comissão do administrador em porcentagem" value={admPct} onChange={(e) => setAdmPct(e.target.value)} disabled={splitLocked} />

          <span style={{ fontWeight: 600 }}>Plataforma</span>
          <input className="campo" aria-label="Plataforma" value="Imagium Foto" disabled readOnly />
          <span />
          <input name="platform_pct" className="campo num" inputMode="decimal" aria-label="Comissão da plataforma em porcentagem"
            title={canSetPlatformPct ? undefined : "Definida pela plataforma"} value={platPct} onChange={(e) => setPlatPct(e.target.value)}
            disabled={splitLocked || !canSetPlatformPct} />

          <span style={{ fontWeight: 600 }}>Fotógrafos</span>
          <span className="muted" style={{ gridColumn: "span 2" }}>O restante do valor bruto, dividido pelas fotos vendidas de cada um.</span>
          <span className={`num ${rest < 0 ? "neg" : ""}`} style={{ fontSize: 20, fontWeight: 700, paddingLeft: 14 }}>{fmtPct(rest)}</span>
        </div>
        {splitLocked && (
          <>
            <input type="hidden" name="organizer_pct" value={orgPct} />
            <input type="hidden" name="admin_pct" value={admPct} />
          </>
        )}
        {(splitLocked || !canSetPlatformPct) && <input type="hidden" name="platform_pct" value={platPct} />}
        {!canSetPlatformPct && <span className="ajuda">A comissão da plataforma é definida pela Imagium Foto.</span>}
        {err("organizer_email")}
        {err("split")}
        {rest < 0 && !fe.split && <span className="erro-campo">A soma passa de 100%.</span>}
      </section>

      <section className="secao">
        <h2>{mode === "create" ? "Fotógrafos convidados" : "Convidar mais fotógrafos"}</h2>
        <p>Cada foto enviada é atribuída a um destes fotógrafos. O convite fica pendente até a pessoa aceitar no painel dela.</p>
        {mode === "create" && adminPhoto && (
          <div className="campos">
            <div className="campo-bloco c3">
              <label htmlFor="admin_photographer_name">Seu nome como fotógrafo neste evento</label>
              <input id="admin_photographer_name" name="admin_photographer_name" className="campo" autoComplete="off" placeholder={`Ex.: ${adminName} Fotografia`} />
              <span className="ajuda">Convite já aceito, porque é você.</span>
            </div>
          </div>
        )}
        <div className="faixas">
          {invites.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", gap: 12 }}>
              <input className="campo" autoComplete="off" aria-label={`Nome ou marca do fotógrafo ${i + 1}`} placeholder="Nome ou marca (ex.: Coletivo Flash)" value={p.name}
                onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="campo" type="email" autoComplete="off" aria-label={`E-mail do fotógrafo ${i + 1}`} placeholder="fotografo@email.com" value={p.email}
                onChange={(e) => setInvites(invites.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
              <button type="button" className="btn-texto" aria-label={`Tirar o fotógrafo ${i + 1} da lista`} onClick={() => setInvites(invites.filter((_, j) => j !== i))}><Xis /></button>
            </div>
          ))}
          <button type="button" className="btn-sec" style={{ alignSelf: "flex-start" }} onClick={() => setInvites([...invites, { name: "", email: "" }])}><Mais />Convidar fotógrafo</button>
        </div>
        {err("photographers")}
      </section>

      <div className="acoes-form">
        <Link href={mode === "create" ? "/eventos" : `/e/${shortId}`} className="btn-sec">Cancelar</Link>
        <button className="btn-primario" disabled={pending}>
          {pending ? "Salvando…" : mode === "create" ? "Criar evento" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function LeadNote() {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const a = document.getElementById("arrival_time") as HTMLInputElement | null;
    const b = document.getElementById("event_time") as HTMLInputElement | null;
    const upd = () => {
      if (!a?.value || !b?.value) return setTxt("");
      const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
      const d = m(b.value) - m(a.value);
      if (d <= 0) return setTxt("A chegada precisa ser antes do início.");
      const h = Math.floor(d / 60), min = d % 60;
      setTxt(`O fotógrafo verá: chegada ${a.value} · início ${b.value} (${h ? `${h}h` : ""}${h && min ? String(min).padStart(2, "0") : min ? `${min} min` : ""} antes).`);
    };
    upd();
    a?.addEventListener("input", upd); b?.addEventListener("input", upd);
    return () => { a?.removeEventListener("input", upd); b?.removeEventListener("input", upd); };
  }, []);
  return (
    <p className="ajuda c6" style={{ margin: "-8px 0 0" }} aria-live="polite">
      {txt || "Informe o horário em que o fotógrafo deve chegar. A antecedência varia por evento e aparece sempre junto do horário de início."}
    </p>
  );
}

function ImageDrop({ slot, label, hint, preview, onChange, error, png }: {
  slot: "icon" | "cover" | "watermark"; label: string; hint: string; preview: string | null;
  onChange: (slot: "icon" | "cover" | "watermark", e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; png?: boolean;
}) {
  return (
    <div className="campo-bloco c2">
      <span className="campo-rotulo" id={`${slot}-rotulo`}>{label}</span>
      <div className={`drop ${png && preview ? "xadrez" : ""}`}>
        {preview ? <img src={preview} alt="" /> : <span>{hint}</span>}
        <input type="file" name={slot} aria-labelledby={`${slot}-rotulo`} accept={png ? "image/png" : "image/png,image/jpeg,image/webp"} onChange={(e) => onChange(slot, e)} />
      </div>
      {preview && <span className="ajuda">Clique na imagem para trocar.</span>}
      {error && <span className="erro-campo">{error}</span>}
    </div>
  );
}
