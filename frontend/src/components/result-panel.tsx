
import ResultExplanation from "./result-explanation";
import ApplicationForm from "./application-form";

import { useMemo, useState } from "react";

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChildInput,
  type HouseholdInput,
  MAX_INCOME,
  MIN_INCOME,
  assess,
  chf,
  chfExact,
  curve,
  exceptionGranted,
  needsDeclaration,
  thresholdMet,
} from "@/lib/kibg";

export default function ResultPanel({
  household,
  children,
}: {
  household: HouseholdInput;
  children: ChildInput[];
}) {
  const base = assess(household, children);

  const [income, setIncome] = useState(
    Math.round(base.massgebend)
  );

  const [showApplication, setShowApplication] =
    useState(false);

  const view = useMemo(
    () => assess(household, children, income),
    [household, children, income]
  );

  const data = useMemo(
    () => curve(household, children),
    [household, children]
  );

  const pensumErfuellt = thresholdMet(household);

  const ausnahmeAngegeben =
    !pensumErfuellt &&
    exceptionGranted(household, children) &&
    household.begruendung.trim().length >= 10;

  const ausnahmeOffen =
    base.wohnsitzOk && ausnahmeAngegeben;

  const berechnungMoeglich =
    base.wohnsitzOk &&
    (pensumErfuellt || ausnahmeOffen);

  const angezeigterBeitrag =
    !berechnungMoeglich
      ? 0
      : ausnahmeOffen
        ? view.hypothetical
        : view.subsidy;

  const urspruenglicherBeitrag =
    !berechnungMoeglich
      ? 0
      : ausnahmeOffen
        ? base.hypothetical
        : base.subsidy;

  const simulationAktiv =
    income !== Math.round(base.massgebend);

  const risks = riskNotes(
    household,
    children.length
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-pine">
          Auswertung
        </p>

        <h2 className="font-serif text-3xl text-ink">
          Ihr möglicher Betreuungsbeitrag
        </h2>

        <p className="mt-2 text-muted">
          Bezugsmonat November 2026.
          Steuerdaten aus 2024.
          Die Berechnung basiert auf Ihren
          Angaben.
        </p>
      </header>

      {!base.wohnsitzOk && (
        <div
          role="alert"
          className="rounded-card border border-line bg-clay-soft p-4 text-clay"
        >
          <p className="font-bold">
            Anforderungen nicht erreicht
          </p>

          <p className="mt-2">
            Ohne Wohnsitz im Kanton St. Gallen
            besteht kein regulärer Anspruch.
          </p>
        </div>
      )}

      {base.wohnsitzOk &&
        !pensumErfuellt &&
        !ausnahmeOffen && (
          <div
            role="alert"
            className="rounded-card border border-line bg-clay-soft p-4 text-clay"
          >
            <p className="font-bold">
              Anforderungen nicht erreicht
            </p>

            <p className="mt-2">
              Das erforderliche Erwerbspensum
              wird nicht erreicht und es wurde
              kein vollständig begründeter
              Ausnahmefall angegeben.
            </p>

            <p className="mt-2">
              Der reguläre Beitrag beträgt
              CHF 0.–.
            </p>
          </div>
        )}

      {ausnahmeOffen && (
        <div
          role="status"
          className="rounded-card border border-amber-300 bg-amber-50 p-5 text-amber-950"
        >
          <h3 className="font-serif text-2xl">
            Ausnahme muss behördlich geprüft werden
          </h3>

          <p className="mt-3">
            Das erforderliche Erwerbspensum
            wird nicht erreicht. Sie haben
            jedoch einen möglichen
            Ausnahmegrund angegeben.
          </p>

          <p className="mt-3 font-medium">
            Die folgende Berechnung zeigt,
            welchen Beitrag Sie erhalten
            könnten, falls die zuständige
            Stelle die Ausnahme anerkennt.
          </p>

          <p className="mt-3 text-sm">
            Rechtsgrundlage:
            Art. 4 Abs. 1 und 2 KiBG
            (Vorlage zur Totalrevision).
            Eine Anerkennung der Ausnahme
            liegt noch nicht vor.
          </p>

          {household.begruendung.trim() && (
            <div className="mt-4 rounded-card border border-amber-200 bg-white/70 p-3">
              <p className="text-sm font-medium">
                Ihre Begründung
              </p>

              <p className="mt-1 whitespace-pre-line text-sm">
                {household.begruendung}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-card border border-line bg-sand p-5">
        <p className="text-sm font-medium text-muted">
          {ausnahmeOffen
            ? "Möglicher Monatsbeitrag bei anerkannter Ausnahme"
            : "Berechneter Monatsbeitrag"}
        </p>

        <p className="mt-2 font-serif text-4xl text-ink">
          {chfExact(angezeigterBeitrag)}
        </p>

        <p className="mt-2 text-sm text-muted">
          {ausnahmeOffen
            ? "Unverbindliche Beispielberechnung. Der Betrag setzt die Anerkennung der Ausnahme voraus."
            : "Berechnung anhand der eingegebenen Angaben."}
        </p>

        {simulationAktiv && (
          <p className="mt-3 text-sm font-medium text-clay">
            Simulation aktiv: Der Betrag wurde
            mit dem eingestellten Jahreseinkommen
            berechnet.
          </p>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Massgebendes Jahreseinkommen"
          value={chf(view.massgebend)}
        />

        <Stat
          label="Einkommensfaktor"
          value={`${Math.round(view.faktor * 100)} %`}
        />

        <Stat
          label={
            ausnahmeOffen
              ? "Möglicher Monatsbeitrag"
              : "Monatsbeitrag"
          }
          value={chfExact(angezeigterBeitrag)}
        />
      </dl>

      <section className="rounded-card border border-line bg-card p-4">
        <h3 className="font-serif text-2xl text-ink">
          So wurde Ihr Beitrag berechnet
        </h3>

        <p className="mt-2 text-sm text-muted">
          Die Berechnung berücksichtigt
          die Betreuungsart, das Alter des
          Kindes, die anrechenbaren
          Betreuungsstunden und den
          Einkommensfaktor.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {view.children.map((child) => {
            const childAmount =
              !berechnungMoeglich
                ? 0
                : ausnahmeOffen
                  ? child.hypothetical
                  : child.subsidy;

            const hourlyAverage =
              child.hours > 0
                ? child.hypothetical / child.hours
                : 0;

            return (
              <div
                key={child.id}
                className="rounded-card border border-line bg-sand p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-medium">
                    {child.name}
                  </p>

                  <p className="font-serif text-xl">
                    {chfExact(childAmount)}
                  </p>
                </div>

                <p className="mt-2 text-sm text-muted">
                  Alter: {child.months} Monate
                  {child.enrolled
                    ? " · eingeschult"
                    : ""}
                </p>

                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>
                      Anrechenbare Betreuungsstunden
                    </span>

                    <strong>
                      {child.hours} Std.
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>
                      Durchschnittlicher Beitrag
                      pro Stunde
                    </span>

                    <strong>
                      {chfExact(hourlyAverage)}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span>
                      Rechnerischer Beitrag
                    </span>

                    <strong>
                      {chfExact(child.hypothetical)}
                    </strong>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted">
                  {child.reason}
                </p>

                {ausnahmeOffen &&
                  child.hours > 0 &&
                  !child.finished && (
                    <p className="mt-2 text-sm font-medium text-amber-900">
                      Betrag nur bei anerkannter
                      Ausnahme.
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-medium">
              {ausnahmeOffen
                ? "Möglicher Gesamtbeitrag"
                : "Gesamtbeitrag"}
            </p>

            <p className="font-serif text-2xl">
              {chfExact(angezeigterBeitrag)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted">
          Es werden höchstens zwölf
          Betreuungsstunden pro Tag und
          fünf Betreuungstage pro Woche
          berücksichtigt. Die einzelnen
          Stundensätze hängen von
          Betreuungsart und Alter ab.
        </p>
      </section>

      {ausnahmeOffen && (
        <div className="rounded-card border border-line bg-card p-4">
          <h3 className="font-serif text-xl">
            Unterschied zwischen Berechnung
            und Anspruch
          </h3>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex justify-between gap-3">
              <span>
                Regulärer Anspruch ohne
                Anerkennung der Ausnahme
              </span>

              <strong>
                {chfExact(view.subsidy)}
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span>
                Möglicher Beitrag bei
                anerkannter Ausnahme
              </span>

              <strong>
                {chfExact(view.hypothetical)}
              </strong>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted">
            Der zweite Betrag ist eine
            hypothetische Berechnung.
            Ob eine Ausnahme vorliegt,
            entscheidet die zuständige Stelle.
          </p>
        </div>
      )}

      {risks.length > 0 && (
        <aside className="rounded-card border border-line bg-sand px-4 py-3">
          <p className="font-medium">
            Hinweis zur finanziellen Lage
          </p>

          <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
            {risks.map((note) => (
              <li key={note}>
                {note}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-sm text-muted">
            Diese Hinweise verändern
            die Berechnung nicht.
          </p>
        </aside>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label
            htmlFor="lohn"
            className="font-medium"
          >
            Jahreseinkommen simulieren
          </label>

          <span className="shrink-0">
            {chf(income)} / Jahr
          </span>
        </div>

        <p className="mb-3 text-sm text-muted">
          Mit dem Schieber können Sie sehen,
          wie sich ein anderes Einkommen auf
          den möglichen Monatsbeitrag
          auswirkt. Die eingegebenen
          Steuerdaten werden nicht verändert.
        </p>

        <input
          id="lohn"
          type="range"
          min={0}
          max={180000}
          step={1000}
          value={income}
          onChange={(event) =>
            setIncome(
              Number(event.target.value)
            )
          }
          className="block w-full accent-pine"
        />

        <p className="mt-2 text-sm text-muted">
          Voller Einkommensfaktor bis{" "}
          {chf(MIN_INCOME)}.
          Kein einkommensabhängiger Beitrag
          ab {chf(MAX_INCOME)}.
        </p>

        {base.usedCurrent && (
          <p className="mt-2 text-sm text-muted">
            Die aktuelle Einkommenssituation
            wurde aufgrund der
            25-Prozent-Regel berücksichtigt.
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            setIncome(
              Math.round(base.massgebend)
            )
          }
          className="mt-3 min-h-11 rounded-card border border-line px-4 text-sm"
        >
          Ursprüngliches Einkommen
          wiederherstellen
        </button>
      </section>

      <section>
        <h3 className="mb-3 font-serif text-xl">
          Beitrag nach Jahreseinkommen
        </h3>

        <p className="mb-3 text-sm text-muted">
          {ausnahmeOffen
            ? "Die Grafik zeigt den möglichen Beitrag bei anerkannter Ausnahme."
            : "Die Grafik zeigt den rechnerischen Beitrag in Abhängigkeit vom Einkommen. Sie ersetzt keine Anspruchsprüfung."}
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 5,
                bottom: 5,
                left: 0,
              }}
            >
              <XAxis
                dataKey="einkommen"
                tickFormatter={(value: number) =>
                  `${Math.round(value / 1000)}k`
                }
                stroke="#6d675e"
              />

              <YAxis
                tickFormatter={(value: number) =>
                  `${value}`
                }
                stroke="#6d675e"
                width={40}
              />

              <Tooltip
                formatter={(value) => [
                  chf(Number(value ?? 0)),
                  "Rechnerischer Monatsbeitrag",
                ]}
                labelFormatter={(value) =>
                  chf(Number(value))
                }
              />

              <Area
                type="monotone"
                dataKey="beitrag"
                stroke="#0e6b52"
                fill="#e6f3ec"
              />

              <ReferenceLine
                x={income}
                stroke="#8f3d24"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {!ausnahmeOffen && (
        <ResultExplanation
          household={household}
          children={children}
          result={view}
          isSimulation={simulationAktiv}
        />
      )}

      {ausnahmeOffen && (
        <div className="rounded-card border border-line bg-sand p-4">
          <p className="font-medium">
            Zusammenfassung der Ausnahmeprüfung
          </p>

          <p className="mt-2 text-sm text-muted">
            Die detaillierte Berechnung
            oben verwendet die gleichen
            Einkommens- und
            Betreuungsregeln wie die
            reguläre Berechnung.
            Lediglich die noch nicht
            anerkannte Ausnahme wird
            für die Darstellung des
            möglichen Betrags
            vorausgesetzt.
          </p>

          <p className="mt-3">
            <strong>
              Ursprünglich berechneter
              möglicher Monatsbeitrag:
            </strong>{" "}
            {chfExact(urspruenglicherBeitrag)}
          </p>

          <p className="mt-2 text-sm text-muted">
            Der reguläre Anspruch
            bleibt bis zur Anerkennung
            der Ausnahme unerfüllt.
          </p>
        </div>
      )}

      <section className="rounded-card border border-line bg-sand p-4">
        <p className="font-medium">
          Gesuch an den Kanton
        </p>

        <p className="mt-2 text-sm text-muted">
          Wenn Sie ein Gesuch vorbereiten,
          werden ergänzende persönliche
          Angaben abgefragt.
          Diese Anwendung ist eine Demo
          ohne automatische Übermittlung.
        </p>

        {needsDeclaration(household) && (
          <p className="mt-2 text-sm text-muted">
            Bei fehlender rechtskräftiger
            Veranlagung sind zusätzliche
            Nachweise erforderlich.
          </p>
        )}

        {ausnahmeOffen && (
          <p className="mt-3 font-medium text-amber-900">
            Achtung: Die beantragte
            Ausnahme muss vor einer
            Bewilligung geprüft werden.
          </p>
        )}

        {!showApplication && (
          <button
            type="button"
            onClick={() =>
              setShowApplication(true)
            }
            className="mt-4 min-h-11 rounded-card bg-pine px-4 text-pine-ink"
          >
            Gesuch vorbereiten
          </button>
        )}
      </section>

      {showApplication && (
        <ApplicationForm
          household={household}
          children={children}
          onClose={() =>
            setShowApplication(false)
          }
        />
      )}
    </div>
  );
}

function isEineltern(
  household: HouseholdInput
): boolean {
  return (
    household.zusammen === "getrennt" &&
    household.getrenntArt === "alleine"
  );
}

function riskNotes(
  household: HouseholdInput,
  childCount: number
): string[] {
  const notes: string[] = [];

  if (isEineltern(household)) {
    notes.push(
      "Einelternhaushalte sind in den kantonalen Grundlagen überdurchschnittlich armutsgefährdet."
    );
  }

  if (childCount >= 3) {
    notes.push(
      "Haushalte mit drei oder mehr Kindern gelten in den kantonalen Grundlagen als stärker armutsgefährdet."
    );
  }

  return notes;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-card bg-moss px-4 py-3">
      <dt className="text-sm text-muted">
        {label}
      </dt>

      <dd className="font-serif text-2xl text-ink">
        {value}
      </dd>
    </div>
  );
}
