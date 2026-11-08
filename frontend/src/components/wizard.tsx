
import {
  lazy,
  Suspense,
  useState,
  type ReactNode,
} from "react";

import { Overview } from "@/components/overview";
import {
  Articles,
  type ArticleStep,
} from "@/components/articles";
import { CareCalendar } from "@/components/care-calendar";

import {
  type ChildInput,
  type HouseholdInput,
  type IncomeInput,
  type TaxPath,
  REF,
  ageMonths,
  isChildTooYoung,
  emptyIncome,
  needsDeclaration,
  needsMeldung,
  thresholdMet,
} from "@/lib/kibg";

const ResultPanel = lazy(
  () => import("@/components/result-panel")
);

type SchoolStatus = Record<string, "ja" | "nein">;
type ExceptionDecision = "ja" | "nein" | null;

const TITLES: Record<ArticleStep, string> = {
  wohnsitz: "Wohnsitz",
  kinder: "Kinder",
  kalender: "Betreuung",
  haushalt: "Haushalt und Arbeit",
  einkommen: "Einkommen und Vermögen",
  aktuell: "Heutige Lage",
  meldung: "Meldung an den Kanton",
  result: "Beitrag",
};

function dateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (year < 1900 || year > 9999) {
    return false;
  }

  const date = new Date(0);

  date.setFullYear(
    year,
    month - 1,
    day
  );

  date.setHours(12, 0, 0, 0);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function displayDate(value: string): string {
  if (!validDate(value)) return value;

  const [year, month, day] = value.split("-");

  return `${day}.${month}.${year}`;
}

function formatPersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("de-CH")
    .replace(
      /(^|[\s'-])([\p{L}])/gu,
      (
        _match,
        separator: string,
        letter: string
      ) =>
        separator +
        letter.toLocaleUpperCase("de-CH")
    );
}

function hasCompletedPrimary(
  child: ChildInput
): boolean {
  return (
    validDate(child.einschulung) &&
    validDate(child.primarEnde) &&
    child.primarEnde >= child.einschulung &&
    child.primarEnde <= dateISO(REF)
  );
}

function eligibleForCalculation(
  child: ChildInput
): boolean {
  return (
    !isChildTooYoung(child) &&
    !hasCompletedPrimary(child)
  );
}

function blankChild(index: number): ChildInput {
  return {
    id:
      `kind-${index}-` +
      Math.random().toString(36).slice(2, 9),
    name: `Kind ${index}`,
    firstName: "",
    lastName: "",
    birth: "",
    einschulung: "",
    primarEnde: "",
    kindlicheIndikation: false,
    days: {},
  };
}

function blankHousehold(): HouseholdInput {
  return {
    wohnsitz: null,
    zusammen: null,
    erwerb: null,
    getrenntArt: null,
    konkubinatJahre: 0,
    partnerErziehungsberechtigt: false,
    pensum1: 0,
    pensum2: 0,
    integration1: false,
    integration2: false,
    belastung1: false,
    belastung2: false,
    begruendung: "",
    nachweisLohn: false,
    nachweisKonto: false,
    nachweisAndere: false,
    nachweisText: "",
    bestaetigung: false,
    taxPath: null,
    income1: emptyIncome(),
    income2: emptyIncome(),
  };
}

function flowFor(
  household: HouseholdInput
): ArticleStep[] {
  const steps: ArticleStep[] = [
    "wohnsitz",
    "kinder",
    "kalender",
    "haushalt",
    "einkommen",
    "aktuell",
  ];

  if (needsMeldung(household)) {
    steps.push("meldung");
  }

  steps.push("result");

  return steps;
}

function actualPensum(
  household: HouseholdInput
): number {
  if (household.zusammen === "gemeinsam") {
    return (
      household.pensum1 +
      (
        household.erwerb === "beide"
          ? household.pensum2
          : 0
      )
    );
  }

  return household.pensum1;
}

function requiredPensum(
  household: HouseholdInput
): number {
  return household.zusammen === "gemeinsam"
    ? 120
    : 20;
}

function pensumReached(
  household: HouseholdInput
): boolean {
  if (!household.zusammen) return false;

  if (
    !Number.isFinite(household.pensum1) ||
    !Number.isFinite(household.pensum2) ||
    household.pensum1 < 0 ||
    household.pensum1 > 100 ||
    household.pensum2 < 0 ||
    household.pensum2 > 100
  ) {
    return false;
  }

  return (
    actualPensum(household) >=
    requiredPensum(household)
  );
}

function needsPartner(
  household: HouseholdInput
): boolean {
  if (household.zusammen === "gemeinsam") {
    return true;
  }

  if (household.getrenntArt === "ehe") {
    return true;
  }

  if (household.getrenntArt === "konkubinat") {
    return (
      household.konkubinatJahre >= 2 ||
      household.partnerErziehungsberechtigt
    );
  }

  return false;
}

function exceptionReady(
  household: HouseholdInput,
  children: ChildInput[]
): boolean {
  return (
    household.integration1 ||
    household.integration2 ||
    household.belastung1 ||
    household.belastung2 ||
    children.some(
      (child) =>
        eligibleForCalculation(child) &&
        child.kindlicheIndikation
    )
  );
}

function canContinue(
  step: ArticleStep,
  household: HouseholdInput,
  count: number,
  children: ChildInput[],
  schoolStatus: SchoolStatus
): boolean {
  if (step === "wohnsitz") {
    return household.wohnsitz !== null;
  }

  if (step === "kinder") {
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 6
    ) {
      return false;
    }

    return Array.from(
      { length: count },
      (_, index) => children[index]
    ).every((child) => {
      if (!child) return false;

      if (
        !child.firstName?.trim() ||
        !child.lastName?.trim()
      ) {
        return false;
      }

      if (
        !validDate(child.birth) ||
        child.birth > dateISO(REF)
      ) {
        return false;
      }

      if (ageMonths(child.birth, REF) < 48) {
        return true;
      }

      const status = schoolStatus[child.id];

      if (!status) return false;

      if (status === "nein") {
        return true;
      }

      if (
        !validDate(child.einschulung) ||
        child.einschulung < child.birth ||
        child.einschulung > dateISO(REF)
      ) {
        return false;
      }

      if (
        !validDate(child.primarEnde) ||
        child.primarEnde < child.einschulung
      ) {
        return false;
      }

      // Primarschulabschluss ist ein
      // Ausschlussgrund, kein Eingabefehler.
      return true;
    });
  }

  if (step === "haushalt") {
    if (!household.zusammen) return false;

    if (
      !Number.isFinite(household.pensum1) ||
      !Number.isFinite(household.pensum2) ||
      household.pensum1 < 0 ||
      household.pensum1 > 100 ||
      household.pensum2 < 0 ||
      household.pensum2 > 100 ||
      household.konkubinatJahre < 0
    ) {
      return false;
    }

    if (
      household.zusammen === "gemeinsam" &&
      !household.erwerb
    ) {
      return false;
    }

    if (
      household.zusammen === "getrennt" &&
      !household.getrenntArt
    ) {
      return false;
    }

    return true;
  }

  if (step === "einkommen") {
    if (!household.taxPath) return false;

    const values = [
      household.income1,
      household.income2,
    ].flatMap((person) => [
      person.reineinkommen,
      person.vermoegen,
      person.saeule3a,
      person.bvg,
      person.liegenschaft,
      person.verlust,
      person.bruttolohnEinfach,
      person.zuwendungen,
      person.eigenmietwert,
      person.beteiligungGeschaeft,
      person.beteiligungPrivat,
      person.bruttoQuellen,
    ]);

    return values.every(
      (value) =>
        Number.isFinite(value) &&
        value >= 0
    );
  }

  if (step === "meldung") {
    const exceptionValid =
      thresholdMet(household) ||
      (
        exceptionReady(household, children) &&
        household.begruendung.trim().length >= 10
      );

    const declarationValid =
      !needsDeclaration(household) ||
      household.bestaetigung;

    return (
      exceptionValid &&
      declarationValid
    );
  }

  return true;
}

