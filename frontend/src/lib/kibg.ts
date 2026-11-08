
export const REF = new Date(2026, 10, 1);
export const TAX_YEAR = 2024;
export const MIN_INCOME = 40_000;
export const MAX_INCOME = 154_000;
export const CHILD_DEDUCTION = 4_000;
export const PENSUM_ALONE = 20;
export const PENSUM_TOGETHER = 120;

export type CareType = "kita" | "tagesfamilie" | "schulergaenzend";
export type TaxPath =
  | "ordentlich"
  | "quellen"
  | "nicht-rechtskraeftig"
  | "keine-veranlagung";

export type DayCare = {
  hours: number;
  type: CareType;
  obhut: boolean;
  /** Elternferien: Das Kind wird zu Hause betreut. */
  elternferien?: boolean;
};

export type ChildInput = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  birth: string;
  einschulung: string;
  primarEnde: string;
  kindlicheIndikation: boolean;
  days: Record<string, DayCare>;
};

export type IncomeInput = {
  reineinkommen: number;
  vermoegen: number;
  saeule3a: number;
  bvg: number;
  liegenschaft: number;
  verlust: number;
  bruttolohnEinfach: number;
  zuwendungen: number;
  eigenmietwert: number;
  beteiligungGeschaeft: number;
  beteiligungPrivat: number;
  bruttoQuellen: number;
  grenzgaenger: boolean;
  kaufkraft: number;
  aktuell: number;
  aktuellBekannt: boolean;
};

export type HouseholdInput = {
  wohnsitz: boolean | null;
  zusammen: "gemeinsam" | "getrennt" | null;
  erwerb: "beide" | "eine" | null;
  getrenntArt: "ehe" | "konkubinat" | "alleine" | null;
  konkubinatJahre: number;
  partnerErziehungsberechtigt: boolean;
  pensum1: number;
  pensum2: number;
  integration1: boolean;
  integration2: boolean;
  belastung1: boolean;
  belastung2: boolean;
  begruendung: string;
  nachweisLohn: boolean;
  nachweisKonto: boolean;
  nachweisAndere: boolean;
  nachweisText: string;
  bestaetigung: boolean;
  taxPath: TaxPath | null;
  income1: IncomeInput;
  income2: IncomeInput;
};

export const emptyIncome = (): IncomeInput => ({
  reineinkommen: 0,
  vermoegen: 0,
  saeule3a: 0,
  bvg: 0,
  liegenschaft: 0,
  verlust: 0,
  bruttolohnEinfach: 0,
  zuwendungen: 0,
  eigenmietwert: 0,
  beteiligungGeschaeft: 0,
  beteiligungPrivat: 0,
  bruttoQuellen: 0,
  grenzgaenger: false,
  kaufkraft: 1,
  aktuell: 0,
  aktuellBekannt: false,
});

export function ageMonths(birth: string, ref = REF) {
  if (!birth) return 0;
  const b = new Date(birth + "T00:00:00");
  if (Number.isNaN(b.getTime())) return 0;
  let months =
    (ref.getFullYear() - b.getFullYear()) * 12 +
    (ref.getMonth() - b.getMonth());
  if (ref.getDate() < b.getDate()) months -= 1;
  return months;
}

/**
 * Ein Kind unter 3 vollendeten Monaten wird
 * im aktuellen Rechenmodell nicht berücksichtigt.
 *
 * Massgebend ist der Berechnungsstichtag REF.
 */
export function isChildTooYoung(
  child: ChildInput,
  ref = REF,
): boolean {
  if (!child.birth) return false;

  const date = new Date(child.birth + "T00:00:00");

  if (Number.isNaN(date.getTime())) return false;

  return ageMonths(child.birth, ref) < 3;
}

export function isEnrolled(child: ChildInput, ref = REF) {
  if (!child.einschulung) return false;
  const d = new Date(child.einschulung + "T00:00:00");
  return d.getTime() <= ref.getTime();
}

export function primaryFinished(child: ChildInput, ref = REF) {
  if (!child.primarEnde) return false;
  const d = new Date(child.primarEnde + "T00:00:00");
  return d.getTime() <= ref.getTime();
}

