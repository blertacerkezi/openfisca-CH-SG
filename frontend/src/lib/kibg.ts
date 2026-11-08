
export const REF = new Date(2026, 10, 1);
export const TAX_YEAR = 2024;

export const MIN_INCOME = 40_000;
export const MAX_INCOME = 154_000;
export const CHILD_DEDUCTION = 4_000;

export const PENSUM_ALONE = 20;
export const PENSUM_TOGETHER = 120;

export const MAX_HOURS_PER_DAY = 12;
export const MAX_DAYS_PER_WEEK = 5;

export type CareType =
  | "kita"
  | "tagesfamilie"
  | "schulergaenzend";

export type TaxPath =
  | "ordentlich"
  | "quellen"
  | "nicht-rechtskraeftig"
  | "keine-veranlagung";

export type DayCare = {
  hours: number;
  type: CareType;
  obhut: boolean;
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
  eingeschult?: boolean | null;
  primarAbgeschlossen?: boolean | null;
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

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const normalized = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  return normalized === value ? date : null;
}

export function ageMonths(
  birth: string,
  ref = REF,
): number {
  const date = parseDate(birth);

  if (!date) return 0;

  let months =
    (ref.getFullYear() - date.getFullYear()) * 12 +
    (ref.getMonth() - date.getMonth());

  if (ref.getDate() < date.getDate()) {
    months -= 1;
  }

  return months;
}

export function isChildTooYoung(
  child: ChildInput,
  ref = REF,
): boolean {
  if (!parseDate(child.birth)) return false;

  return ageMonths(child.birth, ref) < 3;
}

export function isEnrolled(
  child: ChildInput,
  ref = REF,
): boolean {
  const date = parseDate(child.einschulung);

  return date !== null && date.getTime() <= ref.getTime();
}

export function primaryFinished(
  child: ChildInput,
  ref = REF,
): boolean {
  const date = parseDate(child.primarEnde);

  return date !== null && date.getTime() <= ref.getTime();
}

export function childWithinSchoolAge(
  child: ChildInput,
  ref = REF,
): boolean {
  return (
    !isChildTooYoung(child, ref) &&
    !primaryFinished(child, ref)
  );
}

export function maxHourly(
  type: CareType,
  months: number,
  enrolled: boolean,
): number {
  if (type === "schulergaenzend") {
    return enrolled ? 5.5 : 0;
  }

  if (type === "kita") {
    if (enrolled || months >= 18) return 7.5;
    return 11;
  }

  if (enrolled || months >= 18) return 5.5;

  return 8.3;
}

/**
 * Einkommensberechnung:
 * Im gemeinsamen Haushalt werden beide Personen
 * berücksichtigt, unabhängig davon, wer arbeitet.
 */
export function partnerCountsForIncome(
  h: HouseholdInput,
): boolean {
  if (h.zusammen === "gemeinsam") {
    return true;
  }

  if (h.zusammen === "getrennt") {
    // Bisherige Einkommensregeln des Projektmodells.
    if (h.getrenntArt === "ehe") return true;

    if (h.getrenntArt === "konkubinat") {
      return h.konkubinatJahre >= 2;
    }
  }

  return false;
}

/**
 * Anzahl der für die Pensumsprüfung
 * berücksichtigten Personen.
 *
 * Gemeinsamer Haushalt: 2 Personen
 * Getrennter Haushalt: 1 Person
 *
 * Diese Unterscheidung entspricht der vom
 * Projekt gewünschten Modellregel.
 */
export function ebCount(
  h: HouseholdInput,
): number {
  if (h.zusammen === "gemeinsam") {
    return 2;
  }

  if (h.zusammen === "getrennt") {
    return 1;
  }

  return 0;
}

/**
 * Gemeinsamer Haushalt:
 * mindestens 120 % zusammen.
 *
 * Getrennter Haushalt:
 * mindestens 20 %.
 */
export function thresholdMet(
  h: HouseholdInput,
): boolean {
  if (h.zusammen === "gemeinsam") {
    const pensum1 = h.pensum1;
    const pensum2 =
      h.erwerb === "beide" ? h.pensum2 : 0;

    if (
      !Number.isFinite(pensum1) ||
      !Number.isFinite(pensum2)
    ) {
      return false;
    }

    if (
      pensum1 < 0 ||
      pensum1 > 100 ||
      pensum2 < 0 ||
      pensum2 > 100
    ) {
      return false;
    }

    return (
      pensum1 + pensum2 >= PENSUM_TOGETHER
    );
  }

  if (h.zusammen === "getrennt") {
    return (
      Number.isFinite(h.pensum1) &&
      h.pensum1 >= PENSUM_ALONE &&
      h.pensum1 <= 100
    );
  }

  return false;
}

/**
 * Ein Ausnahmegrund kann eine Prüfung
 * durch den Kanton ermöglichen.
 *
 * Er ist aber noch keine Bewilligung.
 */
export function exceptionGranted(
  h: HouseholdInput,
  children: ChildInput[],
): boolean {
  return (
    h.integration1 ||
    h.integration2 ||
    h.belastung1 ||
    h.belastung2 ||
    children.some(
      (child) =>
        childWithinSchoolAge(child) &&
        child.kindlicheIndikation
    )
  );
}

/**
 * Nur das reguläre Pensum gilt als erfüllt.
 * Eine allfällige Ausnahme wird separat geprüft.
 */
export function pensumMet(
  h: HouseholdInput,
  _children: ChildInput[] = [],
): boolean {
  return thresholdMet(h);
}

