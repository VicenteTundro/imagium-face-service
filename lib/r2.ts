import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export const r2Configured = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });
  }
  return client;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, Body: body, ContentType: contentType }));
}

/** Link temporário (1 hora) para mostrar uma imagem no portal. */
export async function signedUrl(key: string | null | undefined): Promise<string | null> {
  if (!key || !r2Configured()) return null;
  try {
    return await getSignedUrl(r2(), new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }), { expiresIn: 3600 });
  } catch {
    return null;
  }
}

const SIGNATURES: { type: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: "image/webp", ext: "webp", test: (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
];

export type ImageSlot = "icon" | "cover" | "watermark";

const SLOT: Record<ImageSlot, { name: string; maxBytes: number; types: string[]; column: string }> = {
  icon: { name: "icone", maxBytes: 1_000_000, types: ["image/png", "image/jpeg", "image/webp"], column: "icon_key" },
  cover: { name: "capa", maxBytes: 2_500_000, types: ["image/jpeg", "image/png", "image/webp"], column: "cover_photo_key" },
  watermark: { name: "marca-dagua", maxBytes: 2_000_000, types: ["image/png"], column: "watermark_key" },
};

export const SLOT_LABEL: Record<ImageSlot, string> = { icon: "ícone", cover: "capa", watermark: "marca d’água" };

export type CheckedImage = { slot: ImageSlot; bytes: Uint8Array; type: string; ext: string };

/** Confere tamanho e conteúdo real do arquivo (não só a extensão). Lança erro com mensagem para o usuário. */
export async function checkImage(slot: ImageSlot, file: File): Promise<CheckedImage> {
  const cfg = SLOT[slot];
  if (file.size > cfg.maxBytes) throw new Error(`A imagem de ${SLOT_LABEL[slot]} passa de ${(cfg.maxBytes / 1_000_000).toLocaleString("pt-BR")} MB`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig || !cfg.types.includes(sig.type)) {
    throw new Error(slot === "watermark" ? "A marca d’água precisa ser um PNG" : `A imagem de ${SLOT_LABEL[slot]} precisa ser JPG, PNG ou WebP`);
  }
  return { slot, bytes, type: sig.type, ext: sig.ext };
}

/** Envia para <id interno do evento>/config/, seguindo o padrão das pastas de fotos. */
export async function storeImage(eventId: string, img: CheckedImage): Promise<{ column: string; key: string }> {
  const cfg = SLOT[img.slot];
  const key = `${eventId}/config/${cfg.name}-${Date.now()}.${img.ext}`;
  await putObject(key, img.bytes, img.type);
  return { column: cfg.column, key };
}