export function maxHourly(
  type: CareType,
  months: number,
  enrolled: boolean,
) {
  if (type === "schulergaenzend") return enrolled ? 5.5 : 0;
  if (type === "kita") {
    if (enrolled || months >= 18) return 7.5;
    return 11;
  }
  if (enrolled || months >= 18) return 5.5;
  return 8.3;
}

export function partnerCountsForIncome(h: HouseholdInput) {
  if (h.zusammen === "gemeinsam") return h.erwerb === "beide";
  if (h.getrenntArt === "ehe") return true;
  if (h.getrenntArt === "konkubinat") return h.konkubinatJahre >= 2;
  return false;
}

export function ebCount(h: HouseholdInput) {
  if (h.zusammen === "gemeinsam") {
    return h.erwerb === "beide" ? 2 : 1;
  }
  if (h.getrenntArt === "ehe") return 2;
  if (
    h.getrenntArt === "konkubinat" &&
    h.partnerErziehungsberechtigt
  ) return 2;
  return 1;
}

export function thresholdMet(h: HouseholdInput) {
  const n = ebCount(h);
  const sum = n === 1 ? h.pensum1 : h.pensum1 + h.pensum2;
  return n === 1
    ? sum >= PENSUM_ALONE
    : sum >= PENSUM_TOGETHER;
}

export function exceptionGranted(
  h: HouseholdInput,
  children: ChildInput[],
) {
  return (
    h.integration1 ||
    h.integration2 ||
    h.belastung1 ||
    h.belastung2 ||
    children.some(
      (child) =>
        !isChildTooYoung(child) &&
        child.kindlicheIndikation
    )
  );
}

export function pensumMet(
  h: HouseholdInput,
  children: ChildInput[] = [],
) {
  return thresholdMet(h) || exceptionGranted(h, children);
}

export function needsDeclaration(h: HouseholdInput) {
  return (
    h.taxPath === "nicht-rechtskraeftig" ||
    h.taxPath === "keine-veranlagung"
  );
}

export function needsMeldung(h: HouseholdInput) {
  return (
    (h.wohnsitz === true && !thresholdMet(h)) ||
    needsDeclaration(h)
  );
}

function ordinaryPerson(p: IncomeInput) {
  return (
    p.reineinkommen +
    0.2 * p.vermoegen +
    p.saeule3a +
    p.bvg +
    p.liegenschaft +
    p.verlust +
    0.75 * p.bruttolohnEinfach +
    p.zuwendungen +
    0.3 * p.eigenmietwert +
    0.3 * p.beteiligungGeschaeft +
    0.3 * p.beteiligungPrivat
  );
}

function evidencePerson(p: IncomeInput) {
  return p.reineinkommen + 0.2 * p.vermoegen;
}

function quellenPerson(p: IncomeInput) {
  const base =
    (p.bruttoQuellen + p.bruttolohnEinfach) * 0.75;
  return p.grenzgaenger
    ? base * (p.kaufkraft || 1)
    : base;
}

export function personFromTax(
  p: IncomeInput,
  path: TaxPath,
) {
  if (path === "quellen") return quellenPerson(p);
  if (path === "keine-veranlagung") return evidencePerson(p);
  return ordinaryPerson(p);
}

export type Result = {
  wohnsitzOk: boolean;
  pensumOk: boolean;
  sonderantrag: boolean;
  eb: number;
  taxIncome: number;
  massgebend: number;
  usedCurrent: boolean;
  deviation: number;
  faktor: number;
  children: Array<{
    id: string;
    name: string;
    months: number;
    enrolled: boolean;
    finished: boolean;
    hours: number;
    eligible: boolean;
    reason: string;
    subsidy: number;
    hypothetical: number;
  }>;
  hours: number;
  subsidy: number;
  hypothetical: number;
};

