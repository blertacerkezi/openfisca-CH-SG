/** Modellrechnung: was von 100 Franken Mehrlohn bleibt.
 *  Kein Gesuchsentscheid. Stunden und Tageslohn sind Annahmen. */

export const TAGESLOHN = 327;
export const STUNDEN_KITA = 6;
export const STUNDEN_SCHULE = 3;
const MONAT = 52 / 12;

export type HebelWahl = {
  band: number | null;
  jeKind: number | null;
  abzugAb: number | null;
  kitaSatz: number | null;
  schuleSatz: number | null;
  pensumPaar: number | null;
  pensumAllein: number | null;
};

export const GESETZ = {
  band: 154_000,
  abzugAb: 40_000,
  kitaSatz: 7.5,
  schuleSatz: 5.5,
  pensumPaar: 120,
  pensumAllein: 20,
  jeKind: 0,
} as const;

export type Modell = {
  erwachsene: 1 | 2;
  kinder: number;
  schulkinder: number;
  bisher: number;
  neu: number;
  partnerPensum: number;
  pensum1: number;
  band: number;
  abzugAb: number;
  kitaSatz: number;
  schuleSatz: number;
  pensumPaar: number;
  pensumAllein: number;
  einkommen: number;
  tarif: number;
  hebel: HebelWahl;
};

export type Variante = {
  faktor: number;
  beitrag: number;
  bleibt: number;
  quote: number;
  band: number;
  abzugAb: number;
  anspruch: boolean;
  pensumSoll: number;
};

export type Wirkung = {
  schrittTage: number;
  mehrlohn: number;
  kosten: number;
  stunden: number;
  anspruch: boolean;
  pensumIst: number;
  pensumSoll: number;
  ohne: Variante;
  gesetz: Variante;
  hebel: Variante;
  hebelNamen: string[];
  einkommen25: Variante;
  extraBetreuung: number;
  extraQuote: number;
};

function round(n: number) {
  return Math.round(n);
}

function clampFaktor(einkommen: number, band: number, abzugAb: number) {
  if (band <= abzugAb) return 0;
  return Math.min(1, Math.max(0, (band - einkommen) / (band - abzugAb)));
}

function quoteOf(mehrlohn: number, bleibt: number) {
  if (mehrlohn <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, (bleibt / mehrlohn) * 100)));
}

function variante(
  m: Modell,
  mehrlohn: number,
  kosten: number,
  useHebel: boolean,
  einkommen = m.einkommen,
): Variante {
  const band0 = useHebel && m.hebel.band != null ? m.hebel.band : m.band;
  const jeKind = useHebel && m.hebel.jeKind != null ? m.hebel.jeKind : 0;
  const abzugAb = useHebel && m.hebel.abzugAb != null ? m.hebel.abzugAb : m.abzugAb;
  const kitaSatz = useHebel && m.hebel.kitaSatz != null ? m.hebel.kitaSatz : m.kitaSatz;
  const schuleSatz = useHebel && m.hebel.schuleSatz != null ? m.hebel.schuleSatz : m.schuleSatz;
  const band = band0 + jeKind * m.kinder;
  const faktor = clampFaktor(einkommen, band, abzugAb);
  const tage = Math.max(0, m.neu - m.bisher) * MONAT;
  const kitaKinder = Math.max(0, m.kinder - m.schulkinder);
  const roh =
    (kitaKinder * STUNDEN_KITA * kitaSatz + m.schulkinder * STUNDEN_SCHULE * schuleSatz) *
    tage *
    faktor;
  const pensumSoll = sollVon(m, useHebel);
  const anspruch = pensumIst(m) + 1e-9 >= pensumSoll;
  const beitrag = anspruch ? Math.min(kosten, round(roh)) : 0;
  const bleibt = mehrlohn - kosten + beitrag;
  return { faktor, beitrag, bleibt, quote: quoteOf(mehrlohn, bleibt), band, abzugAb, anspruch, pensumSoll };
}

function sollVon(m: Modell, useHebel: boolean) {
  if (m.erwachsene === 2) {
    return useHebel && m.hebel.pensumPaar != null ? m.hebel.pensumPaar : m.pensumPaar;
  }
  return useHebel && m.hebel.pensumAllein != null ? m.hebel.pensumAllein : m.pensumAllein;
}

function pensumIst(m: Modell) {
  const eigene = m.pensum1;
  const partner = m.erwachsene === 2 ? m.partnerPensum : 0;
  return eigene + partner;
}

function hebelNamen(m: Modell) {
  const names: string[] = [];
  if (m.hebel.band != null && m.hebel.band !== m.band) names.push("Einkommensband");
  if (m.hebel.jeKind != null && m.hebel.jeKind > 0) names.push("Zuschlag je Kind");
  if (m.hebel.abzugAb != null && m.hebel.abzugAb !== m.abzugAb) names.push("Abzug beginnt später");
  if (m.hebel.kitaSatz != null && m.hebel.kitaSatz !== m.kitaSatz) names.push("Kita-Ansatz");
  if (m.hebel.schuleSatz != null && m.hebel.schuleSatz !== m.schuleSatz) names.push("Schulkind-Ansatz");
  if (m.hebel.pensumPaar != null && m.hebel.pensumPaar !== m.pensumPaar) names.push("Pensum Paar");
  if (m.hebel.pensumAllein != null && m.hebel.pensumAllein !== m.pensumAllein) names.push("Pensum Allein");
  return names;
}

export function wirken(m: Modell): Wirkung {
  const schrittTage = Math.max(0, m.neu - m.bisher);
  const monatTage = schrittTage * MONAT;
  const kitaKinder = Math.max(0, m.kinder - m.schulkinder);
  const stunden = (kitaKinder * STUNDEN_KITA + m.schulkinder * STUNDEN_SCHULE) * monatTage;
  const mehrlohn = round(monatTage * TAGESLOHN);
  const kosten = round(stunden * m.tarif);
  const base = {
    ...m,
    hebel: {
      band: null,
      jeKind: null,
      abzugAb: null,
      kitaSatz: null,
      schuleSatz: null,
      pensumPaar: null,
      pensumAllein: null,
    },
  };
  const ohne = variante(base, mehrlohn, kosten, false);
  ohne.beitrag = 0;
  ohne.bleibt = mehrlohn - kosten;
  ohne.quote = quoteOf(mehrlohn, ohne.bleibt);
  const gesetz = variante(base, mehrlohn, kosten, false);
  const hebel = variante(m, mehrlohn, kosten, true);
  const einkommen25 = variante(m, mehrlohn, kosten, true, m.einkommen * 1.25);
  const extraStunden = (kitaKinder * STUNDEN_KITA + m.schulkinder * STUNDEN_SCHULE) * 2 * MONAT;
  const extraBetreuung = round(extraStunden * m.tarif);
  const extraQuote = quoteOf(mehrlohn, hebel.bleibt - extraBetreuung);
  return {
    schrittTage,
    mehrlohn,
    kosten,
    stunden: round(stunden),
    anspruch: gesetz.anspruch,
    pensumIst: pensumIst(m),
    pensumSoll: gesetz.pensumSoll,
    ohne,
    gesetz,
    hebel,
    hebelNamen: hebelNamen(m),
    einkommen25,
    extraBetreuung,
    extraQuote,
  };
}