export function needsDeclaration(
  h: HouseholdInput,
): boolean {
  return (
    h.taxPath === "nicht-rechtskraeftig" ||
    h.taxPath === "keine-veranlagung"
  );
}

export function needsMeldung(
  h: HouseholdInput,
): boolean {
  return (
    (h.wohnsitz === true && !thresholdMet(h)) ||
    needsDeclaration(h)
  );
}

function ordinaryPerson(
  p: IncomeInput,
): number {
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

function evidencePerson(
  p: IncomeInput,
): number {
  return (
    p.reineinkommen +
    0.2 * p.vermoegen
  );
}

function quellenPerson(
  p: IncomeInput,
): number {
  const base =
    (p.bruttoQuellen + p.bruttolohnEinfach) *
    0.75;

  return p.grenzgaenger
    ? base * (p.kaufkraft || 1)
    : base;
}

export function personFromTax(
  p: IncomeInput,
  path: TaxPath,
): number {
  if (path === "quellen") {
    return quellenPerson(p);
  }

  if (path === "keine-veranlagung") {
    return evidencePerson(p);
  }

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

function weekKey(date: Date): string {
  const monday = new Date(date);

  monday.setDate(
    monday.getDate() -
      ((monday.getDay() + 6) % 7)
  );

  return [
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate(),
  ].join("-");
}

export function assess(
  h: HouseholdInput,
  children: ChildInput[],
  incomeOverride?: number,
): Result {
  const path = h.taxPath ?? "ordentlich";

  const includePartner =
    partnerCountsForIncome(h);

  const persons = includePartner
    ? [h.income1, h.income2]
    : [h.income1];

  const taxIncomeRaw = persons.reduce(
    (sum, person) =>
      sum + personFromTax(person, path),
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
    (sum, person) =>
      sum +
      (person.aktuellBekannt
        ? person.aktuell
        : 0),
    0,
  );

  const bekannt = persons.some(
    (person) => person.aktuellBekannt,
  );

  const deviation =
    taxIncome === 0
      ? aktuell !== 0
        ? 1
        : 0
      : Math.abs(aktuell - taxIncome) /
        taxIncome;

  const usedCurrent =
    bekannt && deviation >= 0.25;

  const base =
    incomeOverride ??
    (usedCurrent
      ? Math.max(0, aktuell)
      : taxIncome);

  const faktor = Math.min(
    1,
    Math.max(
      0,
      (MAX_INCOME - base) /
        (MAX_INCOME - MIN_INCOME),
    ),
  );

  const eb = ebCount(h);

  const pensumOk =
    h.wohnsitz === true &&
    thresholdMet(h);

  const sonderantrag =
    h.wohnsitz === true &&
    !thresholdMet(h) &&
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
        reason:
          "Unter 3 Monaten – nicht berücksichtigt",
        subsidy: 0,
        hypothetical: 0,
      };
    }

    if (finished) {
      return {
        id: child.id,
        name: child.name,
        months,
        enrolled,
        finished: true,
        hours: 0,
        eligible: false,
        reason:
          "Primarschule abgeschlossen – kein Anspruch",
        subsidy: 0,
        hypothetical: 0,
      };
    }

    let hours = 0;
    let hypothetical = 0;

    const weeklyDays = new Map<string, number>();

    const sortedDays = Object.entries(
      child.days,
    ).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    for (const [dateKey, day] of sortedDays) {
      if (
        day.elternferien ||
        !day.obhut ||
        !Number.isFinite(day.hours) ||
        day.hours <= 0
      ) {
        continue;
      }

      const careDate = parseDate(dateKey);

      if (!careDate) continue;

      const week = weekKey(careDate);
      const usedDays =
        weeklyDays.get(week) ?? 0;

      if (usedDays >= MAX_DAYS_PER_WEEK) {
        continue;
      }

      const allowedHours = Math.min(
        MAX_HOURS_PER_DAY,
        Math.max(0, day.hours),
      );

      if (allowedHours <= 0) continue;

      weeklyDays.set(
        week,
        usedDays + 1,
      );

      hours += allowedHours;

      const rate = maxHourly(
        day.type,
        months,
        enrolled,
      );

      hypothetical +=
        allowedHours * rate * faktor;
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
      reason =
        "Pensum nicht erreicht – Ausnahmeprüfung möglich";
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
      subsidy:
        eligible ? hypothetical : 0,
      hypothetical,
    };
  });

  return {
    wohnsitzOk: h.wohnsitz === true,
    pensumOk,
    sonderantrag:
      sonderantrag &&
      rows.some(
        (child) =>
          child.months >= 3 &&
          !child.finished &&
          child.hours > 0
      ),
    eb,
    taxIncome,
    massgebend: base,
    usedCurrent,
    deviation,
    faktor,
    children: rows,
    hours: rows.reduce(
      (sum, child) =>
        sum + child.hours,
      0,
    ),
    subsidy: rows.reduce(
      (sum, child) =>
        sum + child.subsidy,
      0,
    ),
    hypothetical: rows.reduce(
      (sum, child) =>
        sum +
        (child.months >= 3 &&
        !child.finished
          ? child.hypothetical
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
    const result = assess(
      h,
      children,
      income,
    );

    points.push({
      einkommen: income,
      beitrag: Math.round(
        result.hypothetical,
      ),
      stunde:
        Math.round(
          result.faktor * 11 * 100,
        ) / 100,
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