export function Wizard() {
  const [screen, setScreen] = useState<
    "gate" | "kanton" | "flow"
  >("gate");

  const [stepIndex, setStepIndex] =
    useState(0);

  const [blocked, setBlocked] =
    useState<string | null>(null);

  const [count, setCount] =
    useState(1);

  const [children, setChildren] =
    useState<ChildInput[]>([
      blankChild(1),
    ]);

  const [schoolStatus, setSchoolStatus] =
    useState<SchoolStatus>({});

  const [household, setHousehold] =
    useState<HouseholdInput>(
      blankHousehold
    );

  const [
    exceptionDecision,
    setExceptionDecision,
  ] = useState<ExceptionDecision>(null);

  const [
    exceptionSubmitted,
    setExceptionSubmitted,
  ] = useState(false);

  const flow = flowFor(household);

  const step =
    flow[
      Math.min(
        stepIndex,
        flow.length - 1
      )
    ] ?? "wohnsitz";

  function restart() {
    setScreen("gate");
    setStepIndex(0);
    setBlocked(null);
    setCount(1);
    setChildren([blankChild(1)]);
    setSchoolStatus({});
    setHousehold(blankHousehold());
    setExceptionDecision(null);
    setExceptionSubmitted(false);
  }

  function back() {
    if (blocked) {
      setBlocked(null);
      return;
    }

    if (stepIndex === 0) {
      setScreen("gate");
    } else {
      setStepIndex(
        (previous) => previous - 1
      );
    }
  }

  function updateChild(
    index: number,
    patch: Partial<
      Pick<
        ChildInput,
        | "firstName"
        | "lastName"
        | "birth"
        | "einschulung"
        | "primarEnde"
        | "kindlicheIndikation"
      >
    >
  ) {
    setChildren((previous) => {
      const updatedChildren = [
        ...previous,
      ];

      const current =
        updatedChildren[index] ??
        blankChild(index + 1);

      const updated = {
        ...current,
        ...patch,
      };

      updated.name =
        [
          updated.firstName,
          updated.lastName,
        ]
          .map(
            (part) =>
              (part ?? "").trim()
          )
          .filter(Boolean)
          .join(" ") ||
        `Kind ${index + 1}`;

      updatedChildren[index] =
        updated;

      return updatedChildren;
    });
  }

  function blockWithReason(
    message: string
  ) {
    // Keine Browser-Pop-ups.
    // Die Meldung erscheint im Formular.
    setBlocked(message);
  }

  function next() {
    if (
      step === "wohnsitz" &&
      household.wohnsitz === false
    ) {
      blockWithReason(
        "Grund: Kein Wohnsitz im " +
        "Kanton St. Gallen.\n\n" +
        "Die reguläre Anspruchsprüfung " +
        "wird beendet."
      );
      return;
    }

    if (step === "kinder") {
      const selectedChildren =
        children.slice(0, count);

      const eligible =
        selectedChildren.filter(
          eligibleForCalculation
        );

      if (eligible.length === 0) {
        const reasons =
          selectedChildren.map(
            (child) => {
              if (
                hasCompletedPrimary(child)
              ) {
                return (
                  `${child.name}: ` +
                  "Primarschule am " +
                  displayDate(
                    child.primarEnde
                  ) +
                  " abgeschlossen."
                );
              }

              return (
                `${child.name}: ` +
                "am Stichtag unter " +
                "drei Monaten alt."
              );
            }
          );

        blockWithReason(
          reasons.join("\n") +
          "\n\nRechtsgrundlage: " +
          "Art. 4 Abs. 3 KiBG " +
          "(Vorlage zur Totalrevision).\n\n" +
          "Nach der vorgesehenen Regelung " +
          "beginnt der Anspruch frühestens " +
          "mit drei Monaten und endet mit " +
          "dem Abschluss der Primarschule.\n\n" +
          "Die Prüfung wird beendet."
        );
        return;
      }

      setChildren(selectedChildren);
    }

    // Erwerbspensum sofort nach
    // dem Haushalt prüfen.
    if (
      step === "haushalt" &&
      !pensumReached(household)
    ) {
      const actual =
        actualPensum(household);

      const required =
        requiredPensum(household);

      const explanation =
        household.zusammen === "gemeinsam"
          ? "Bei einem gemeinsamen Haushalt " +
            "müssen die massgebenden " +
            "Erwerbspensen zusammen " +
            "mindestens 120 % betragen."
          : "Bei getrenntem Haushalt " +
            "wird für die antragstellende " +
            "Person ein Mindestpensum " +
            "von 20 % geprüft.";

      blockWithReason(
        "Grund: Das erforderliche " +
        "Erwerbspensum wird nicht erreicht.\n\n" +
        explanation +
        "\n\nAngegebenes Erwerbspensum: " +
        actual +
        " %\nErforderliches Erwerbspensum: " +
        required +
        " %\n\n" +
        "Rechtsgrundlage: " +
        "Art. 4 Abs. 1 KiBG " +
        "(Vorlage zur Totalrevision).\n\n" +
        "Der reguläre Anspruch ist " +
        "damit nicht erfüllt."
      );

      setExceptionDecision(null);
      setExceptionSubmitted(false);
      return;
    }

    setStepIndex(
      (previous) =>
        Math.min(
          flow.length - 1,
          previous + 1
        )
    );
  }

  function continueWithException() {
    if (
      exceptionDecision !== "ja" ||
      !exceptionReady(
        household,
        children
      ) ||
      household.begruendung.trim()
        .length < 10
    ) {
      return;
    }

    setExceptionSubmitted(true);
    setBlocked(null);

    const incomeIndex =
      flow.indexOf("einkommen");

    if (incomeIndex >= 0) {
      setStepIndex(incomeIndex);
    }
  }

  if (screen === "gate") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-5 py-10">
        <p className="text-sm font-medium uppercase tracking-wide text-pine">
          Kanton St. Gallen
        </p>

        <h1 className="max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Beitrag für die Kinderbetreuung
        </h1>

        <p className="max-w-lg text-lg text-muted">
          Prüfen Sie die Voraussetzungen
          und berechnen Sie einen
          möglichen Betreuungsbeitrag.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setScreen("flow")
            }
            className="min-h-24 rounded-card bg-pine px-6 text-left text-pine-ink"
          >
            <span className="block font-serif text-2xl">
              Privatperson
            </span>

            <span>
              Anspruch und Beitrag prüfen
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setScreen("kanton")
            }
            className="min-h-24 rounded-card border border-line bg-card px-6 text-left"
          >
            <span className="block font-serif text-2xl">
              Wirkung ansehen
            </span>

            <span className="text-muted">
              Was von 100 Franken
              Mehrlohn bleibt
            </span>
          </button>
        </div>
      </main>
    );
  }

  if (screen === "kanton") {
    return (
      <Overview
        onBack={() =>
          setScreen("gate")
        }
      />
    );
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-6">
      <Articles step={step} />

      <section className="rounded-card border border-line bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3 text-sm text-muted">
          <button
            type="button"
            onClick={back}
            className="min-h-11"
          >
            Zurück
          </button>

          <span>
            {blocked
              ? "Anspruchsprüfung"
              : `${
                  Math.min(
                    stepIndex,
                    flow.length - 1
                  ) + 1
                } / ${
                  flow.length
                } · ${
                  TITLES[step]
                }`}
          </span>

          <button
            type="button"
            onClick={restart}
            className="min-h-11"
          >
            Neu
          </button>
        </div>

        {blocked ? (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-serif text-3xl leading-tight">
                Anforderungen nicht erreicht
              </h2>

              <p className="mt-4 whitespace-pre-line leading-relaxed">
                {blocked}
              </p>
            </div>

            {step === "haushalt" &&
              !pensumReached(
                household
              ) && (
                <div className="rounded-card border border-line bg-sand p-5">
                  <h3 className="font-serif text-2xl">
                    Gesetzliche Ausnahme
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    Nach Art. 4 Abs. 2
                    KiBG (Vorlage zur
                    Totalrevision) können
                    besondere Situationen
                    eine gesonderte
                    Prüfung ermöglichen.
                    Eine Ausnahme wird
                    nicht automatisch
                    bewilligt.
                  </p>

                  <p className="mt-5 font-medium">
                    Trifft ein
                    Ausnahmegrund auf
                    Sie zu?
                  </p>

                  <div className="mt-3">
                    <Choices
                      value={
                        exceptionDecision ??
                        ""
                      }
                      options={[
                        [
                          "ja",
                          "Ja, ich möchte eine Ausnahme geltend machen",
                        ],
                        [
                          "nein",
                          "Nein, kein Ausnahmegrund trifft zu",
                        ],
                      ]}
                      onChange={(value) => {
                        setExceptionDecision(
                          value as
                            | "ja"
                            | "nein"
                        );
                      }}
                    />
                  </div>

                  {exceptionDecision ===
                    "ja" && (
                    <div className="mt-5 flex flex-col gap-4">
                      <p className="font-medium">
                        Welche Gründe
                        treffen zu?
                      </p>

                      <p className="text-sm text-muted">
                        Mehrfachauswahl
                        ist möglich.
                      </p>

                      <Check
                        label="Berufliche Integration, Stellensuche oder Weiterbildung – Person 1"
                        checked={
                          household.integration1
                        }
                        onChange={(
                          integration1
                        ) =>
                          setHousehold(
                            (previous) => ({
                              ...previous,
                              integration1,
                            })
                          )
                        }
                      />

                      <Check
                        label="Besondere familiäre Belastung – Person 1"
                        checked={
                          household.belastung1
                        }
                        onChange={(
                          belastung1
                        ) =>
                          setHousehold(
                            (previous) => ({
                              ...previous,
                              belastung1,
                            })
                          )
                        }
                      />

                      {household.zusammen ===
                        "gemeinsam" && (
                        <>
                          <Check
                            label="Berufliche Integration, Stellensuche oder Weiterbildung – Person 2"
                            checked={
                              household.integration2
                            }
                            onChange={(
                              integration2
                            ) =>
                              setHousehold(
                                (previous) => ({
                                  ...previous,
                                  integration2,
                                })
                              )
                            }
                          />

                          <Check
                            label="Besondere familiäre Belastung – Person 2"
                            checked={
                              household.belastung2
                            }
                            onChange={(
                              belastung2
                            ) =>
                              setHousehold(
                                (previous) => ({
                                  ...previous,
                                  belastung2,
                                })
                              )
                            }
                          />
                        </>
                      )}

                      {children.map(
                        (
                          child,
                          index
                        ) =>
                          eligibleForCalculation(
                            child
                          ) ? (
                            <Check
                              key={
                                child.id
                              }
                              label={
                                "Besonderer Betreuungsbedarf – " +
                                child.name
                              }
                              checked={
                                child.kindlicheIndikation
                              }
                              onChange={(
                                kindlicheIndikation
                              ) =>
                                updateChild(
                                  index,
                                  {
                                    kindlicheIndikation,
                                  }
                                )
                              }
                            />
                          ) : null
                      )}

                      <label className="block text-sm text-muted">
                        <span className="font-medium text-ink">
                          Beschreiben
                          Sie Ihre
                          Situation *
                        </span>

                        <textarea
                          rows={5}
                          value={
                            household.begruendung
                          }
                          onChange={(
                            event
                          ) =>
                            setHousehold(
                              (previous) => ({
                                ...previous,
                                begruendung:
                                  event
                                    .target
                                    .value,
                              })
                            )
                          }
                          placeholder="Welcher Ausnahmegrund liegt vor? Beschreiben Sie Ihre Situation und weshalb eine Ausnahme erforderlich ist."
                          className="mt-2 w-full rounded-card border border-line bg-card px-3 py-3 text-ink"
                        />
                      </label>

                      <p className="text-sm text-muted">
                        Wählen Sie
                        mindestens einen
                        Grund aus und
                        beschreiben Sie
                        Ihre Situation.
                        Die zuständige
                        Stelle muss eine
                        mögliche Ausnahme
                        prüfen.
                      </p>

                      <button
                        type="button"
                        disabled={
                          !exceptionReady(
                            household,
                            children
                          ) ||
                          household.begruendung
                            .trim()
                            .length < 10
                        }
                        onClick={
                          continueWithException
                        }
                        className="min-h-11 rounded-card bg-pine px-5 text-pine-ink disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Weiter zum
                        Einkommen
                      </button>
                    </div>
                  )}

                  {exceptionDecision ===
                    "nein" && (
                    <div
                      role="status"
                      className="mt-5 rounded-card border border-line bg-card p-4"
                    >
                      <p className="font-bold">
                        Prüfung beendet
                      </p>

                      <p className="mt-2 text-sm leading-relaxed">
                        Das erforderliche
                        Erwerbspensum
                        wird nicht erreicht
                        und es wird kein
                        Ausnahmegrund
                        geltend gemacht.
                        Die reguläre
                        Anspruchsprüfung
                        ist abgeschlossen.
                      </p>
                    </div>
                  )}
                </div>
              )}

            <button
              type="button"
              onClick={restart}
              className="min-h-11 self-start rounded-card bg-pine px-5 text-pine-ink"
            >
              Von vorn beginnen
            </button>
          </div>
        ) : (
          <>
            {step === "wohnsitz" && (
              <Block title="Haben Sie Ihren Wohnsitz im Kanton St. Gallen?">
                <Choices
                  value={
                    household.wohnsitz ===
                    null
                      ? ""
                      : household.wohnsitz
                        ? "ja"
                        : "nein"
                  }
                  options={[
                    ["ja", "Ja"],
                    ["nein", "Nein"],
                  ]}
                  onChange={(
                    value
                  ) =>
                    setHousehold({
                      ...household,
                      wohnsitz:
                        value === "ja",
                    })
                  }
                />
              </Block>
            )}

            {step === "kinder" && (
              <Block title="Für wie viele Kinder möchten Sie einen Betreuungsbeitrag beantragen?">
                <label className="block text-sm text-muted">
                  Anzahl Kinder

                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={count}
                    onChange={(
                      event
                    ) => {
                      const n = Number(
                        event.target
                          .value
                      );

                      if (
                        Number.isInteger(
                          n
                        ) &&
                        n >= 1 &&
                        n <= 6
                      ) {
                        setCount(n);

                        setChildren(
                          (previous) => {
                            const updated = [
                              ...previous,
                            ];

                            while (
                              updated.length <
                              n
                            ) {
                              updated.push(
                                blankChild(
                                  updated.length +
                                    1
                                )
                              );
                            }

                            return updated;
                          }
                        );
                      }
                    }}
                    className="mt-1 min-h-11 w-24 rounded-card border border-line px-3"
                  />
                </label>

                <div className="mt-4 flex flex-col gap-4">
                  {children
                    .slice(0, count)
                    .map(
                      (
                        child,
                        index
                      ) => {
                        const birthValid =
                          validDate(
                            child.birth
                          ) &&
                          child.birth <=
                            dateISO(REF);

                        const months =
                          birthValid
                            ? ageMonths(
                                child.birth,
                                REF
                              )
                            : null;

                        const tooYoung =
                          birthValid &&
                          isChildTooYoung(
                            child
                          );

                        const schoolRelevant =
                          months !==
                            null &&
                          months >= 48;

                        const enrolled =
                          schoolStatus[
                            child.id
                          ] === "ja";

                        const invalidEnrollment =
                          enrolled &&
                          child.einschulung !==
                            "" &&
                          (
                            !validDate(
                              child.einschulung
                            ) ||
                            child.einschulung <
                              child.birth ||
                            child.einschulung >
                              dateISO(REF)
                          );

                        const invalidEnd =
                          enrolled &&
                          child.primarEnde !==
                            "" &&
                          (
                            !validDate(
                              child.primarEnde
                            ) ||
                            (
                              validDate(
                                child.einschulung
                              ) &&
                              child.primarEnde <
                                child.einschulung
                            )
                          );

                        return (
                          <fieldset
                            key={
                              child.id
                            }
                            className="rounded-card bg-sand p-4"
                          >
                            <legend className="font-medium">
                              Kind{" "}
                              {index +
                                1}
                            </legend>

                            <Field
                              label="Vorname *"
                              value={
                                child.firstName ??
                                ""
                              }
                              onChange={(
                                firstName
                              ) =>
                                updateChild(
                                  index,
                                  {
                                    firstName,
                                  }
                                )
                              }
                              onBlur={() =>
                                updateChild(
                                  index,
                                  {
                                    firstName:
                                      formatPersonName(
                                        child.firstName ??
                                          ""
                                      ),
                                  }
                                )
                              }
                            />

                            <Field
                              label="Nachname *"
                              value={
                                child.lastName ??
                                ""
                              }
                              onChange={(
                                lastName
                              ) =>
                                updateChild(
                                  index,
                                  {
                                    lastName,
                                  }
                                )
                              }
                              onBlur={() =>
                                updateChild(
                                  index,
                                  {
                                    lastName:
                                      formatPersonName(
                                        child.lastName ??
                                          ""
                                      ),
                                  }
                                )
                              }
                            />

                            <Field
                              label="Geburtsdatum *"
                              type="date"
                              value={
                                child.birth
                              }
                              onChange={(
                                birth
                              ) => {
                                updateChild(
                                  index,
                                  {
                                    birth,
                                  }
                                );

                                if (
                                  validDate(
                                    birth
                                  ) &&
                                  ageMonths(
                                    birth,
                                    REF
                                  ) < 48
                                ) {
                                  setSchoolStatus(
                                    (
                                      previous
                                    ) => {
                                      const updated = {
                                        ...previous,
                                      };

                                      delete updated[
                                        child.id
                                      ];

                                      return updated;
                                    }
                                  );

                                  updateChild(
                                    index,
                                    {
                                      birth,
                                      einschulung:
                                        "",
                                      primarEnde:
                                        "",
                                    }
                                  );
                                }
                              }}
                            />

                            {child.birth &&
                              !birthValid && (
                                <p
                                  role="alert"
                                  className="mt-2 text-sm text-clay"
                                >
                                  Bitte ein
                                  gültiges
                                  Geburtsdatum
                                  bis zum{" "}
                                  {displayDate(
                                    dateISO(
                                      REF
                                    )
                                  )}{" "}
                                  eingeben.
                                </p>
                              )}

                            {tooYoung && (
                              <div
                                role="alert"
                                className="mt-3 rounded-card border border-amber-300 bg-amber-50 p-4 text-amber-950"
                              >
                                <p className="font-bold">
                                  Anforderungen
                                  nicht
                                  erreicht
                                </p>

                                <p className="mt-2 text-sm">
                                  Dieses Kind
                                  ist am
                                  Berechnungsstichtag
                                  noch keine
                                  drei Monate
                                  alt.
                                </p>

                                <p className="mt-2 text-sm">
                                  Rechtsgrundlage:
                                  Art. 4 Abs. 3
                                  KiBG (Vorlage
                                  zur
                                  Totalrevision).
                                </p>
                              </div>
                            )}

                            {schoolRelevant && (
                              <div className="mt-4">
                                <p className="mb-2 font-medium">
                                  Ist das Kind
                                  bereits
                                  eingeschult?
                                </p>

                                <Choices
                                  value={
                                    schoolStatus[
                                      child.id
                                    ] ?? ""
                                  }
                                  options={[
                                    [
                                      "ja",
                                      "Ja",
                                    ],
                                    [
                                      "nein",
                                      "Nein",
                                    ],
                                  ]}
                                  onChange={(
                                    value
                                  ) => {
                                    setSchoolStatus(
                                      (
                                        previous
                                      ) => ({
                                        ...previous,
                                        [child.id]:
                                          value as
                                            | "ja"
                                            | "nein",
                                      })
                                    );

                                    if (
                                      value ===
                                      "nein"
                                    ) {
                                      updateChild(
                                        index,
                                        {
                                          einschulung:
                                            "",
                                          primarEnde:
                                            "",
                                        }
                                      );
                                    }
                                  }}
                                />

                                {enrolled && (
                                  <div className="mt-4 flex flex-col gap-3">
                                    <Field
                                      label="Datum der Einschulung *"
                                      type="date"
                                      value={
                                        child.einschulung
                                      }
                                      onChange={(
                                        einschulung
                                      ) =>
                                        updateChild(
                                          index,
                                          {
                                            einschulung,
                                          }
                                        )
                                      }
                                    />

                                    <Field
                                      label="Ende der Primarstufe (tatsächlich oder voraussichtlich) *"
                                      type="date"
                                      value={
                                        child.primarEnde
                                      }
                                      onChange={(
                                        primarEnde
                                      ) =>
                                        updateChild(
                                          index,
                                          {
                                            primarEnde,
                                          }
                                        )
                                      }
                                    />

                                    {(
                                      invalidEnrollment ||
                                      invalidEnd
                                    ) && (
                                      <div
                                        role="alert"
                                        className="rounded-card border border-red-300 bg-red-50 p-4 text-red-900"
                                      >
                                        <p className="font-bold">
                                          Ungültige
                                          Schuldaten
                                        </p>

                                        <p className="mt-2 text-sm">
                                          Die
                                          Einschulung
                                          darf nicht
                                          vor der
                                          Geburt
                                          oder nach
                                          dem
                                          Stichtag
                                          liegen.
                                          Das Ende
                                          der
                                          Primarstufe
                                          darf nicht
                                          vor der
                                          Einschulung
                                          liegen.
                                        </p>
                                      </div>
                                    )}

                                    {hasCompletedPrimary(
                                      child
                                    ) && (
                                      <div
                                        role="alert"
                                        className="rounded-card border border-red-300 bg-red-50 p-4 text-red-900"
                                      >
                                        <p className="font-bold">
                                          Anforderungen
                                          nicht
                                          erreicht
                                        </p>

                                        <p className="mt-2 text-sm">
                                          {
                                            child.name
                                          }{" "}
                                          hat die
                                          Primarschule
                                          am{" "}
                                          {displayDate(
                                            child.primarEnde
                                          )}{" "}
                                          abgeschlossen.
                                        </p>

                                        <p className="mt-2 text-sm">
                                          Rechtsgrundlage:
                                          Art. 4
                                          Abs. 3
                                          KiBG
                                          (Vorlage
                                          zur
                                          Totalrevision).
                                        </p>

                                        <p className="mt-2 text-sm">
                                          Dieses
                                          Kind wird
                                          nicht in
                                          die
                                          Beitragsberechnung
                                          aufgenommen.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </fieldset>
                        );
                      }
                    )}
                </div>
              </Block>
            )}

            {step === "kalender" && (
              <Block title="Angaben zur familienergänzenden Kinderbetreuung">
                <p className="mb-4 text-muted">
                  Tragen Sie die
                  Betreuungstage,
                  Betreuungsart und
                  Stunden ein.
                </p>

                <CareCalendar
                  children={children.filter(
                    eligibleForCalculation
                  )}
                  onChange={(
                    updatedChildren
                  ) => {
                    const updates =
                      new Map(
                        updatedChildren.map(
                          (
                            child
                          ) => [
                            child.id,
                            child,
                          ]
                        )
                      );

                    setChildren(
                      (previous) =>
                        previous.map(
                          (
                            child
                          ) =>
                            updates.get(
                              child.id
                            ) ??
                            child
                        )
                    );
                  }}
                />
              </Block>
            )}

            {step === "haushalt" && (
              <Block title="Angaben zur Wohn- und Erwerbssituation">
                <Choices
                  value={
                    household.zusammen ??
                    ""
                  }
                  options={[
                    [
                      "gemeinsam",
                      "Gemeinsamer Haushalt",
                    ],
                    [
                      "getrennt",
                      "Getrennter Haushalt",
                    ],
                  ]}
                  onChange={(
                    value
                  ) => {
                    setHousehold({
                      ...household,
                      zusammen:
                        value as HouseholdInput["zusammen"],
                    });
                  }}
                />

                {household.zusammen ===
                  "gemeinsam" && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium">
                      Welche Personen
                      sind
                      erwerbstätig?
                    </p>

                    <Choices
                      value={
                        household.erwerb ??
                        ""
                      }
                      options={[
                        [
                          "beide",
                          "Beide Personen sind erwerbstätig",
                        ],
                        [
                          "eine",
                          "Nur eine Person ist erwerbstätig",
                        ],
                      ]}
                      onChange={(
                        value
                      ) =>
                        setHousehold({
                          ...household,
                          erwerb:
                            value as HouseholdInput["erwerb"],
                          pensum2:
                            value ===
                            "eine"
                              ? 0
                              : household.pensum2,
                        })
                      }
                    />
                  </div>
                )}

                {household.zusammen ===
                  "getrennt" && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium">
                      Welche
                      Familiensituation
                      trifft zu?
                    </p>

                    <Choices
                      value={
                        household.getrenntArt ??
                        ""
                      }
                      options={[
                        [
                          "ehe",
                          "Ehe oder eingetragene Partnerschaft",
                        ],
                        [
                          "konkubinat",
                          "Konkubinat",
                        ],
                        [
                          "alleine",
                          "Ich lebe alleine",
                        ],
                      ]}
                      onChange={(
                        value
                      ) =>
                        setHousehold({
                          ...household,
                          getrenntArt:
                            value as HouseholdInput["getrenntArt"],
                        })
                      }
                    />
                  </div>
                )}

                {household.zusammen ===
                  "getrennt" &&
                  household.getrenntArt ===
                    "konkubinat" && (
                    <div className="mt-4 flex flex-col gap-3">
                      <Num
                        label="Dauer der Lebensgemeinschaft (Jahre)"
                        value={
                          household.konkubinatJahre
                        }
                        onChange={(
                          konkubinatJahre
                        ) =>
                          setHousehold({
                            ...household,
                            konkubinatJahre,
                          })
                        }
                      />

                      <Check
                        label="Die andere Person ist ebenfalls erziehungsberechtigt"
                        checked={
                          household.partnerErziehungsberechtigt
                        }
                        onChange={(
                          partnerErziehungsberechtigt
                        ) =>
                          setHousehold({
                            ...household,
                            partnerErziehungsberechtigt,
                          })
                        }
                      />
                    </div>
                  )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Num
                    label={
                      household.zusammen ===
                      "gemeinsam"
                        ? "Pensum Person 1 in Prozent"
                        : "Pensum in Prozent"
                    }
                    value={
                      household.pensum1
                    }
                    max={100}
                    onChange={(
                      pensum1
                    ) =>
                      setHousehold({
                        ...household,
                        pensum1,
                      })
                    }
                  />

                  {household.zusammen ===
                    "gemeinsam" &&
                    household.erwerb ===
                      "beide" && (
                      <Num
                        label="Pensum Person 2 in Prozent"
                        value={
                          household.pensum2
                        }
                        max={100}
                        onChange={(
                          pensum2
                        ) =>
                          setHousehold({
                            ...household,
                            pensum2,
                          })
                        }
                      />
                    )}
                </div>

                <p className="mt-3 text-sm text-muted">
                  {household.zusammen ===
                  "gemeinsam"
                    ? "Im gemeinsamen Haushalt müssen die massgebenden Erwerbspensen zusammen mindestens 120 % betragen. Pro Person sind höchstens 100 % möglich."
                    : "Bei getrenntem Haushalt wird für die antragstellende Person ein Mindestpensum von 20 % geprüft."}
                </p>

                {household.zusammen &&
                  !pensumReached(
                    household
                  ) && (
                    <div
                      role="alert"
                      className="mt-4 rounded-card border border-amber-300 bg-amber-50 p-4 text-amber-950"
                    >
                      <p className="font-bold">
                        Anforderungen
                        nicht erreicht
                      </p>

                      <p className="mt-2 text-sm">
                        Angegebenes
                        Erwerbspensum:{" "}
                        <strong>
                          {actualPensum(
                            household
                          )}{" "}
                          %
                        </strong>
                      </p>

                      <p className="mt-2 text-sm">
                        Erforderlich:{" "}
                        <strong>
                          {requiredPensum(
                            household
                          )}{" "}
                          %
                        </strong>
                      </p>

                      <p className="mt-2 text-sm">
                        Rechtsgrundlage:
                        Art. 4 Abs. 1
                        KiBG (Vorlage
                        zur
                        Totalrevision).
                      </p>

                      <p className="mt-2 text-sm">
                        Mit „Weiter“
                        sehen Sie die
                        Begründung und
                        können eine
                        mögliche
                        gesetzliche
                        Ausnahme
                        angeben.
                      </p>
                    </div>
                  )}
              </Block>
            )}

            {step === "einkommen" && (
              <Block title="Welche steuerliche Situation trifft auf Sie zu?">
                {exceptionSubmitted &&
                  !pensumReached(
                    household
                  ) && (
                    <div className="mb-4 rounded-card border border-amber-300 bg-amber-50 p-4 text-amber-950">
                      <p className="font-bold">
                        Ausnahmeprüfung
                        offen
                      </p>

                      <p className="mt-2 text-sm">
                        Sie haben
                        einen möglichen
                        Ausnahmegrund
                        angegeben.
                        Eine Bewilligung
                        liegt noch
                        nicht vor.
                      </p>
                    </div>
                  )}

                <Choices
                  value={
                    household.taxPath ??
                    ""
                  }
                  options={[
                    [
                      "ordentlich",
                      "Ordentlich besteuert, Veranlagung rechtskräftig",
                    ],
                    [
                      "nicht-rechtskraeftig",
                      "Keine rechtskräftige Steuerveranlagung",
                    ],
                    [
                      "quellen",
                      "Quellenbesteuert",
                    ],
                    [
                      "keine-veranlagung",
                      "Keine ordentliche Steuerveranlagung",
                    ],
                  ]}
                  onChange={(
                    value
                  ) =>
                    setHousehold({
                      ...household,
                      taxPath:
                        value as TaxPath,
                    })
                  }
                />

                {household.taxPath && (
                  <IncomeFields
                    title="Ihre finanziellen Angaben – Steuerjahr 2024"
                    path={
                      household.taxPath
                    }
                    value={
                      household.income1
                    }
                    onChange={(
                      income1
                    ) =>
                      setHousehold({
                        ...household,
                        income1,
                      })
                    }
                  />
                )}

                {household.taxPath &&
                  needsPartner(
                    household
                  ) && (
                    <IncomeFields
                      title="Finanzielle Angaben der weiteren Person – Steuerjahr 2024"
                      path={
                        household.taxPath
                      }
                      value={
                        household.income2
                      }
                      onChange={(
                        income2
                      ) =>
                        setHousehold({
                          ...household,
                          income2,
                        })
                      }
                    />
                  )}
              </Block>
            )}

            {step === "aktuell" && (
              <Block title="Angaben zur aktuellen Einkommenssituation">
                <p className="text-muted">
                  Falls die
                  heutige
                  finanzielle
                  Situation von
                  der
                  Steuerveranlagung
                  abweicht,
                  können Sie
                  aktuelle
                  Angaben
                  ergänzen.
                </p>

                <CurrentFields
                  label="Ihr heutiges massgebendes Einkommen"
                  value={
                    household.income1
                  }
                  onChange={(
                    income1
                  ) =>
                    setHousehold({
                      ...household,
                      income1,
                    })
                  }
                />

                {needsPartner(
                  household
                ) && (
                  <CurrentFields
                    label="Heutiges Einkommen der anderen Person"
                    value={
                      household.income2
                    }
                    onChange={(
                      income2
                    ) =>
                      setHousehold({
                        ...household,
                        income2,
                      })
                    }
                  />
                )}
              </Block>
            )}

            {step === "meldung" && (
              <Block title="Ergänzende Angaben und Nachweise">
                {exceptionSubmitted &&
                  !pensumReached(
                    household
                  ) && (
                    <div className="mb-4 rounded-card border border-amber-300 bg-amber-50 p-4 text-amber-950">
                      <p className="font-bold">
                        Gesetzliche
                        Ausnahme
                        angegeben
                      </p>

                      <p className="mt-2 text-sm">
                        Ihre Angaben
                        zum
                        Ausnahmegrund
                        wurden
                        übernommen.
                        Eine
                        behördliche
                        Prüfung
                        bleibt
                        erforderlich.
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm">
                        {
                          household.begruendung
                        }
                      </p>
                    </div>
                  )}

                {!pensumReached(
                  household
                ) &&
                  !exceptionSubmitted && (
                    <div className="flex flex-col gap-3">
                      <p className="text-muted">
                        Das
                        erforderliche
                        Erwerbspensum
                        wird nicht
                        erreicht.
                        Bitte geben
                        Sie einen
                        möglichen
                        Ausnahmegrund
                        an.
                      </p>

                      <Check
                        label="Person 1: berufliche Integration, Stellensuche oder Weiterbildung"
                        checked={
                          household.integration1
                        }
                        onChange={(
                          integration1
                        ) =>
                          setHousehold({
                            ...household,
                            integration1,
                          })
                        }
                      />

                      <Check
                        label="Person 1: familiäre Belastung"
                        checked={
                          household.belastung1
                        }
                        onChange={(
                          belastung1
                        ) =>
                          setHousehold({
                            ...household,
                            belastung1,
                          })
                        }
                      />

                      {household.zusammen ===
                        "gemeinsam" && (
                        <>
                          <Check
                            label="Person 2: berufliche Integration, Stellensuche oder Weiterbildung"
                            checked={
                              household.integration2
                            }
                            onChange={(
                              integration2
                            ) =>
                              setHousehold({
                                ...household,
                                integration2,
                              })
                            }
                          />

                          <Check
                            label="Person 2: familiäre Belastung"
                            checked={
                              household.belastung2
                            }
                            onChange={(
                              belastung2
                            ) =>
                              setHousehold({
                                ...household,
                                belastung2,
                              })
                            }
                          />
                        </>
                      )}

                      <label className="block text-sm text-muted">
                        Begründung
                        <textarea
                          rows={4}
                          value={
                            household.begruendung
                          }
                          onChange={(
                            event
                          ) =>
                            setHousehold({
                              ...household,
                              begruendung:
                                event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
                        />
                      </label>
                    </div>
                  )}

                {needsDeclaration(
                  household
                ) && (
                  <div className="mt-4 flex flex-col gap-3">
                    <p className="font-medium">
                      Nachweise
                      statt
                      Veranlagung
                    </p>

                    <Check
                      label="Lohnausweis oder Lohnabrechnung"
                      checked={
                        household.nachweisLohn
                      }
                      onChange={(
                        nachweisLohn
                      ) =>
                        setHousehold({
                          ...household,
                          nachweisLohn,
                        })
                      }
                    />

                    <Check
                      label="Konto- oder Vermögensauszug"
                      checked={
                        household.nachweisKonto
                      }
                      onChange={(
                        nachweisKonto
                      ) =>
                        setHousehold({
                          ...household,
                          nachweisKonto,
                        })
                      }
                    />

                    <Check
                      label="Andere Belege"
                      checked={
                        household.nachweisAndere
                      }
                      onChange={(
                        nachweisAndere
                      ) =>
                        setHousehold({
                          ...household,
                          nachweisAndere,
                        })
                      }
                    />

                    <label className="block text-sm text-muted">
                      Welche Belege?

                      <textarea
                        rows={3}
                        value={
                          household.nachweisText
                        }
                        onChange={(
                          event
                        ) =>
                          setHousehold({
                            ...household,
                            nachweisText:
                              event.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
                      />
                    </label>

                    <Check
                      label="Ich bestätige, dass die Zahlen den Belegen entsprechen"
                      checked={
                        household.bestaetigung
                      }
                      onChange={(
                        bestaetigung
                      ) =>
                        setHousehold({
                          ...household,
                          bestaetigung,
                        })
                      }
                    />
                  </div>
                )}
              </Block>
            )}

            {step === "result" && (
              <div className="flex flex-col gap-4">
                {exceptionSubmitted &&
                  !pensumReached(
                    household
                  ) && (
                    <div
                      role="status"
                      className="rounded-card border border-amber-300 bg-amber-50 p-4 text-amber-950"
                    >
                      <p className="font-bold">
                        Ausnahme
                        muss
                        behördlich
                        geprüft
                        werden
                      </p>

                      <p className="mt-2 text-sm">
                        Das
                        erforderliche
                        Erwerbspensum
                        wird nicht
                        erreicht.
                        Sie haben
                        einen
                        möglichen
                        Ausnahmegrund
                        angegeben.
                      </p>

                      <p className="mt-2 text-sm">
                        Eine
                        allfällige
                        Beitragsberechnung
                        ist keine
                        Zusicherung
                        eines
                        Anspruchs.
                        Die
                        zuständige
                        Stelle
                        muss die
                        Ausnahme
                        zuerst
                        beurteilen.
                      </p>
                    </div>
                  )}

                <Suspense
                  fallback={
                    <p>
                      Beitrag wird
                      berechnet …
                    </p>
                  }
                >
                  <ResultPanel
                    household={
                      household
                    }
                    children={children.filter(
                      eligibleForCalculation
                    )}
                  />
                </Suspense>
              </div>
            )}

            {step !== "result" && (
              <button
                type="button"
                onClick={next}
                disabled={
                  !canContinue(
                    step,
                    household,
                    count,
                    children,
                    schoolStatus
                  )
                }
                className="mt-6 min-h-11 rounded-card bg-pine px-5 text-pine-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Weiter
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-4 font-serif text-3xl leading-tight">
        {title}
      </h2>

      {children}
    </div>
  );
}

function Choices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<
    [string, string]
  >;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(
        ([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              onChange(id)
            }
            className={
              "min-h-11 rounded-card border px-4 text-left " +
              (
                value === id
                  ? "border-pine bg-moss"
                  : "border-line bg-card"
              )
            }
          >
            {label}
          </button>
        )
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  onBlur?: () => void;
}) {
  return (
    <label className="mt-3 block text-sm text-muted">
      {label}

      <input
        type={type}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        onBlur={onBlur}
        autoCapitalize={
          type === "text"
            ? "words"
            : undefined
        }
        className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3 text-ink"
      />
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (
    value: number
  ) => void;
  max?: number;
}) {
  const invalid =
    !Number.isFinite(value) ||
    value < 0 ||
    (
      max !== undefined &&
      value > max
    );

  return (
    <label className="block text-sm text-muted">
      <span className="block font-medium text-ink">
        {label}
      </span>

      <input
        type="number"
        min={0}
        max={max}
        step="any"
        inputMode="decimal"
        value={
          Number.isFinite(
            value
          )
            ? value
            : 0
        }
        onFocus={(
          event
        ) => {
          if (
            event.currentTarget
              .value === "0"
          ) {
            event.currentTarget.select();
          }
        }}
        onKeyDown={(
          event
        ) => {
          if (
            event.key === "-" ||
            event.key === "+"
          ) {
            event.preventDefault();
          }
        }}
        onChange={(
          event
        ) => {
          const raw =
            event.currentTarget
              .value;

          if (raw === "") {
            onChange(0);
            return;
          }

          const number =
            Number(raw);

          if (
            !Number.isFinite(
              number
            ) ||
            number < 0 ||
            (
              max !==
                undefined &&
              number > max
            )
          ) {
            return;
          }

          onChange(number);
        }}
        aria-invalid={
          invalid
        }
        className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3 text-ink"
      />

      {invalid && (
        <span className="mt-1 block text-sm text-clay">
          Bitte einen
          gültigen Wert
          eingeben.
        </span>
      )}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    value: boolean
  ) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(
          event
        ) =>
          onChange(
            event.target.checked
          )
        }
        className="mt-1"
      />

      <span>
        {label}
      </span>
    </label>
  );
}

function IncomeFields({
  title,
  path,
  value,
  onChange,
}: {
  title: string;
  path: TaxPath;
  value: IncomeInput;
  onChange: (
    next: IncomeInput
  ) => void;
}) {
  const set = (
    key: keyof IncomeInput,
    amount: number
  ) => {
    onChange({
      ...value,
      [key]: amount,
    });
  };

  return (
    <fieldset className="mt-4 rounded-card bg-sand p-4">
      <legend className="font-medium">
        {title}
      </legend>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {path ===
        "quellen" ? (
          <>
            <Num
              label="Bruttoeinkommen gemäss Quellensteuerunterlagen"
              value={
                value.bruttoQuellen
              }
              onChange={(
                n
              ) =>
                set(
                  "bruttoQuellen",
                  n
                )
              }
            />

            <Num
              label="Bruttolohn im vereinfachten Abrechnungsverfahren"
              value={
                value.bruttolohnEinfach
              }
              onChange={(
                n
              ) =>
                set(
                  "bruttolohnEinfach",
                  n
                )
              }
            />
          </>
        ) : path ===
          "keine-veranlagung" ? (
          <>
            <Num
              label="Einkommen gemäss Einkommensnachweisen"
              value={
                value.reineinkommen
              }
              onChange={(
                n
              ) =>
                set(
                  "reineinkommen",
                  n
                )
              }
            />

            <Num
              label="Vermögen gemäss Vermögensnachweisen"
              value={
                value.vermoegen
              }
              onChange={(
                n
              ) =>
                set(
                  "vermoegen",
                  n
                )
              }
            />
          </>
        ) : (
          <>
            <Num
              label="Reineinkommen gemäss Steuerunterlagen"
              value={
                value.reineinkommen
              }
              onChange={(
                n
              ) =>
                set(
                  "reineinkommen",
                  n
                )
              }
            />

            <Num
              label="Steuerbares Vermögen gemäss Steuerunterlagen"
              value={
                value.vermoegen
              }
              onChange={(
                n
              ) =>
                set(
                  "vermoegen",
                  n
                )
              }
            />

            <Num
              label="Beiträge an die Säule 3a"
              value={
                value.saeule3a
              }
              onChange={(
                n
              ) =>
                set(
                  "saeule3a",
                  n
                )
              }
            />

            <Num
              label="Massgebende BVG-Leistungen und Pensionskasseneinkäufe"
              value={
                value.bvg
              }
              onChange={(
                n
              ) =>
                set(
                  "bvg",
                  n
                )
              }
            />

            <Num
              label="Liegenschaftsaufwand über dem Pauschalabzug"
              value={
                value.liegenschaft
              }
              onChange={(
                n
              ) =>
                set(
                  "liegenschaft",
                  n
                )
              }
            />

            <Num
              label="Steuerlich berücksichtigte Vorjahresverluste"
              value={
                value.verlust
              }
              onChange={(
                n
              ) =>
                set(
                  "verlust",
                  n
                )
              }
            />

            <Num
              label="Bruttolohn im vereinfachten Abrechnungsverfahren"
              value={
                value.bruttolohnEinfach
              }
              onChange={(
                n
              ) =>
                set(
                  "bruttolohnEinfach",
                  n
                )
              }
            />

            <Num
              label="Steuerlich ausgewiesene freiwillige Zuwendungen"
              value={
                value.zuwendungen
              }
              onChange={(
                n
              ) =>
                set(
                  "zuwendungen",
                  n
                )
              }
            />

            <Num
              label="Eigenmietwert gemäss Steuerunterlagen"
              value={
                value.eigenmietwert
              }
              onChange={(
                n
              ) =>
                set(
                  "eigenmietwert",
                  n
                )
              }
            />

            <Num
              label="Erträge aus qualifizierten Geschäftsbeteiligungen"
              value={
                value.beteiligungGeschaeft
              }
              onChange={(
                n
              ) =>
                set(
                  "beteiligungGeschaeft",
                  n
                )
              }
            />

            <Num
              label="Erträge aus qualifizierten privaten Beteiligungen"
              value={
                value.beteiligungPrivat
              }
              onChange={(
                n
              ) =>
                set(
                  "beteiligungPrivat",
                  n
                )
              }
            />
          </>
        )}
      </div>

      {path ===
        "quellen" && (
        <Check
          label="Grenzgängerin oder Grenzgänger"
          checked={
            value.grenzgaenger
          }
          onChange={(
            grenzgaenger
          ) =>
            onChange({
              ...value,
              grenzgaenger,
            })
          }
        />
      )}

      {path ===
        "quellen" &&
        value.grenzgaenger && (
          <Num
            label="Massgebender Kaufkraftindex"
            value={
              value.kaufkraft
            }
            onChange={(
              kaufkraft
            ) =>
              onChange({
                ...value,
                kaufkraft,
              })
            }
          />
        )}
    </fieldset>
  );
}

function CurrentFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: IncomeInput;
  onChange: (
    next: IncomeInput
  ) => void;
}) {
  return (
    <div className="mt-4">
      <Check
  label={`Aktuelle Einkommenssituation angeben – ${label.includes("anderen Person") ? "Person 2" : "Person 1"}`}
  checked={value.aktuellBekannt}
  onChange={(aktuellBekannt) =>
    onChange({
      ...value,
      aktuellBekannt,
    })
  }
/>

      {value.aktuellBekannt && (
        <div className="mt-3">
          <Num
            label={label}
            value={
              value.aktuell
            }
            onChange={(
              aktuell
            ) =>
              onChange({
                ...value,
                aktuell,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
