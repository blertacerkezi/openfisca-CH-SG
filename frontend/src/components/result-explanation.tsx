
import type { ReactNode } from "react";
import {
  type ChildInput,
  type HouseholdInput,
  type Result,
  MAX_INCOME,
  MIN_INCOME,
  PENSUM_ALONE,
  PENSUM_TOGETHER,
  chf,
  chfExact,
  maxHourly,
  thresholdMet,
  exceptionGranted,
} from "@/lib/kibg";

type Props = {
  household: HouseholdInput;
  children: ChildInput[];
  result: Result;
  isSimulation: boolean;
};

function Legal({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1 block text-xs text-muted">
      Rechtsgrundlage: {children}
    </span>
  );
}

function Row({
  ok,
  title,
  children,
}: {
  ok: boolean | null;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3 rounded-card border border-line bg-card p-3">
      <span
        aria-hidden="true"
        className={`font-bold ${
          ok === true
            ? "text-pine"
            : ok === false
              ? "text-clay"
              : "text-muted"
        }`}
      >
        {ok === true ? "✓" : ok === false ? "✕" : "◐"}
      </span>

      <div className="min-w-0 text-sm text-ink">
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-muted">{children}</div>
      </div>
    </li>
  );
}

export default function ResultExplanation({
  household,
  children,
  result,
  isSimulation,
}: Props) {
  const hourly =
    result.hours > 0
      ? result.subsidy / result.hours
      : 0;

  const hasException = exceptionGranted(
    household,
    children,
  );

  const threshold =
    result.eb === 1 ? PENSUM_ALONE : PENSUM_TOGETHER;

  const pensum =
    result.eb === 1
      ? household.pensum1
      : household.pensum1 + household.pensum2;

  const workOk = thresholdMet(household);

  const full = result.faktor >= 1;
  const zeroIncome = result.faktor <= 0;

  const status =
    result.subsidy <= 0
      ? "Kein berechneter Beitrag"
      : full
        ? "Maximale einkommensabhängige Vergünstigung"
        : "Teilweise Vergünstigung";

  const validChildren = result.children.filter(
    (child) => child.eligible,
  );

  const noCare = result.hours <= 0;

  const futureFactor = Math.max(
    0,
    Math.min(
      1,
      (MAX_INCOME - (result.massgebend + 10000)) /
        (MAX_INCOME - MIN_INCOME),
    ),
  );

  const futureSubsidy =
    result.faktor > 0
      ? (result.subsidy / result.faktor) * futureFactor
      : 0;

  const incomeSensitivity =
    result.hours > 0 && result.faktor > 0
      ? Math.max(
          0,
          (result.subsidy - futureSubsidy) /
            result.hours,
        )
      : 0;

  return (
    <section
      className="rounded-card border border-line bg-sand p-4 sm:p-6"
      aria-labelledby="ergebnis-erklaerung"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="ergebnis-erklaerung"
          className="font-serif text-2xl text-ink"
        >
          Ihr Ergebnis – einfach erklärt
        </h3>

        {isSimulation && (
          <span className="rounded-full bg-moss px-3 py-1 text-xs font-medium text-ink">
            Einkommens-Simulation
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-muted">
        {isSimulation
          ? "Vorschau mit dem Einkommen aus dem Schieber."
          : "Berechnung auf Basis Ihrer Angaben."}
        {" "}Keine behördliche Verfügung.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-moss p-4">
          <p className="text-sm text-muted">
            Beitrag pro Betreuungsstunde (Durchschnitt)
          </p>
          <p className="mt-1 font-serif text-3xl text-ink">
            {chfExact(hourly)}
          </p>
        </div>

        <div className="rounded-card bg-moss p-4">
          <p className="text-sm text-muted">
            Beitrag im Monat
          </p>
          <p className="mt-1 font-serif text-3xl text-ink">
            {chfExact(result.subsidy)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium text-ink">
        Ihre Einstufung: {status}
      </p>

      <h4 className="mt-6 font-medium text-ink">
        Warum dieses Ergebnis?
      </h4>

      <ul className="mt-3 flex flex-col gap-2">
        <Row
          ok={household.wohnsitz}
          title="Grundvoraussetzung: Wohnsitz"
        >
          {household.wohnsitz === true
            ? "Sie haben angegeben, im Kanton St.Gallen zu wohnen."
            : "Der Wohnsitz im Kanton St.Gallen ist nicht bestätigt."}

          <Legal>
            KiBG, Wohnsitzvoraussetzung
            (Art. 2 Abs. 1 – bitte mit geltender
            Fassung abgleichen)
          </Legal>
        </Row>

        <Row
          ok={
            workOk
              ? true
              : hasException
                ? null
                : false
          }
          title="Haushalt und Erwerbstätigkeit"
        >
          {result.eb === 1
            ? "Für die Berechnung wird eine erziehungsberechtigte Person berücksichtigt."
            : "Für die Berechnung werden zwei erziehungsberechtigte Personen berücksichtigt."}
          {" "}
          Erfasstes Pensum: {pensum} %.
          Richtwert: mindestens {threshold} %.

          {!workOk &&
            hasException &&
            " Ein Ausnahmegrund ist erfasst; dessen Anerkennung muss geprüft werden."}

          <Legal>
            KiBG, Erwerbsvoraussetzungen und
            Ausnahmen (Art. 4 – Absatz prüfen)
          </Legal>
        </Row>

        <Row
          ok={result.faktor > 0}
          title="Einkommen und Vermögen"
        >
          Massgebendes Einkommen:{" "}
          {chf(result.massgebend)}.
          Einkommensfaktor:{" "}
          {Math.round(result.faktor * 100)} %.

          {full
            ? ` Bis ${chf(MIN_INCOME)} gilt der volle einkommensabhängige Satz.`
            : zeroIncome
              ? ` Ab ${chf(MAX_INCOME)} ist der einkommensabhängige Satz null.`
              : ` Zwischen ${chf(MIN_INCOME)} und ${chf(MAX_INCOME)} nimmt der Beitrag linear ab.`}

          <Legal>
            KiBV, einkommensabhängige Bemessung
            (Art. 15 und Anhang – bitte prüfen)
          </Legal>
        </Row>

        <Row
          ok={validChildren.length > 0}
          title="Kinder und Betreuung"
        >
          {children.length === 0
            ? "Es wurden keine Kinder erfasst."
            : noCare
              ? "Es wurden keine anrechenbaren externen Betreuungsstunden erfasst."
              : `${validChildren.length} von ${children.length} Kindern mit berechnetem Anspruch; insgesamt ${result.hours.toLocaleString("de-CH")} Betreuungsstunden.`}

          <Legal>
            KiBV, Höchstbeiträge nach Betreuungsart
            und Alter (Art. 14 – bitte prüfen)
          </Legal>
        </Row>
      </ul>

      {result.children.length > 0 && (
        <div className="mt-5">
          <h4 className="font-medium text-ink">
            Aufschlüsselung nach Kind
          </h4>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Stunden</th>
                  <th className="py-2 pr-3">Beitrag/h</th>
                  <th className="py-2">Monat</th>
                </tr>
              </thead>

              <tbody>
                {result.children.map((row, index) => {
                  const source = children.find(
                    (c) => c.id === row.id,
                  );

                  const hourlyChild =
                    row.hours > 0
                      ? row.subsidy / row.hours
                      : 0;

                  const types = source
                    ? [
                        ...new Set(
                          Object.values(source.days)
                            .filter(
                              (d) =>
                                d.obhut &&
                                !d.elternferien &&
                                d.hours > 0,
                            )
                            .map((d) => d.type),
                        ),
                      ]
                    : [];

                  const maxRates = types.map(
                    (type) =>
                      maxHourly(
                        type,
                        row.months,
                        row.enrolled,
                      ),
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line align-top"
                    >
                      <td className="py-2 pr-3">
                        <span className="font-medium">
                          {row.name ||
                            `Kind ${index + 1}`}
                        </span>

                        <span className="block text-xs text-muted">
                          {row.months} Monate ·{" "}
                          {row.reason}

                          {maxRates.length > 0
                            ? ` · Höchstsatz ${maxRates
                                .map((r) => chfExact(r))
                                .join(" / ")}/h`
                            : ""}
                        </span>
                      </td>

                      <td className="py-2 pr-3">
                        {row.hours.toLocaleString(
                          "de-CH",
                        )}
                      </td>

                      <td className="py-2 pr-3">
                        {chfExact(hourlyChild)}
                      </td>

                      <td className="py-2">
                        {chfExact(row.subsidy)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.subsidy > 0 &&
        incomeSensitivity > 0 && (
          <p className="mt-4 text-sm text-muted">
            Was Ihr Ergebnis beeinflusst:
            Wenn das massgebende Einkommen um
            CHF 10'000 steigt, sinkt der
            durchschnittliche Beitrag bei
            unveränderter Betreuung um ungefähr{" "}
            {chfExact(incomeSensitivity)} pro Stunde.
            Dies ist eine Modellrechnung.
          </p>
        )}

      <div className="mt-5 border-t border-line pt-4">
        <h4 className="font-medium text-ink">
          Ihr nächster Schritt
        </h4>

        <p className="mt-1 text-sm text-muted">
          Prüfen Sie Ihre Angaben und die
          benötigten Nachweise. Das Gesuch
          kann im Demo-Tool unten simuliert
          werden; es wird nicht an den
          Kanton übermittelt.
        </p>

        <p className="mt-2 text-xs text-muted">
          Rechtshinweis: Die Artikelangaben
          sind Orientierungshinweise und müssen
          vor einer produktiven Nutzung mit
          der aktuellen amtlichen Gesetzes-
          und Verordnungsfassung abgeglichen
          werden. Die Berechnung erfolgt hier
          im Frontend-Modell.
        </p>
      </div>
    </section>
  );
}
