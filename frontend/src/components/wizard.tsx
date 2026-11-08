import { lazy, Suspense, useState, type ReactNode } from "react";
import { Overview } from "@/components/overview";
import { Articles, type ArticleStep } from "@/components/articles";
import { CareCalendar } from "@/components/care-calendar";
import {
  type ChildInput,
  type HouseholdInput,
  type IncomeInput,
  type TaxPath,
  ebCount,
  REF,
  ageMonths,
  isChildTooYoung,
  emptyIncome,
  needsDeclaration,
  needsMeldung,
  thresholdMet,
} from "@/lib/kibg";

const ResultPanel = lazy(() => import("@/components/result-panel"));

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

function flowFor(household: HouseholdInput): ArticleStep[] {
  const steps: ArticleStep[] = [
    "wohnsitz",
    "kinder",
    "kalender",
    "haushalt",
    "einkommen",
    "aktuell",
  ];
  if (needsMeldung(household)) steps.push("meldung");
  steps.push("result");
  return steps;
}

function blankChild(index: number): ChildInput {
  return {
    id: `kind-${index}-${Math.random().toString(36).slice(2, 7)}`,
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

export function Wizard() {
  const [screen, setScreen] = useState<"gate" | "kanton" | "flow">("gate");
  const [stepIndex, setStepIndex] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [children, setChildren] = useState<ChildInput[]>([blankChild(1)]);
  const [household, setHousehold] = useState<HouseholdInput>(blankHousehold);
  const flow = flowFor(household);
  const step = flow[Math.min(stepIndex, flow.length - 1)] ?? "wohnsitz";

  function restart() {
    setScreen("gate");
    setStepIndex(0);
    setBlocked(null);
    setCount(1);
    setChildren([blankChild(1)]);
    setHousehold(blankHousehold());
  }

  function back() {
    if (blocked) {
      setBlocked(null);
      return;
    }
    if (stepIndex === 0) setScreen("gate");
    else setStepIndex((n) => n - 1);
  }

  function next() {
    if (step === "wohnsitz" && household.wohnsitz === false) {
      setBlocked("Ohne Wohnsitz im Kanton St. Gallen besteht kein Anspruch.");
      return;
    }
    if (step === "kinder") {
      const n = Math.min(6, Math.max(1, count));

      if (Array.from({ length: n }, (_, i) => children[i]).every(
        (child) => child && isChildTooYoung(child),
      )) {
        setBlocked(
          "Alle erfassten Kinder sind am 1. November 2026 " +
          "noch unter drei Monaten alt. Für diesen Bezugsmonat " +
          "ist nach dem hinterlegten Rechenmodell kein Beitrag " +
          "möglich (CHF 0). Weitere Angaben sind nicht erforderlich."
        );
        return;
      }
      setChildren((prev) =>
        Array.from({ length: n }, (_, i) => prev[i] ?? blankChild(i + 1)),
      );
    }
    setStepIndex((n) => Math.min(flow.length - 1, n + 1));
  }

  function updateChild(
    index: number,
    patch: Partial<
      Pick<ChildInput, "firstName" | "lastName" | "birth" | "einschulung" | "primarEnde" | "kindlicheIndikation">
    >,
  ) {
    setChildren((prev) => {
      const nextChildren = [...prev];
      const current = nextChildren[index] ?? blankChild(index + 1);
      const updated = { ...current, ...patch };

      updated.name = [
        updated.firstName,
        updated.lastName,
      ]
        .map((part) => (part ?? "").trim())
        .filter(Boolean)
        .join(" ") || `Kind ${index + 1}`;

      nextChildren[index] = updated;
      return nextChildren;
    });
  }

  if (screen === "gate") {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-5 py-10">
        <p className="text-sm font-medium tracking-wide text-pine uppercase">Kanton St. Gallen</p>
        <h1 className="max-w-xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Beitrag für die Kinderbetreuung
        </h1>
        <p className="max-w-lg text-lg text-muted">
          Zwei Wege. Das eigene Gesuch prüfen, oder anschauen, was von einem zusätzlichen Lohn
          bleibt, wenn Regeln und Hebel sich ändern.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setScreen("flow")}
            className="min-h-24 rounded-card bg-pine px-6 text-left text-pine-ink"
          >
            <span className="block font-serif text-2xl">Privatperson</span>
            <span className="text-pine-ink">Anspruch und Beitrag prüfen</span>
          </button>
          <button
            type="button"
            onClick={() => setScreen("kanton")}
            className="min-h-24 rounded-card border border-line bg-card px-6 text-left"
          >
            <span className="block font-serif text-2xl">Wirkung ansehen</span>
            <span className="text-muted">Was von 100 Franken Mehrlohn bleibt</span>
          </button>
        </div>
      </main>
    );
  }

  if (screen === "kanton") {
    return <Overview onBack={() => setScreen("gate")} />;
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-6">
      <Articles step={blocked ? "wohnsitz" : step} />
      <section className="rounded-card border border-line bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3 text-sm text-muted">
          <button type="button" onClick={back} className="min-h-11">
            Zurück
          </button>
          <span>
            {blocked
              ? "Kein Anspruch"
              : `${Math.min(stepIndex, flow.length - 1) + 1} / ${flow.length} · ${TITLES[step]}`}
          </span>
          <button type="button" onClick={restart} className="min-h-11">
            Neu
          </button>
        </div>
        {blocked ? (
          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-3xl">Leider kein Anspruch</h2>
            <p>{blocked}</p>
            <button
              type="button"
              onClick={restart}
              className="min-h-11 self-start rounded-card bg-pine px-4 text-pine-ink"
            >
              Von vorn
            </button>
          </div>
        ) : (
          <>
            {step === "wohnsitz" && (
              <Block title="Haben Sie Ihren Wohnsitz im Kanton St. Gallen?">
                <Choices
                  value={household.wohnsitz === null ? "" : household.wohnsitz ? "ja" : "nein"}
                  options={[
                    ["ja", "Ja"],
                    ["nein", "Nein"],
                  ]}
                  onChange={(value) => setHousehold({ ...household, wohnsitz: value === "ja" })}
                />
              </Block>
            )}
            {step === "kinder" && (
              <Block title="Für wie viele Kinder möchten Sie einen Betreuungsbeitrag beantragen?">
                <label className="block text-sm text-muted">
                  Anzahl
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={count}
                    onChange={(e) => {
                      const n = Number(e.target.value);

                      if (
                        Number.isInteger(n) &&
                        n >= 1 &&
                        n <= 6
                      ) {
                        setCount(n);
                      }
                    }}
                    className="mt-1 min-h-11 w-24 rounded-card border border-line px-3"
                  />
                </label>
                <div className="mt-4 flex flex-col gap-4">
                  {Array.from({ length: Math.min(6, Math.max(1, count)) }, (_, index) => {
                    const child =
                      children[index] ?? blankChild(index + 1);

                    const validBirth =
                      validDate(child.birth) &&
                      child.birth <= dateISO(REF);

                    const months = validBirth
                      ? ageMonths(child.birth, REF)
                      : null;

                    const tooYoung =
                      validBirth && isChildTooYoung(child);

                    const schoolRelevant =
                      months !== null && months >= 48;

                    return (
                      <fieldset
                        key={index}
                        className="rounded-card bg-sand p-4"
                      >
                        <legend className="font-medium">
                          Kind {index + 1}
                        </legend>

                        <Field
                          label="Vorname des Kindes *"
                          value={child.firstName ?? ""}
                          onChange={(firstName) =>
                            updateChild(index, { firstName })
                          }
                          onBlur={() => updateChild(index, { firstName: formatPersonName(child.firstName ?? "") })}
                        />

                        <Field
                          label="Nachname des Kindes *"
                          value={child.lastName ?? ""}
                          onChange={(lastName) =>
                            updateChild(index, { lastName })
                          }
                          onBlur={() => updateChild(index, { lastName: formatPersonName(child.lastName ?? "") })}
                        />

                        <Field
                          label="Geburtsdatum des Kindes *"
                          type="date"
                          value={child.birth}
                          onChange={(birth) =>
                            updateChild(index, {
                              birth,
                              ...(birth &&
                              validDate(birth) &&
                              ageMonths(birth, REF) < 48
                                ? {
                                    einschulung: "",
                                    primarEnde: "",
                                  }
                                : {}),
                            })
                          }
                        />

                        {child.birth && !validBirth && (
                          <p
                            className="mt-2 text-sm text-clay"
                            role="alert"
                          >
                            Bitte ein gültiges Geburtsdatum
                            bis zum 1. November 2026 eingeben.
                          </p>
                        )}

                        {tooYoung && (
                          <p className="mt-3 rounded-card bg-moss p-3 text-sm text-ink">
                            Dieses Kind ist noch keine 3 Monate
                            alt und wird deshalb bei der
                            Beitragsberechnung nicht berücksichtigt.
                            Sie müssen für dieses Kind keine
                            weiteren Angaben machen.
                          </p>
                        )}

                        {schoolRelevant && (
                          <div className="mt-3">
                            <p className="mb-2 font-medium">
                              Ist das Kind bereits eingeschult?
                            </p>

                            <Choices
                              value={
                                child.einschulung
                                  ? "ja"
                                  : "nein"
                              }
                              options={[
                                ["nein", "Nein"],
                                ["ja", "Ja"],
                              ]}
                              onChange={(value) =>
                                updateChild(index, {
                                  einschulung:
                                    value === "ja"
                                      ? child.einschulung ||
                                        dateISO(REF)
                                      : "",
                                  primarEnde:
                                    value === "ja"
                                      ? child.primarEnde
                                      : "",
                                })
                              }
                            />

                            {child.einschulung && (
                              <>
                                <Field
                                  label="Datum der Einschulung *"
                                  type="date"
                                  value={child.einschulung}
                                  onChange={(einschulung) =>
                                    updateChild(index, {
                                      einschulung,
                                    })
                                  }
                                />

                                <Field
                                  label="Ende der Primarstufe (falls bekannt, optional)"
                                  type="date"
                                  value={child.primarEnde}
                                  onChange={(primarEnde) =>
                                    updateChild(index, {
                                      primarEnde,
                                    })
                                  }
                                />

                                {(
                                  !validDate(child.einschulung) ||
                                  child.einschulung > dateISO(REF) ||
                                  child.einschulung < child.birth ||
                                  (
                                    child.primarEnde &&
                                    (
                                      !validDate(child.primarEnde) ||
                                      child.primarEnde <
                                        child.einschulung
                                    )
                                  )
                                ) && (
                                  <p
                                    className="mt-2 text-sm text-clay"
                                    role="alert"
                                  >
                                    Bitte die Schultermine
                                    überprüfen. Die Einschulung
                                    darf nicht nach dem
                                    Bezugsmonat oder vor der
                                    Geburt liegen.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </fieldset>
                    );
                  })}
                </div>
              </Block>
            )}
            {step === "kalender" && (
              <Block title="Angaben zur familienergänzenden Kinderbetreuung">
                <p className="text-muted">
                  Nur Tage mit Obhut. Art der Betreuung und Stunden eintragen. Das Wochenmuster
                  lässt sich auf zwölf Monate kopieren.
                </p>
                <CareCalendar
                  children={children.filter(
                    (child) => !isChildTooYoung(child)
                  )}
                  onChange={(updatedChildren) => {
                    setChildren((previousChildren) => {
                      const updates = new Map(
                        updatedChildren.map((child) => [
                          child.id,
                          child,
                        ])
                      );

                      return previousChildren.map(
                        (child) => updates.get(child.id) ?? child
                      );
                    });
                  }}
                />
              </Block>
            )}
            {step === "haushalt" && (
              <Block title="Angaben zur Wohn- und Erwerbssituation">
                <Choices
                  value={household.zusammen ?? ""}
                  options={[
                    ["gemeinsam", "Gemeinsamer Haushalt"],
                    ["getrennt", "Getrennter Haushalt"],
                  ]}
                  onChange={(zusammen) =>
                    setHousehold({
                      ...household,
                      zusammen: zusammen as HouseholdInput["zusammen"],
                    })
                  }
                />
                {household.zusammen === "gemeinsam" && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium">Welche Personen sind erwerbstätig?</p>
                    <Choices
                      value={household.erwerb ?? ""}
                      options={[
                        ["beide", "Beide"],
                        ["eine", "Nur eine Person"],
                      ]}
                      onChange={(erwerb) =>
                        setHousehold({ ...household, erwerb: erwerb as HouseholdInput["erwerb"] })
                      }
                    />
                  </div>
                )}
                {household.zusammen === "getrennt" && (
                  <div className="mt-4">
                    <p className="mb-2 font-medium">Welche Wohn- und Familiensituation trifft auf Sie zu?</p>
                    <Choices
                      value={household.getrenntArt ?? ""}
                      options={[
                        ["ehe", "Ehe oder eingetragene Partnerschaft"],
                        ["konkubinat", "Konkubinat"],
                        ["alleine", "Ich lebe alleine"],
                      ]}
                      onChange={(getrenntArt) =>
                        setHousehold({
                          ...household,
                          getrenntArt: getrenntArt as HouseholdInput["getrenntArt"],
                        })
                      }
                    />
                  </div>
                )}
                {household.getrenntArt === "konkubinat" && household.zusammen === "getrennt" && (
                  <div className="mt-4 flex flex-col gap-3">
                    <Num
                      label="Dauer der Lebensgemeinschaft (Jahre)"
                      value={household.konkubinatJahre}
                      onChange={(konkubinatJahre) => setHousehold({ ...household, konkubinatJahre })}
                    />
                    <Check
                      label="Die andere Person ist ebenfalls erziehungsberechtigt"
                      checked={household.partnerErziehungsberechtigt}
                      onChange={(partnerErziehungsberechtigt) =>
                        setHousehold({ ...household, partnerErziehungsberechtigt })
                      }
                    />
                  </div>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Num
                    label={
                      household.erwerb === "beide" || household.getrenntArt === "ehe"
                        ? "Pensum Person 1 in Prozent"
                        : "Pensum in Prozent"
                    }
                    value={household.pensum1}
                    onChange={(pensum1) => setHousehold({ ...household, pensum1 })}
                  />
                  {(household.erwerb === "beide" ||
                    household.getrenntArt === "ehe" ||
                    (household.getrenntArt === "konkubinat" &&
                      household.partnerErziehungsberechtigt)) && (
                    <Num
                      label="Beschäftigungsgrad Person 2 (in %)"
                      value={household.pensum2}
                      onChange={(pensum2) => setHousehold({ ...household, pensum2 })}
                    />
                  )}
                </div>
                <p className="mt-3 text-sm text-muted">
                  Eine Person: mindestens 20 Prozent. Zwei Personen: zusammen mindestens 120 Prozent.
                </p>
              </Block>
            )}
            {step === "einkommen" && (
              <Block title="Welche steuerliche Situation trifft auf Sie zu?">
                <Choices
                  value={household.taxPath ?? ""}
                  options={[
                    ["ordentlich", "Ordentlich besteuert, Veranlagung rechtskräftig"],
                    ["nicht-rechtskraeftig", "Keine rechtskräftige Steuerveranlagung"],
                    ["quellen", "Quellenbesteuert"],
                    ["keine-veranlagung", "Keine ordentliche Steuerveranlagung"],
                  ]}
                  onChange={(taxPath) => setHousehold({ ...household, taxPath: taxPath as TaxPath })}
                />
                {household.taxPath === "quellen" && (
                  <p className="mt-3 text-sm text-muted">
                    Art. 12bis: definitives Bruttoeinkommen der Quellensteuer 2024 plus Lohn aus
                    dem vereinfachten Verfahren, davon 75 Prozent.
                  </p>
                )}
                {household.taxPath === "nicht-rechtskraeftig" && (
                  <p className="mt-3 text-sm text-muted">
                    Art. 12 Abs. 1: ohne rechtskräftige Veranlagung gilt die Steuerdeklaration,
                    mit denselben Zuschlägen wie bei der Veranlagung. Art. 12bis gilt hier nicht.
                  </p>
                )}
                {household.taxPath === "keine-veranlagung" && (
                  <p className="mt-3 text-sm text-muted">
                    Art. 12a: Einkommens- und Vermögensnachweise. Vermögen zählt zu 20 Prozent.
                  </p>
                )}
                {household.taxPath && (
                  <IncomeFields
                    title="Ihre finanziellen Angaben – Steuerjahr 2024"
                    path={household.taxPath}
                    value={household.income1}
                    onChange={(income1) => setHousehold({ ...household, income1 })}
                  />
                )}
                {household.taxPath && needsPartner(household) && (
                  <IncomeFields
                    title="Finanzielle Angaben der weiteren Person – Steuerjahr 2024"
                    path={household.taxPath}
                    value={household.income2}
                    onChange={(income2) => setHousehold({ ...household, income2 })}
                  />
                )}
              </Block>
            )}
            {step === "aktuell" && (
              <Block title="Angaben zur aktuellen Einkommenssituation">
                <p className="text-muted">
                  Nur ausfüllen, wenn Sie die aktuelle Lage kennen. Ab 25 Prozent Abweichung
                  ersetzt sie die Veranlagung.
                </p>
                <CurrentFields
                  label="Ihr heutiges massgebendes Einkommen"
                  value={household.income1}
                  onChange={(income1) => setHousehold({ ...household, income1 })}
                />
                {needsPartner(household) && (
                  <CurrentFields
                    label="Heutiges Einkommen der anderen Person"
                    value={household.income2}
                    onChange={(income2) => setHousehold({ ...household, income2 })}
                  />
                )}
              </Block>
            )}
            {step === "meldung" && (
              <Block title="Ergänzende Angaben und Nachweise">
                {!thresholdMet(household) && (
                  <div className="flex flex-col gap-3">
                    <p className="text-muted">
                      Das Pensum liegt unter {ebCount(household) === 1 ? "20" : "120"} Prozent.
                      Mindestens ein Grund nach Art. 12 KiBV und eine kurze Begründung.
                    </p>
                    <Check
                      label="Person 1: berufliche Integration, Stellensuche oder Weiterbildung"
                      checked={household.integration1}
                      onChange={(integration1) => setHousehold({ ...household, integration1 })}
                    />
                    <Check
                      label="Person 1: familiäre Belastung"
                      checked={household.belastung1}
                      onChange={(belastung1) => setHousehold({ ...household, belastung1 })}
                    />
                    {ebCount(household) > 1 && (
                      <>
                        <Check
                          label="Person 2: berufliche Integration, Stellensuche oder Weiterbildung"
                          checked={household.integration2}
                          onChange={(integration2) => setHousehold({ ...household, integration2 })}
                        />
                        <Check
                          label="Person 2: familiäre Belastung"
                          checked={household.belastung2}
                          onChange={(belastung2) => setHousehold({ ...household, belastung2 })}
                        />
                      </>
                    )}
                    {children.map((child, index) =>
                      isChildTooYoung(child) ? null : (
                      <Check
                        key={child.id}
                        label={`${child.name || `Kind ${index + 1}`}: Entwicklungs-, Verhaltens- oder Sprachindikation`}
                        checked={child.kindlicheIndikation}
                        onChange={(kindlicheIndikation) => updateChild(index, { kindlicheIndikation })}
                      />
                    ))}
                    <label className="block text-sm text-muted">
                      Begründung für den Kanton
                      <textarea
                        value={household.begruendung}
                        onChange={(e) => setHousehold({ ...household, begruendung: e.target.value })}
                        rows={4}
                        className="mt-1 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
                      />
                    </label>
                  </div>
                )}
                {needsDeclaration(household) && (
                  <div className="mt-4 flex flex-col gap-3">
                    <p className="font-medium">Nachweise statt Veranlagung</p>
                    <Check
                      label="Lohnausweis oder Lohnabrechnung"
                      checked={household.nachweisLohn}
                      onChange={(nachweisLohn) => setHousehold({ ...household, nachweisLohn })}
                    />
                    <Check
                      label="Konto- oder Vermögensauszug"
                      checked={household.nachweisKonto}
                      onChange={(nachweisKonto) => setHousehold({ ...household, nachweisKonto })}
                    />
                    <Check
                      label="Andere Belege"
                      checked={household.nachweisAndere}
                      onChange={(nachweisAndere) => setHousehold({ ...household, nachweisAndere })}
                    />
                    <label className="block text-sm text-muted">
                      Welche Belege, kurz
                      <textarea
                        value={household.nachweisText}
                        onChange={(e) => setHousehold({ ...household, nachweisText: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-card border border-line bg-card px-3 py-2 text-ink"
                      />
                    </label>
                    <Check
                      label="Ich bestätige, dass die Zahlen den Belegen entsprechen"
                      checked={household.bestaetigung}
                      onChange={(bestaetigung) => setHousehold({ ...household, bestaetigung })}
                    />
                  </div>
                )}
              </Block>
            )}
            {step === "result" && (
              <Suspense fallback={<p>Beitrag wird gerechnet …</p>}>
                <ResultPanel household={household} children={children} />
              </Suspense>
            )}
            {step !== "result" && (
              <button
                type="button"
                onClick={next}
                disabled={!canContinue(step, household, count, children)}
                className="mt-6 min-h-11 rounded-card bg-pine px-5 text-pine-ink disabled:opacity-40"
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

function needsPartner(h: HouseholdInput) {
  if (h.zusammen === "gemeinsam") return h.erwerb === "beide";
  if (h.getrenntArt === "ehe") return true;
  if (h.getrenntArt === "konkubinat") return h.konkubinatJahre >= 2 || h.partnerErziehungsberechtigt;
  return false;
}

function exceptionReady(h: HouseholdInput, kids: ChildInput[]) {
  return (
    h.integration1 ||
    h.integration2 ||
    h.belastung1 ||
    h.belastung2 ||
    kids.some(
      (child) =>
        !isChildTooYoung(child) &&
        child.kindlicheIndikation
    )
  );
}

function canContinue(step: ArticleStep, h: HouseholdInput, count: number, kids: ChildInput[]) {
  if (step === "wohnsitz") return h.wohnsitz !== null;
  if (step === "kinder") {
    const n = Math.min(6, Math.max(1, count));
    return Array.from({ length: n }, (_, i) => {
      const child = kids[i];

      if (
        !child ||
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

      if (
        child.einschulung &&
        (
          !validDate(child.einschulung) ||
          child.einschulung > dateISO(REF) ||
          child.einschulung < child.birth
        )
      ) {
        return false;
      }

      if (
        child.primarEnde &&
        (
          !child.einschulung ||
          !validDate(child.primarEnde) ||
          child.primarEnde < child.einschulung
        )
      ) {
        return false;
      }

      return true;
    });
  }
  if (step === "haushalt") {
    if (
      h.pensum1 < 0 ||
      h.pensum1 > 100 ||
      h.pensum2 < 0 ||
      h.pensum2 > 100 ||
      h.konkubinatJahre < 0
    ) {
      return false;
    }

    if (!h.zusammen) return false;
    if (h.zusammen === "gemeinsam" && !h.erwerb) return false;
    if (h.zusammen === "getrennt" && !h.getrenntArt) return false;
    return true;
  }
  if (step === "einkommen") {
    if (h.taxPath === null) return false;

    const allValues = [
      h.income1,
      h.income2,
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

    return allValues.every(
      (n) => Number.isFinite(n) && n >= 0
    );
  }
  if (step === "meldung") {
    const ausnahmeOk = thresholdMet(h) || (exceptionReady(h, kids) && h.begruendung.trim().length > 8);
    const deklariert = !needsDeclaration(h) || h.bestaetigung;
    return ausnahmeOk && deklariert;
  }
  return true;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 font-serif text-3xl leading-tight">{title}</h2>
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
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`min-h-11 rounded-card border px-4 text-left ${
            value === id ? "border-pine bg-moss" : "border-line bg-card"
          }`}
        >
          {label}
        </button>
      ))}
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
  onChange: (value: string) => void;
  type?: string;
  onBlur?: () => void;
}) {
  return (
    <label className="mt-3 block text-sm text-muted">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoCapitalize={
          type === "text" ? "words" : undefined
        }
        className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3 text-ink"
      />
    </label>
  );
}

const FINANCE_HINTS: Record<string, string> = {
  "Reineinkommen gemäss Steuerunterlagen":
    "Bitte den ausgewiesenen Betrag aus der Steuerveranlagung bzw. Steuerdeklaration übernehmen – nicht den Bruttolohn.",

  "Steuerbares Vermögen gemäss Steuerunterlagen":
    "Massgebend ist das steuerbare Vermögen, nicht der gesamte Kontostand.",

  "Beiträge an die gebundene Selbstvorsorge (Säule 3a)":
    "Bitte den Betrag gemäss den Steuerunterlagen für das angegebene Steuerjahr eintragen.",

  "Massgebende BVG-Leistungen und Pensionskasseneinkäufe":
    "Nur die relevanten Beträge gemäss Steuerunterlagen, nicht das gesamte Pensionskassenguthaben.",

  "Steuerlich berücksichtigte Vorjahresverluste":
    "Nur steuerlich ausgewiesene Verlustvorträge berücksichtigen.",

  "Eigenmietwert gemäss Steuerunterlagen":
    "Nur ausfüllen, wenn in Ihren Steuerunterlagen ein Eigenmietwert ausgewiesen ist.",

  "Liegenschaftsaufwand über dem Pauschalabzug":
    "Den über den Pauschalabzug hinausgehenden Betrag gemäss Steuerunterlagen eintragen.",

  "Massgebender Kaufkraftindex":
    "Nur relevant, wenn Sie als Grenzgängerin oder Grenzgänger einen Kaufkraftindex anwenden müssen.",
};

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const isPensum =
    label.includes("Beschäftigungsgrad") ||
    label.includes("Pensum");

  const isYears = label.includes("Lebensgemeinschaft");

  const max = isPensum || isYears ? 100 : undefined;

  const invalid =
    !Number.isFinite(value) ||
    value < 0 ||
    (max !== undefined && value > max);

  return (
    <label className="block text-sm text-muted">
      <span className="block font-medium text-ink">
        {label}
      </span>

      {FINANCE_HINTS[label] && (
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {FINANCE_HINTS[label]}
        </span>
      )}

      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="any"
        value={Number.isFinite(value) ? value : 0}
        onFocus={(e) => {
          if (e.currentTarget.value === "0") {
            e.currentTarget.select();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "+") {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const raw = e.currentTarget.value;

          if (raw === "") {
            onChange(0);
            return;
          }

          const number = Number(raw);

          if (!Number.isFinite(number) || number < 0) {
            return;
          }

          if (max !== undefined && number > max) {
            return;
          }

          onChange(number);
        }}
        aria-invalid={invalid}
        className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3 text-ink"
      />

      {invalid && (
        <span
          className="mt-1 block text-sm text-clay"
          role="alert"
        >
          Bitte einen gültigen Betrag von 0
          {max !== undefined
            ? ` bis ${max}`
            : " aufwärts"} eingeben.
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
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-start gap-2">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
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
  onChange: (next: IncomeInput) => void;
}) {
  const set = (key: keyof IncomeInput, amount: number) => onChange({ ...value, [key]: amount });
  return (
    <fieldset className="mt-4 rounded-card bg-sand p-4">
      <legend className="font-medium">{title}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {path === "quellen" ? (
          <>
            <Num
              label="Bruttoeinkommen gemäss Quellensteuerunterlagen"
              value={value.bruttoQuellen}
              onChange={(n) => set("bruttoQuellen", n)}
            />
            <Num
              label="Bruttolohn im vereinfachten Abrechnungsverfahren"
              value={value.bruttolohnEinfach}
              onChange={(n) => set("bruttolohnEinfach", n)}
            />
          </>
        ) : path === "keine-veranlagung" ? (
          <>
            <Num
              label="Einkommen gemäss Einkommensnachweisen"
              value={value.reineinkommen}
              onChange={(n) => set("reineinkommen", n)}
            />
            <Num
              label="Vermögen gemäss Vermögensnachweisen"
              value={value.vermoegen}
              onChange={(n) => set("vermoegen", n)}
            />
          </>
        ) : (
          <>
            <Num label="Reineinkommen gemäss Steuerunterlagen" value={value.reineinkommen} onChange={(n) => set("reineinkommen", n)} />
            <Num label="Steuerbares Vermögen gemäss Steuerunterlagen" value={value.vermoegen} onChange={(n) => set("vermoegen", n)} />
            <Num label="Beiträge an die gebundene Selbstvorsorge (Säule 3a)" value={value.saeule3a} onChange={(n) => set("saeule3a", n)} />
            <Num label="Massgebende BVG-Leistungen und Pensionskasseneinkäufe" value={value.bvg} onChange={(n) => set("bvg", n)} />
            <Num
              label="Liegenschaftsaufwand über dem Pauschalabzug"
              value={value.liegenschaft}
              onChange={(n) => set("liegenschaft", n)}
            />
            <Num label="Steuerlich berücksichtigte Vorjahresverluste" value={value.verlust} onChange={(n) => set("verlust", n)} />
            <Num
              label="Bruttolohn im vereinfachten Abrechnungsverfahren"
              value={value.bruttolohnEinfach}
              onChange={(n) => set("bruttolohnEinfach", n)}
            />
            <Num label="Steuerlich ausgewiesene freiwillige Zuwendungen" value={value.zuwendungen} onChange={(n) => set("zuwendungen", n)} />
            <Num label="Eigenmietwert gemäss Steuerunterlagen" value={value.eigenmietwert} onChange={(n) => set("eigenmietwert", n)} />
            <Num
              label="Erträge aus qualifizierten Geschäftsbeteiligungen"
              value={value.beteiligungGeschaeft}
              onChange={(n) => set("beteiligungGeschaeft", n)}
            />
            <Num
              label="Erträge aus qualifizierten privaten Beteiligungen"
              value={value.beteiligungPrivat}
              onChange={(n) => set("beteiligungPrivat", n)}
            />
          </>
        )}
      </div>
      {path === "quellen" && (
        <label className="mt-3 flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={value.grenzgaenger}
            onChange={(e) => onChange({ ...value, grenzgaenger: e.target.checked })}
          />
          Grenzgängerin oder Grenzgänger
        </label>
      )}
      {path === "quellen" && value.grenzgaenger && (
        <div className="mt-3">
          <Num
            label="Massgebender Kaufkraftindex"
            value={value.kaufkraft}
            onChange={(kaufkraft) => onChange({ ...value, kaufkraft })}
          />
        </div>
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
  onChange: (next: IncomeInput) => void;
}) {
  return (
    <div className="mt-4">
      <Check
        label="Aktuelle Lage ist bekannt"
        checked={value.aktuellBekannt}
        onChange={(aktuellBekannt) => onChange({ ...value, aktuellBekannt })}
      />
      {value.aktuellBekannt && (
        <div className="mt-3">
          <Num label={label} value={value.aktuell} onChange={(aktuell) => onChange({ ...value, aktuell })} />
        </div>
      )}
    </div>
  );
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < 1900 || year > 9999) {
    return false;
  }

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function dateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
