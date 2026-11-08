import { useState, type ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chf } from "@/lib/kibg";
import {
  STUNDEN_KITA,
  STUNDEN_SCHULE,
  TAGESLOHN,
  type HebelWahl,
  type Modell,
  wirken,
} from "@/lib/wirkung";

type Punkt = {
  key: "ohne" | "gesetz" | "hebel";
  beitrag: number;
  quote: number;
  name: string;
};

const emptyHebel = (): HebelWahl => ({
  band: null,
  jeKind: null,
  abzugAb: null,
  kitaSatz: null,
  schuleSatz: null,
});

export function Overview({ onBack }: { onBack: () => void }) {
  const [erwachsene, setErwachsene] = useState<1 | 2>(2);
  const [kinder, setKinder] = useState(4);
  const [schulkinder, setSchulkinder] = useState(0);
  const [bisher, setBisher] = useState(0);
  const [neu, setNeu] = useState(1);
  const [partnerPensum, setPartnerPensum] = useState(100);
  const [einkommen, setEinkommen] = useState(90_000);
  const [band, setBand] = useState(154_000);
  const [abzugAb, setAbzugAb] = useState(40_000);
  const [kitaSatz, setKitaSatz] = useState(7.5);
  const [schuleSatz, setSchuleSatz] = useState(5.5);
  const [pensumPaar, setPensumPaar] = useState(120);
  const [pensumAllein, setPensumAllein] = useState(20);
  const [tarif, setTarif] = useState(12);
  const [hebel, setHebel] = useState<HebelWahl>({ ...emptyHebel(), band: 200_000 });

  const modell: Modell = {
    erwachsene,
    kinder,
    schulkinder: Math.min(schulkinder, kinder),
    bisher,
    neu,
    partnerPensum,
    band,
    abzugAb,
    kitaSatz,
    schuleSatz,
    pensumPaar,
    pensumAllein,
    einkommen,
    tarif,
    hebel,
  };
  const w = wirken(modell);
  const namen = hebelTexte(modell);
  const aktiv = namen.length > 0;
  const gezeigt = aktiv ? w.hebel : w.gesetz;
  const haushalt =
    erwachsene === 2 ? `Paar, ${kinder} ${kinder === 1 ? "Kind" : "Kinder"}` : `Allein, ${kinder} ${kinder === 1 ? "Kind" : "Kinder"}`;

  const punkte: Punkt[] = [
    { key: "ohne", beitrag: 0, quote: w.ohne.quote, name: "ohne Gesetz" },
    { key: "gesetz", beitrag: w.gesetz.beitrag, quote: w.gesetz.quote, name: "mit Gesetz" },
  ];
  if (aktiv && (w.hebel.beitrag !== w.gesetz.beitrag || w.hebel.quote !== w.gesetz.quote)) {
    punkte.push({ key: "hebel", beitrag: w.hebel.beitrag, quote: w.hebel.quote, name: "mit Hebel" });
  }
  punkte.sort((a, b) => a.beitrag - b.beitrag);

  const preset = bisher === 0 && neu === 1 ? "einstieg" : bisher === 1 && neu === 5 ? "aufstocken" : "andere";

  function setPreset(value: string) {
    if (value === "einstieg") {
      setBisher(0);
      setNeu(1);
    } else if (value === "aufstocken") {
      setBisher(1);
      setNeu(5);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 lg:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="min-h-11 text-pine">
          Zur Auswahl
        </button>
        <p className="text-sm text-muted">Modellrechnung, kein Gesuchsentscheid</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="order-3 flex flex-col gap-5 rounded-card border border-line bg-card p-4 lg:col-span-5 xl:order-1 xl:col-span-3 xl:max-h-screen xl:overflow-y-auto">
          <h2 className="font-serif text-2xl">Regeln</h2>

          <Group title="Haushalt">
            <Range
              label="Allein oder Paar"
              min={1}
              max={2}
              step={1}
              value={erwachsene}
              format={(n) => (n === 1 ? "Allein" : "Paar")}
              onChange={(n) => setErwachsene(n === 1 ? 1 : 2)}
            />
            <Range
              label="Anzahl Kinder"
              min={1}
              max={6}
              step={1}
              value={kinder}
              format={(n) => String(n)}
              onChange={(n) => {
                setKinder(n);
                setSchulkinder((s) => Math.min(s, n));
              }}
            />
            <Range
              label="davon in der Schule"
              min={0}
              max={kinder}
              step={1}
              value={Math.min(schulkinder, kinder)}
              format={(n) => String(n)}
              onChange={setSchulkinder}
            />
            {erwachsene === 2 && (
              <Range
                label="Pensum der anderen Person"
                hint="Gesetz · zusammen mit dem eigenen Pensum"
                min={0}
                max={100}
                step={10}
                value={partnerPensum}
                format={(n) => `${n} %`}
                onChange={setPartnerPensum}
              />
            )}
            <Range
              label="Massgebendes Einkommen"
              hint="Annahme für diesen Haushalt"
              min={0}
              max={200_000}
              step={1_000}
              value={einkommen}
              format={chf}
              onChange={setEinkommen}
            />
          </Group>

          <Group title="Schritt">
            <label className="block text-sm">
              <span className="font-medium">Situation</span>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
              >
                <option value="einstieg">Steigt ein (0 → 1 Tag)</option>
                <option value="aufstocken">Arbeitet mehr (1 → 5 Tage)</option>
                <option value="andere">Andere Kombination</option>
              </select>
            </label>
            <Range
              label="Tage bisher"
              min={0}
              max={4}
              step={1}
              value={bisher}
              format={(n) => `${n} / Woche`}
              onChange={(n) => {
                setBisher(n);
                setNeu((v) => Math.max(v, n + 1));
              }}
            />
            <Range
              label="Tage neu"
              min={1}
              max={5}
              step={1}
              value={neu}
              format={(n) => `${n} / Woche`}
              onChange={(n) => {
                setNeu(Math.max(1, n));
                setBisher((v) => Math.min(v, Math.max(0, n - 1)));
              }}
            />
          </Group>

          <Group title="Gesetz und Verordnung">
            <Range
              label="Einkommensband bis"
              hint="Verordnung"
              min={80_000}
              max={250_000}
              step={2_000}
              value={band}
              format={chf}
              onChange={setBand}
            />
            <Range
              label="Voller Satz bis"
              hint="Verordnung · darunter bleibt der Faktor 100 %"
              min={0}
              max={100_000}
              step={2_000}
              value={abzugAb}
              format={chf}
              onChange={setAbzugAb}
            />
            <Range
              label="Kita ab 18 Monaten"
              hint="Verordnung · Franken pro Stunde"
              min={0}
              max={15}
              step={0.5}
              value={kitaSatz}
              format={frankenStunde}
              onChange={setKitaSatz}
            />
            <Range
              label="Schulkind"
              hint="Verordnung · Franken pro Stunde"
              min={0}
              max={15}
              step={0.5}
              value={schuleSatz}
              format={frankenStunde}
              onChange={setSchuleSatz}
            />
            <Range
              label="Pensum Paar, Minimum"
              hint="Gesetz"
              min={80}
              max={200}
              step={10}
              value={pensumPaar}
              format={(n) => `${n} %`}
              onChange={setPensumPaar}
            />
            <Range
              label="Pensum Allein, Minimum"
              hint="Gesetz"
              min={10}
              max={100}
              step={10}
              value={pensumAllein}
              format={(n) => `${n} %`}
              onChange={setPensumAllein}
            />
          </Group>

          <Group title="Annahme">
            <Range
              label="Betreuungstarif"
              hint="Was die Familie der Einrichtung zahlt"
              min={6}
              max={20}
              step={0.5}
              value={tarif}
              format={frankenStunde}
              onChange={setTarif}
            />
          </Group>

          <Group title="Hebel">
            <Lever
              label="Einkommensband"
              value={hebel.band}
              onChange={(bandWahl) => setHebel({ ...hebel, band: bandWahl })}
              options={[170_000, 180_000, 200_000, 220_000, 250_000].map((n) => ({
                value: n,
                label: chf(n),
              }))}
            />
            <Lever
              label="Zuschlag je Kind aufs Band"
              value={hebel.jeKind}
              onChange={(jeKind) => setHebel({ ...hebel, jeKind })}
              options={[10_000, 20_000, 30_000, 40_000].map((n) => ({
                value: n,
                label: `+${chf(n)}`,
              }))}
            />
            <Lever
              label="Voller Satz bis"
              value={hebel.abzugAb}
              onChange={(abzug) => setHebel({ ...hebel, abzugAb: abzug })}
              options={[50_000, 60_000, 70_000, 80_000].map((n) => ({
                value: n,
                label: chf(n),
              }))}
            />
            <Lever
              label="Kita-Ansatz"
              value={hebel.kitaSatz}
              onChange={(satz) => setHebel({ ...hebel, kitaSatz: satz })}
              options={[8, 8.5, 9.5, 11, 12].map((n) => ({
                value: n,
                label: frankenStunde(n),
              }))}
            />
            <Lever
              label="Schulkind-Ansatz"
              value={hebel.schuleSatz}
              onChange={(satz) => setHebel({ ...hebel, schuleSatz: satz })}
              options={[6, 6.5, 7.5, 8.5, 10].map((n) => ({
                value: n,
                label: frankenStunde(n),
              }))}
            />
          </Group>
        </section>

        <section className="order-1 flex flex-col gap-4 rounded-card border border-line bg-card p-4 lg:col-span-7 xl:order-2 xl:col-span-6">
          <p className="text-sm font-medium tracking-wide text-pine uppercase">Behaltquote</p>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="font-serif text-6xl leading-none text-ink sm:text-7xl">{gezeigt.quote}</p>
            <p className="max-w-xs pb-1 text-lg leading-snug">
              von 100 Fr. Mehrlohn bleiben dem Haushalt
              <span className="mt-1 block text-sm text-muted">
                {aktiv ? `mit Hebel ${namen.join(", ")}` : "mit dem Gesetz"} · {haushalt}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-sand px-3 py-2">ohne Gesetz: {w.ohne.quote} von 100</span>
            <span className="rounded-full bg-pine px-3 py-2 text-pine-ink">
              Gesetz: {pkt(w.gesetz.quote - w.ohne.quote)} · {deltaFr(w.gesetz.beitrag)} / Mt.
            </span>
            <span className="rounded-full bg-clay-soft px-3 py-2 text-clay">
              {aktiv
                ? `Hebel: ${pkt(w.hebel.quote - w.gesetz.quote)} · ${deltaFr(w.hebel.beitrag - w.gesetz.beitrag)} / Mt.`
                : "Hebel: wie Gesetz"}
            </span>
          </div>

          {!w.anspruch && (
            <p className="rounded-card bg-clay-soft px-4 py-3 text-clay">
              Pensum {w.pensumIst} % von nötigen {w.pensumSoll} %. Gesetz und Hebel zahlen in diesem
              Schritt nichts.
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full border-2 border-ink bg-card" />
              ohne Gesetz
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-pine" />
              mit Gesetz
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rotate-45 bg-clay" />
              mit Hebel
            </span>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={punkte} margin={{ top: 28, right: 56, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--color-line)" />
                <XAxis
                  dataKey="beitrag"
                  type="number"
                  domain={[0, "dataMax + 200"]}
                  tickFormatter={(v: number) => chf(v)}
                  stroke="var(--color-muted)"
                />
                <YAxis
                  dataKey="quote"
                  domain={[0, 100]}
                  width={36}
                  stroke="var(--color-muted)"
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)} von 100`, "Bleibt"]}
                  labelFormatter={(v) => `Beitrag ${chf(Number(v))}`}
                />
                <Line
                  dataKey="quote"
                  stroke="var(--color-pine)"
                  strokeWidth={2}
                  dot={<Marke />}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-muted">
            Waagrecht: was der Beitrag in diesem Schritt pro Monat ausmacht. Senkrecht: wie viel von
            100 Franken Mehrlohn dem Haushalt bleibt.
          </p>
          <p className="text-sm">
            Mehrlohn {chf(w.mehrlohn)} − Betreuung {chf(w.kosten)} + Beitrag {chf(gezeigt.beitrag)} ={" "}
            <span className="font-medium">{chf(gezeigt.bleibt)}</span>. Ohne Steuern.
          </p>
          <p className="text-sm text-muted">
            Annahme: ein Tag pro Woche entspricht {chf(TAGESLOHN * (52 / 12))} Lohn im Monat. Kita-Tag{" "}
            {STUNDEN_KITA} Stunden, Schulkind {STUNDEN_SCHULE} Stunden.
          </p>
        </section>

        <section className="order-2 flex flex-col gap-4 rounded-card border border-line bg-card p-4 lg:col-span-12 xl:order-3 xl:col-span-3">
          <div>
            <h2 className="font-serif text-2xl">Haushalt im Detail</h2>
            <p className="mt-1 text-sm text-muted">{haushalt}</p>
          </div>
          <p>{satz(modell)}</p>

          <Row label="Zusätzlicher Lohn" hint={lohnHint(modell)} value={`+${chf(w.mehrlohn)}`} />
          <Row
            label="Betreuung"
            hint={`${kinderHinweis(modell)} · Tarif ${frankenStunde(tarif)}`}
            value={`−${chf(w.kosten)}`}
            tone="clay"
          />
          <Row
            label={aktiv ? "Kanton mit Hebel" : "Kanton"}
            hint={
              !w.anspruch
                ? "Kein Anspruch, Pensum fehlt"
                : aktiv
                  ? `Faktor ${Math.round(gezeigt.faktor * 100)} %. Das Gesetz allein wäre ${chf(w.gesetz.beitrag)}.`
                  : `Einkommensfaktor ${Math.round(gezeigt.faktor * 100)} %`
            }
            value={`+${chf(gezeigt.beitrag)}`}
            tone="pine"
          />
          <div className="flex items-baseline justify-between gap-3 rounded-card bg-moss px-3 py-3">
            <div>
              <p className="font-medium">Bleibt im Haushalt</p>
              <p className="text-sm text-muted">{gezeigt.quote} von 100 Fr. Lohn</p>
            </div>
            <p className="font-serif text-3xl text-ink">{chf(gezeigt.bleibt)}</p>
          </div>

          <div>
            <h3 className="font-medium">Wenn die Angabe nicht stimmt</h3>
            <div className="mt-2 flex flex-col gap-2">
              <Note title="Pensum zu hoch angegeben">
                Fehlt das Pensum, zahlt der Kanton nichts. Es bleibt der Punkt ohne Gesetz:{" "}
                {w.ohne.quote} von 100. Prüfbar am Arbeitsvertrag.
              </Note>
              <Note title="Einkommen steigt, nicht gemeldet">
                Ein Viertel mehr Einkommen senkt den Faktor auf {Math.round(w.einkommen25.faktor * 100)} %.
                Beitrag dann {chf(w.einkommen25.beitrag)} statt {chf(gezeigt.beitrag)}, es bleiben{" "}
                {w.einkommen25.quote} von 100.
              </Note>
              <Note title="Mehr Betreuung als Arbeit">
                Zwei zusätzliche Betreuungstage ohne mehr Lohn kosten {chf(w.extraBetreuung)} extra.
                Von 100 Fr. bleiben dann {w.extraQuote}.
              </Note>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function satz(m: Modell) {
  const wer = m.erwachsene === 2 ? "Eine Person im Paar" : "Die alleinerziehende Person";
  const schritt =
    m.bisher === 0
      ? `arbeitet neu ${tageWort(m.neu - m.bisher)} pro Woche`
      : `geht von ${m.bisher} auf ${m.neu} Tage pro Woche`;
  return `${wer} ${schritt}. Betreut: ${kinderHinweis(m)}. Steuern sind nicht eingerechnet.`;
}

function lohnHint(m: Modell) {
  const tage = m.neu - m.bisher;
  return tage === 1 ? "1 Tag pro Woche mehr" : `${tage} Tage pro Woche mehr`;
}

function kinderHinweis(m: Modell) {
  const schule = Math.min(m.schulkinder, m.kinder);
  const kita = m.kinder - schule;
  const teile: string[] = [];
  if (kita > 0) teile.push(kita === 1 ? "1 Kind in der Kita" : `${kita} Kinder in der Kita`);
  if (schule > 0) teile.push(schule === 1 ? "1 Schulkind" : `${schule} Schulkinder`);
  return teile.join(", ");
}

function tageWort(n: number) {
  return n === 1 ? "einen Tag" : `${n} Tage`;
}

function hebelTexte(m: Modell) {
  const texte: string[] = [];
  if (m.hebel.band != null && m.hebel.band !== m.band) texte.push(`Band ${chf(m.hebel.band)}`);
  if (m.hebel.jeKind != null && m.hebel.jeKind > 0) texte.push(`+${chf(m.hebel.jeKind)} je Kind`);
  if (m.hebel.abzugAb != null && m.hebel.abzugAb !== m.abzugAb) {
    texte.push(`voller Satz bis ${chf(m.hebel.abzugAb)}`);
  }
  if (m.hebel.kitaSatz != null && m.hebel.kitaSatz !== m.kitaSatz) {
    texte.push(`Kita ${frankenStunde(m.hebel.kitaSatz)}`);
  }
  if (m.hebel.schuleSatz != null && m.hebel.schuleSatz !== m.schuleSatz) {
    texte.push(`Schule ${frankenStunde(m.hebel.schuleSatz)}`);
  }
  return texte;
}

function frankenStunde(n: number) {
  return `${n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Fr./h`;
}

function pkt(n: number) {
  const abs = Math.abs(n);
  if (n > 0) return `+${abs} CHF`;
  if (n < 0) return `−${abs} CHF`;
  return "0 CHF";
}

function deltaFr(n: number) {
  if (n > 0) return `+${chf(n)}`;
  if (n < 0) return `−${chf(Math.abs(n))}`;
  return chf(0);
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-medium">{title}</h3>
      {children}
    </div>
  );
}

function Range({
  label,
  hint,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span>{format(value)}</span>
      </span>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-pine"
      />
    </label>
  );
}

function Lever({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number | null;
  options: { value: number; label: string }[];
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value == null ? "gesetz" : String(value)}
        onChange={(e) => onChange(e.target.value === "gesetz" ? null : Number(e.target.value))}
        className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
      >
        <option value="gesetz">wie Gesetz</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({
  label,
  hint,
  value,
  tone = "ink",
}: {
  label: string;
  hint: string;
  value: string;
  tone?: "ink" | "clay" | "pine";
}) {
  const color = tone === "clay" ? "text-clay" : tone === "pine" ? "text-pine" : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <p className={`font-serif text-xl ${color}`}>{value}</p>
    </div>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card bg-sand px-3 py-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted">{children}</p>
    </div>
  );
}

function Marke({ cx, cy, payload }: { cx?: number; cy?: number; payload?: Punkt }) {
  if (cx == null || cy == null || !payload) return null;
  const below = payload.key === "gesetz" || payload.quote > 88;
  return (
    <g>
      {payload.key === "hebel" ? (
        <rect
          x={cx - 5}
          y={cy - 5}
          width={10}
          height={10}
          transform={`rotate(45 ${cx} ${cy})`}
          fill="var(--color-clay)"
        />
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={payload.key === "gesetz" ? "var(--color-pine)" : "var(--color-card)"}
          stroke="var(--color-ink)"
          strokeWidth={payload.key === "ohne" ? 2 : 0}
        />
      )}
      <text
        x={cx + 10}
        y={below ? cy + 16 : cy - 10}
        className="fill-ink text-xs"
      >
        {payload.name}: {payload.quote}
      </text>
    </g>
  );
}
