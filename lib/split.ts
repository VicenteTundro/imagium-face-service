/**
 * Divisão do valor bruto em centavos, sem sobra nem falta:
 * cada parte recebe o arredondamento para baixo e os centavos restantes
 * vão para as maiores frações (método do maior resto).
 */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const base = raw.map(Math.floor);
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - base[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) base[order[k % order.length].i]++;
  return base;
}

export type SplitInput = {
  grossCents: number;
  organizerPct: number;
  adminPct: number;
  platformPct: number;
  /**
   * Vendas por fotógrafo (id null = itens sem fotógrafo atribuído).
   * weight = valor de tabela do que ele vendeu (fotos × preço da foto + vídeos × preço do vídeo).
   */
  photographers: { id: string | null; name: string; photosSold: number; videosSold: number; weight: number }[];
};

/** Peso de cada fotógrafo: valor de tabela do que vendeu. Vídeo sem preço próprio vale como foto. */
export function salesWeight(photosSold: number, videosSold: number, photoPrice: number, videoPrice: number | null) {
  return photosSold * photoPrice + videosSold * (videoPrice ?? photoPrice);
}

export type SplitResult = {
  photographersPct: number;
  photographersCents: number;
  organizerCents: number;
  adminCents: number;
  platformCents: number;
  perPhotographer: { id: string | null; name: string; photosSold: number; videosSold: number; weight: number; cents: number }[];
};

const bp = (p: number) => Math.round(p * 100); // porcentagem em pontos-base, sem erro de ponto flutuante

export function splitGross(input: SplitInput): SplitResult {
  const photographersBp = 10_000 - bp(input.organizerPct) - bp(input.adminPct) - bp(input.platformPct);
  if (photographersBp < 0) throw new Error("As porcentagens passam de 100%");
  const [organizerCents, adminCents, platformCents, photographersCents] = allocate(input.grossCents, [
    bp(input.organizerPct), bp(input.adminPct), bp(input.platformPct), photographersBp,
  ]);

  const sellers = input.photographers.filter((p) => p.weight > 0);
  const shares = allocate(photographersCents, sellers.map((p) => p.weight));
  const perPhotographer = sellers
    .map((p, i) => ({ ...p, cents: shares[i] }))
    .sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : b.cents - a.cents));

  return {
    photographersPct: photographersBp / 100,
    photographersCents, organizerCents, adminCents, platformCents, perPhotographer,
  };
}
