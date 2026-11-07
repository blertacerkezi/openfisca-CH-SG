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
} from "@/lib/kibg";

export default function ResultPanel({
  household,
  children,
}: {
  household: HouseholdInput;
  children: ChildInput[];
}) {
  const base = assess(household, children);
  const [income, setIncome] = useState(Math.round(base.massgebend));

  const view = useMemo(
    () => assess(household, children, income),
    [household, children, income],
  );

  const data = useMemo(() => curve(household, children), [household, children]);

  const [sent, setSent] = useState<string | null>(null);
  const ausnahme = exceptionGranted(household, children);
  const risks = riskNotes(household, children.length);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-sm font-medium tracking-wide text-pine uppercase">Auswertung</p>
        <h2 className="font-serif text-3xl text-ink">Was der Kanton übernimmt</h2>
        <p className="mt-2 text-muted">
          Bezugsmonat November 2026. Steuerdaten aus 2024. Der Schieber ändert nur die
          Vorschau, nicht die eingegebenen Steuerzahlen.
        </p>
      </header>

      {!base.wohnsitzOk && (
        <p className="rounded-card bg-clay-soft px-4 py-3 text-clay">
          Ohne Wohnsitz im Kanton gibt es keinen Beitrag.
        </p>
      )}

      {base.sonderantrag && (
        <p className="rounded-card bg-clay-soft px-4 py-3 text-clay">
          Das Pensum ist nicht erreicht und es liegt kein Ausnahmegrund vor. Der Beitrag ist 0.
        </p>
      )}

      {ausnahme && (
        <p className="rounded-card bg-moss px-4 py-3 text-ink">
          Ausnahmegrund ist erfasst. Der Beitrag unten gilt, wenn der Kanton die Meldung akzeptiert.
          {household.begruendung ? ` Begründung: ${household.begruendung}` : ""}
        </p>
      )}

      {risks.length > 0 && (
        <aside className="rounded-card border border-line bg-sand px-4 py-3">
          <p className="font-medium">Hinweis zur finanziellen Lage</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm text-muted">
            {risks.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Der Hinweis ändert den berechneten Beitrag nicht.</p>
        </aside>
      )}

      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Massgebendes Einkommen" value={chf(view.massgebend)} />
        <Stat label="Einkommensfaktor" value={`${Math.round(view.faktor * 100)} %`} />
        <Stat label="Beitrag im Monat" value={chfExact(view.subsidy)} />
      </dl>

      <ul className="flex flex-col gap-2">
        {view.children.map((child) => (
          <li key={child.id} className="rounded-card border border-line bg-card px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">{child.name}</p>
              <p>{chfExact(child.subsidy)}</p>
            </div>
            <p className="text-sm text-muted">
              {child.months} Monate · {child.hours} Stunden · {child.reason}
              {child.enrolled ? " · eingeschult" : ""}
            </p>
          </li>
        ))}
      </ul>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="lohn" className="font-medium">
            Einkommen verschieben
          </label>
          <span>{chf(income)}</span>
        </div>
        <input
          id="lohn"
          type="range"
          min={0}
          max={180000}
          step={1000}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="block accent-pine"
          style={{
            width: "calc(100% - 50px)",
            marginLeft: 45,
            marginRight: 5,
          }}
        />
        <p className="mt-1 text-sm text-muted">
          Voller Satz bis {chf(MIN_INCOME)}, kein Beitrag ab {chf(MAX_INCOME)}.
          {base.usedCurrent ? " Die 25-Prozent-Regel hat den heutigen Stand übernommen." : ""}
        </p>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <XAxis
              dataKey="einkommen"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              stroke="#6d675e"
            />
            <YAxis tickFormatter={(v: number) => `${v}`} stroke="#6d675e" width={40} />
            <Tooltip
              formatter={(value) => [chf(Number(value ?? 0)), "Monatsbeitrag"]}
              labelFormatter={(v) => chf(Number(v))}
            />
            <Area dataKey="beitrag" stroke="#0e6b52" fill="#e6f3ec" />
            <ReferenceLine x={income} stroke="#8f3d24" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-card border border-line bg-sand p-4">
        <p className="font-medium">Gesuch an den Kanton</p>
        <p className="mt-1 text-sm text-muted">
          Hackathon-Dummy. Es wird nichts wirklich verschickt.
          {needsDeclaration(household) ? " Enthalten sind die Nachweise zur fehlenden Veranlagung." : ""}
          {ausnahme ? " Enthalten ist der Ausnahmegrund." : ""}
        </p>
        {sent ? (
          <p className="mt-3 text-ink">Übermittelt. Aktenzeichen {sent}.</p>
        ) : (
          <button
            type="button"
            onClick={() => setSent(`SG-KIBG-2026-${1000 + Math.floor(Math.random() * 9000)}`)}
            className="mt-3 min-h-11 rounded-card bg-pine px-4 text-pine-ink"
          >
            An den Kanton senden
          </button>
        )}
      </div>
    </div>
  );
}

function isEineltern(h: HouseholdInput) {
  return h.zusammen === "getrennt" && h.getrenntArt === "alleine";
}

function riskNotes(h: HouseholdInput, childCount: number) {
  const notes: string[] = [];
  if (isEineltern(h)) {
    notes.push(
      "Einelternhaushalte sind in den kantonalen Grundlagen überdurchschnittlich armutsgefährdet. Das verfügbare Einkommen lag dort deutlich unter dem von Paarhaushalten.",
    );
  }
  if (childCount >= 3) {
    notes.push(
      "Haushalte mit drei oder mehr Kindern gelten in denselben Grundlagen ebenfalls als stärker armutsgefährdet.",
    );
  }
  return notes;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-moss px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-serif text-2xl text-ink">{value}</dd>
    </div>
  );
}
