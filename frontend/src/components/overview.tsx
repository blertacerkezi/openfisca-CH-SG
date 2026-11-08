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
  GESETZ,
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

function nurHebel(wert: number, gesetz: number) {
  return Math.abs(wert - gesetz) < 1e-6 ? null : wert;
}

export function Overview({ onBack }: { onBack: () => void }) {
  const [erwachsene, setErwachsene] = useState<1 | 2>(2);
  const [kinder, setKinder] = useState(4);
  const [schulkinder, setSchulkinder] = useState(0);
  const [bisher, setBisher] = useState(0);
  const [neu, setNeu] = useState(1);
  const [partnerPensum, setPartnerPensum] = useState(100);
  const [pensum1, setPensum1] = useState(20);
  const [einkommen, setEinkommen] = useState(90_000);
  const [band, setBand] = useState<number>(GESETZ.band);
  const [abzugAb, setAbzugAb] = useState<number>(GESETZ.abzugAb);
  const [kitaSatz, setKitaSatz] = useState<number>(GESETZ.kitaSatz);
  const [schuleSatz, setSchuleSatz] = useState<number>(GESETZ.schuleSatz);
  const [pensumPaar, setPensumPaar] = useState<number>(GESETZ.pensumPaar);
  const [pensumAllein, setPensumAllein] = useState<number>(GESETZ.pensumAllein);
  const [jeKind, setJeKind] = useState<number>(GESETZ.jeKind);
  const [tarif, setTarif] = useState(12);

  const hebel: HebelWahl = {
    band: nurHebel(band, GESETZ.band),
    jeKind: nurHebel(jeKind, GESETZ.jeKind),
    abzugAb: nurHebel(abzugAb, GESETZ.abzugAb),
    kitaSatz: nurHebel(kitaSatz, GESETZ.kitaSatz),
    schuleSatz: nurHebel(schuleSatz, GESETZ.schuleSatz),
    pensumPaar: nurHebel(pensumPaar, GESETZ.pensumPaar),
    pensumAllein: nurHebel(pensumAllein, GESETZ.pensumAllein),
  };

  const modell: Modell = {
    erwachsene,
    kinder,
    schulkinder: Math.min(schulkinder, kinder),
    bisher,
    neu,
    partnerPensum,
    pensum1,
    band: GESETZ.band,
    abzugAb: GESETZ.abzugAb,
    kitaSatz: GESETZ.kitaSatz,
    schuleSatz: GESETZ.schuleSatz,
    pensumPaar: GESETZ.pensumPaar,
    pensumAllein: GESETZ.pensumAllein,
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
    <main className="flex min-h-screen flex-col gap-3 py-3">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4">
        <button type="button" onClick={onBack} className="min-h-11 text-pine">
          Zur Auswahl
        </button>
        <p className="text-sm text-muted">Modellrechnung, kein Gesuchsentscheid</p>
      </header>

      <div className="grid flex-1 items-stretch gap-3 xl:grid-cols-[minmax(22rem,1.15fr)_minmax(28rem,1.3fr)_minmax(22rem,1.15fr)]">
        <section className="order-3 flex h-full flex-col gap-5 rounded-card border border-line bg-card p-5 xl:order-1">
          <h2 className="font-serif text-2xl">Regeln</h2>

          <Group title="Haushalt">
            <Switch
              label="Haushalt"
              value={erwachsene}
              onChange={setErwachsene}
              options={[
                { value: 1, label: "Allein" },
                { value: 2, label: "Paar" },
              ]}
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
            <Range
              label="Pensum Person 1"
              hint="Die Person, die den Schritt macht"
              min={0}
              max={100}
              step={10}
              value={pensum1}
              format={(n) => `${n} %`}
              onChange={setPensum1}
            />
            {erwachsene === 2 && (
              <Range
                label="Pensum Person 2"
                hint="Zusammen mit Person 1"
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
            <p className="text-xs text-muted">Strich = geltendes Gesetz. Wegschieben gilt als Hebel. Das Gesetz bleibt.</p>
            <MarkedRange
              label="Einkommensband bis"
              min={80_000}
              max={250_000}
              step={2_000}
              value={band}
              gesetz={GESETZ.band}
              format={chf}
              onChange={setBand}
            />
            <MarkedRange
              label="Zuschlag je Kind aufs Band"
              min={0}
              max={40_000}
              step={2_000}
              value={jeKind}
              gesetz={GESETZ.jeKind}
              format={(n) => (n === 0 ? "keiner" : `+${chf(n)}`)}
              onChange={setJeKind}
            />
            <MarkedRange
              label="Voller Satz bis"
              min={0}
              max={100_000}
              step={2_000}
              value={abzugAb}
              gesetz={GESETZ.abzugAb}
              format={chf}
              onChange={setAbzugAb}
            />
            <MarkedRange
              label="Kita ab 18 Monaten"
              min={0}
              max={15}
              step={0.5}
              value={kitaSatz}
              gesetz={GESETZ.kitaSatz}
              format={frankenStunde}
              onChange={setKitaSatz}
            />
            <MarkedRange
              label="Schulkind"
              min={0}
              max={15}
              step={0.5}
              value={schuleSatz}
              gesetz={GESETZ.schuleSatz}
              format={frankenStunde}
              onChange={setSchuleSatz}
            />
            <MarkedRange
              label="Pensum Paar, Minimum"
              min={80}
              max={200}
              step={10}
              value={pensumPaar}
              gesetz={GESETZ.pensumPaar}
              format={(n) => `${n} %`}
              onChange={setPensumPaar}
            />
            <MarkedRange
              label="Pensum Allein, Minimum"
              min={10}
              max={100}
              step={10}
              value={pensumAllein}
              gesetz={GESETZ.pensumAllein}
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
        </section>

        <section className="order-1 flex h-full flex-col gap-4 rounded-card border border-line bg-card p-5 xl:order-2">
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
            <span className="rounded-full bg-sand px-3 py-2">ohne Gesetz: {w.ohne.quote} %</span>
            <span className="rounded-full bg-pine px-3 py-2 text-pine-ink">
              Gesetz: {pkt(w.gesetz.quote - w.ohne.quote)} · {deltaFr(w.gesetz.beitrag)} / Mt.
            </span>
            <span className="rounded-full bg-clay-soft px-3 py-2 text-clay">
              {aktiv
                ? `Hebel: ${pkt(w.hebel.quote - w.gesetz.quote)} · ${deltaFr(w.hebel.beitrag - w.gesetz.beitrag)} / Mt.`
                : "Hebel: wie Gesetz"}
            </span>
          </div>

          {!gezeigt.anspruch && (
            <p className="rounded-card bg-clay-soft px-4 py-3 text-clay">
              Pensum {w.pensumIst} % von nötigen {gezeigt.pensumSoll} %. In dieser Variante zahlt der
              Kanton nichts.
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
                  width={52}
                  stroke="var(--color-muted)"
                  tickFormatter={(v: number) => `${v} %`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)} %`, "Bleibt"]}
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

        <section className="order-2 flex h-full flex-col gap-4 rounded-card border border-line bg-card p-5 xl:order-3">
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
              !gezeigt.anspruch
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
              <p className="text-sm text-muted">{gezeigt.quote} %</p>
            </div>
            <p className="font-serif text-3xl text-ink">{chf(gezeigt.bleibt)}</p>
          </div>

          <div>
            <h3 className="font-medium">Mögliche Loopholes</h3>
            <div className="mt-2 flex flex-col gap-2">
              <Note title="Einkommen steigt, nicht gemeldet · Art. 11 KiBV">
                Ein Viertel mehr Einkommen senkt den Faktor auf {Math.round(w.einkommen25.faktor * 100)} %.
                Beitrag dann {chf(w.einkommen25.beitrag)} statt {chf(gezeigt.beitrag)}, es bleiben{" "}
                {w.einkommen25.quote} %.
              </Note>
              <Note title="Mehr Betreuung als Arbeit · Art. 7 KiBV">
                Zwei zusätzliche Betreuungstage ohne mehr Lohn kosten {chf(w.extraBetreuung)} extra.
                Dann bleiben {w.extraQuote} %.
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
  if (m.hebel.pensumPaar != null && m.hebel.pensumPaar !== m.pensumPaar) {
    texte.push(`Pensum Paar ${m.hebel.pensumPaar} %`);
  }
  if (m.hebel.pensumAllein != null && m.hebel.pensumAllein !== m.pensumAllein) {
    texte.push(`Pensum Allein ${m.hebel.pensumAllein} %`);
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

function Switch<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1 grid grid-cols-2 gap-1 rounded-card border border-line p-1">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-card ${value === option.value ? "bg-pine text-pine-ink" : "text-ink"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MarkedRange({
  label,
  min,
  max,
  step,
  value,
  gesetz,
  format,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  gesetz: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const lage = Math.abs(value - gesetz) < 1e-6;
  const pct = ((gesetz - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span>
          {format(value)}
          <span className={lage ? "text-pine" : "text-clay"}> · {lage ? "Gesetz" : "Hebel"}</span>
        </span>
      </span>
      <span className="relative mt-2 block">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 w-full accent-pine"
        />
        <span
          className="pointer-events-none absolute top-1/2 z-20 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay"
          style={{ left: `${pct}%` }}
        />
      </span>
      <span className="mt-1 block text-xs text-ink">Gesetz {format(gesetz)}</span>
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
        {payload.name}: {payload.quote} %
      </text>
    </g>
  );
}
