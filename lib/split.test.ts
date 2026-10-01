import { test } from "node:test";
import assert from "node:assert/strict";
import { allocate, splitGross, salesWeight } from "./split.ts";
import { parseMoney, parsePct, leadTime } from "./format.ts";

test("divisão fecha exatamente o bruto", () => {
  for (const gross of [0, 1, 7, 89050, 123457, 999999]) {
    const r = splitGross({
      grossCents: gross, organizerPct: 10, adminPct: 6, platformPct: 8,
      photographers: [
        { id: "a", name: "A", photosSold: 50, videosSold: 2, weight: salesWeight(50, 2, 1290, 2500) },
        { id: "b", name: "B", photosSold: 30, videosSold: 0, weight: salesWeight(30, 0, 1290, 2500) },
        { id: null, name: "?", photosSold: 3, videosSold: 0, weight: salesWeight(3, 0, 1290, 2500) },
      ],
    });
    const total = r.organizerCents + r.adminCents + r.platformCents + r.photographersCents;
    assert.equal(total, gross);
    assert.equal(r.perPhotographer.reduce((a, p) => a + p.cents, 0), gross > 0 ? r.photographersCents : 0);
  }
});

test("exemplo do desenho: R$ 890,50", () => {
  const r = splitGross({
    grossCents: 89050, organizerPct: 10, adminPct: 6, platformPct: 8,
    photographers: [
      { id: "v", name: "V", photosSold: 50, videosSold: 0, weight: salesWeight(50, 0, 1290, null) },
      { id: "c", name: "C", photosSold: 30, videosSold: 0, weight: salesWeight(30, 0, 1290, null) },
    ],
  });
  assert.equal(r.photographersPct, 76);
  assert.equal(r.organizerCents, 8905);
  assert.equal(r.platformCents, 7124);
  assert.equal(r.photographersCents, 67678);
  assert.deepEqual(r.perPhotographer.map((p) => p.cents), [42299, 25379]);
});

test("porcentagens decimais", () => {
  const r = splitGross({ grossCents: 10000, organizerPct: 7.5, adminPct: 0, platformPct: 8, photographers: [] });
  assert.equal(r.organizerCents, 750);
  assert.equal(r.photographersPct, 84.5);
});

test("vídeo pesa pelo preço dele", () => {
  const r = splitGross({
    grossCents: 10000, organizerPct: 0, adminPct: 0, platformPct: 0,
    photographers: [
      { id: "f", name: "Só fotos", photosSold: 2, videosSold: 0, weight: salesWeight(2, 0, 1000, 3000) },
      { id: "v", name: "Só vídeo", photosSold: 0, videosSold: 1, weight: salesWeight(0, 1, 1000, 3000) },
    ],
  });
  const byId = Object.fromEntries(r.perPhotographer.map((p) => [p.id, p.cents]));
  assert.equal(byId.f, 4000);
  assert.equal(byId.v, 6000);
});

test("maior resto", () => assert.deepEqual(allocate(10, [1, 1, 1]), [4, 3, 3]));

test("leitura de valores", () => {
  assert.equal(parseMoney("R$ 12,90"), 1290);
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("12.90"), 1290);
  assert.equal(parseMoney(""), null);
  assert.equal(parsePct("7,5%"), 7.5);
  assert.equal(parsePct("10%"), 10);
});

test("antecedência", () => {
  assert.equal(leadTime("14:30", "16:00"), "1h30 antes");
  assert.equal(leadTime("15:00", "16:00"), "1h antes");
  assert.equal(leadTime("15:40", "16:00"), "20 min antes");
  assert.equal(leadTime("16:00", "16:00"), "");
});