export function assess(
  h: HouseholdInput,
  children: ChildInput[],
  incomeOverride?: number,
): Result {
  const path = h.taxPath ?? "ordentlich";
  const includePartner = partnerCountsForIncome(h);
  const persons = includePartner
    ? [h.income1, h.income2]
    : [h.income1];

  const taxIncomeRaw = persons.reduce(
    (s, p) => s + personFromTax(p, path),
    0,
  );
  const deduction =
    path === "quellen"
      ? 0
      : children.length * CHILD_DEDUCTION;

  const taxIncome = Math.max(
    0,
    taxIncomeRaw - deduction,
  );

  const aktuell = persons.reduce(
    (s, p) => s + (p.aktuellBekannt ? p.aktuell : 0),
    0,
  );
  const bekannt = persons.some(
    (p) => p.aktuellBekannt,
  );
  const deviation =
    taxIncome === 0
      ? aktuell !== 0 ? 1 : 0
      : Math.abs(aktuell - taxIncome) / taxIncome;

  const usedCurrent = bekannt && deviation >= 0.25;
  const base =
    incomeOverride ??
    (usedCurrent ? Math.max(0, aktuell) : taxIncome);

  const faktor = Math.min(
    1,
    Math.max(
      0,
      (MAX_INCOME - base) / (MAX_INCOME - MIN_INCOME),
    ),
  );

  const eb = ebCount(h);
  const pensumOk =
    h.wohnsitz === true && pensumMet(h, children);

  const sonderantrag =
    h.wohnsitz === true &&
    !pensumMet(h, children) &&
    eb >= 1;

  const rows = children.map((child) => {
    const months = ageMonths(child.birth);
    const enrolled = isEnrolled(child);
    const finished = primaryFinished(child);

    if (isChildTooYoung(child)) {
      return {
        id: child.id,
        name: child.name,
        months,
        enrolled: false,
        finished: false,
        hours: 0,
        eligible: false,
        reason: "Unter 3 Monaten – nicht berücksichtigt",
        subsidy: 0,
        hypothetical: 0,
      };
    }

    let hours = 0;
    let hypothetical = 0;

    for (const day of Object.values(child.days)) {
      // Elternferien mit Betreuung zu Hause
      // ergeben keine externen Betreuungsstunden.
      if (
        day.elternferien ||
        !day.obhut ||
        day.hours <= 0
      ) continue;

      hours += day.hours;
      const rate = maxHourly(
        day.type,
        months,
        enrolled,
      );
      hypothetical += day.hours * rate * faktor;
    }

    let reason = "Anspruch";
    let eligible = true;

    if (h.wohnsitz !== true) {
      eligible = false;
      reason = "Kein Wohnsitz im Kanton";
    } else if (months < 3) {
      eligible = false;
      reason = "Unter 3 Monaten";
    } else if (finished) {
      eligible = false;
      reason = "Primarschule abgeschlossen";
    } else if (hours <= 0) {
      eligible = false;
      reason = "Keine Betreuung mit Obhut";
    } else if (!pensumOk) {
      eligible = false;
      reason = "Pensum nicht erreicht";
    }

    return {
      id: child.id,
      name: child.name,
      months,
      enrolled,
      finished,
      hours,
      eligible,
      reason,
      subsidy: eligible ? hypothetical : 0,
      hypothetical,
    };
  });

  return {
    wohnsitzOk: h.wohnsitz === true,
    pensumOk,
    sonderantrag:
      sonderantrag &&
      rows.some(
        (c) =>
          c.months >= 3 &&
          !c.finished &&
          c.hours > 0,
      ),
    eb,
    taxIncome,
    massgebend: base,
    usedCurrent,
    deviation,
    faktor,
    children: rows,
    hours: rows.reduce(
      (s, c) => s + c.hours,
      0,
    ),
    subsidy: rows.reduce(
      (s, c) => s + c.subsidy,
      0,
    ),
    hypothetical: rows.reduce(
      (s, c) =>
        s +
        (c.months >= 3 && !c.finished
          ? c.hypothetical
          : 0),
      0,
    ),
  };
}

export function curve(
  h: HouseholdInput,
  children: ChildInput[],
) {
  const points = [];

  for (
    let income = 0;
    income <= 180_000;
    income += 5_000
  ) {
    const r = assess(h, children, income);
    points.push({
      einkommen: income,
      beitrag: Math.round(r.hypothetical),
      stunde:
        Math.round(r.faktor * 11 * 100) / 100,
    });
  }

  return points;
}

export function chf(n: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function chfExact(n: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
