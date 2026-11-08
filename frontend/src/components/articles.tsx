
import { useState } from "react";

export type ArticleStep =
  | "wohnsitz"
  | "kinder"
  | "kalender"
  | "haushalt"
  | "einkommen"
  | "aktuell"
  | "meldung"
  | "result";

type Article = {
  id: string;
  law: string;
  title: string;
  explanation: string;
  reason: string;
  reference: string;
};

const ARTICLES: Record<string, Article> = {
  obhut: {
    id: "obhut",
    law: "Art. 2 KiBG · Erläuterungen zu Art. 7 KiBV",
    title: "Entscheidend ist die tatsächliche Obhut",
    explanation:
      "Für den Betreuungsbeitrag ist entscheidend, " +
      "wer die Betreuung und Obhut des Kindes " +
      "tatsächlich wahrnimmt. Das Sorgerecht " +
      "allein ist nicht ausschlaggebend. " +
      "Bei geteilter Obhut stellt jeder Elternteil " +
      "für seine Betreuungstage ein eigenes Gesuch " +
      "bei seiner Wohngemeinde.",
    reason:
      "Die Regel soll klarstellen, welche Gemeinde " +
      "zuständig ist und verhindern, dass für " +
      "dieselben Betreuungstage doppelte Beiträge " +
      "beantragt werden.",
    reference:
      "Erläuterungen zu KiBV Art. 7; KiBG Art. 2",
  },

  pensum: {
    id: "pensum",
    law: "Art. 4 Abs. 1 Bst. b KiBG",
    title: "Gemeinsames Erwerbspensum von mindestens 120 %",
    explanation:
      "Leben die Eltern im gleichen Haushalt, " +
      "müssen ihre massgebenden Erwerbspensen " +
      "zusammen mindestens 120 % erreichen. " +
      "Arbeitet beispielsweise eine Person 100 % " +
      "und die andere Person 0 %, ist diese " +
      "Voraussetzung nicht erfüllt. " +
      "Ein höheres Pensum kann sich aus mehreren " +
      "Arbeitsverhältnissen ergeben, soweit " +
      "es nach den massgebenden Regeln anrechenbar ist.",
    reason:
      "Die Beiträge sollen die Vereinbarkeit " +
      "von Familie und Erwerbstätigkeit fördern. " +
      "Die weitergehende Begründung zur Betreuung " +
      "durch nicht erwerbstätige Elternteile " +
      "ist eine Auslegung der Gesetzesmaterialien.",
    reference:
      "KiBG Art. 4 Abs. 1 Bst. b; " +
      "Botschaft 22.25.02, S. 2",
  },

  ausnahmen: {
    id: "ausnahmen",
    law: "Art. 4 Abs. 2 KiBG · Erläuterungen zu Art. 12 KiBV",
    title: "Ausnahmen vom Mindestpensum",
    explanation:
      "Das erforderliche Erwerbspensum muss " +
      "nicht in jeder besonderen Lebenssituation " +
      "gleich angewendet werden. " +
      "Eine Ausnahmeprüfung kann insbesondere " +
      "bei Stellensuche, Ausbildung oder " +
      "beruflicher Integration, bei besonderen " +
      "familiären Belastungen oder bei einem " +
      "besonderen Förderbedarf des Kindes " +
      "in Betracht kommen. " +
      "Die betroffene Person muss ihre Situation " +
      "beschreiben und begründen. " +
      "Die zuständige Stelle entscheidet " +
      "über den Einzelfall.",
    reason:
      "Ein Mindestpensum ist nicht für alle " +
      "familiären Konstellationen sachgerecht. " +
      "Ein Merkblatt soll eine möglichst " +
      "einheitliche Anwendung ermöglichen.",
    reference:
      "KiBG Art. 4 Abs. 2; " +
      "Erläuterungen zu KiBV Art. 12",
  },

  konkubinat: {
    id: "konkubinat",
    law: "Erläuterungen zu Art. 8 KiBV",
    title: "Wann das Einkommen der Partnerperson mitzählt",
    explanation:
      "Bei einer gefestigten Lebensgemeinschaft " +
      "wird das Einkommen der Partnerperson " +
      "in die Berechnung einbezogen. " +
      "Nach den Erläuterungen wird dafür " +
      "insbesondere eine Konkubinatsdauer " +
      "von zwei Jahren herangezogen. " +
      "WG-Mitbewohnende und erwachsene Kinder " +
      "zählen nicht allein wegen des " +
      "gemeinsamen Wohnens dazu. " +
      "Ein gemeinsames Kind allein begründet " +
      "nach diesen Erläuterungen noch keine " +
      "gefestigte Lebensgemeinschaft.",
    reason:
      "Konkubinatspaare sollen bei der " +
      "Einkommensberechnung nicht gegenüber " +
      "Ehepaaren bevorzugt werden. " +
      "Die Zweijahresgrenze orientiert sich " +
      "an der Sozialhilfe.",
    reference:
      "Erläuterungen zu KiBV Art. 8",
  },

  betreuungszeit: {
    id: "betreuungszeit",
    law: "Art. 14 Abs. 4 KiBV",
    title: "Höchstens zwölf Stunden pro Tag und fünf Tage pro Woche",
    explanation:
      "Für die Beitragsberechnung werden " +
      "höchstens zwölf Betreuungsstunden " +
      "pro Tag und fünf Betreuungstage " +
      "pro Woche berücksichtigt. " +
      "Eine längere Betreuung ist möglich. " +
      "Die darüber hinausgehenden Stunden " +
      "oder Tage werden jedoch nicht " +
      "durch diesen Beitrag vergünstigt.",
    reason:
      "Überlange Betreuungstage und " +
      "Nachtbetreuung sollen nicht " +
      "übermässig vergünstigt werden.",
    reference:
      "Erläuterungen zu KiBV Art. 14 Abs. 4",
  },

  einkommensgrenzen: {
    id: "einkommensgrenzen",
    law: "Art. 15 KiBV",
    title: "Der Beitrag sinkt mit steigendem Einkommen",
    explanation:
      "Bei einem massgebenden Jahreseinkommen " +
      "bis CHF 40'000 gilt der volle " +
      "Einkommensfaktor. Zwischen CHF 40'000 " +
      "und CHF 154'000 sinkt der Beitrag " +
      "kontinuierlich, ohne abrupte Stufen. " +
      "Ab CHF 154'000 beträgt der " +
      "einkommensabhängige Beitrag null. " +
      "Gemäss den Erläuterungen sollen " +
      "rund 70 % der Familien profitieren.",
    reason:
      "Familien mit tiefen und mittleren " +
      "Einkommen sollen besonders entlastet " +
      "werden. Der gleitende Verlauf " +
      "verhindert abrupte Beitragsverluste " +
      "bei kleinen Einkommenserhöhungen.",
    reference:
      "Erläuterungen Kap. 3.2.2; KiBV Art. 15",
  },

  neuberechnung: {
    id: "neuberechnung",
    law: "Art. 5 Abs. 4 KiBG · Art. 11 KiBV",
    title: "Neuberechnung bei einer Einkommensänderung",
    explanation:
      "Weicht das aktuelle massgebende " +
      "Einkommen um mindestens 25 % " +
      "von der letzten Steuerveranlagung ab, " +
      "kann auf Antrag eine Neuberechnung " +
      "vorgenommen werden. " +
      "Die Veränderung muss nicht dauerhaft sein. " +
      "Dies kann beispielsweise nach der " +
      "Geburt eines Kindes wichtig werden, " +
      "wenn ein Elternteil sein Erwerbspensum " +
      "reduziert.",
    reason:
      "Die Berechnung soll die tatsächliche " +
      "finanzielle Situation berücksichtigen, " +
      "wenn ältere Steuerdaten erheblich " +
      "davon abweichen.",
    reference:
      "Erläuterungen zu KiBV Art. 11; " +
      "KiBG Art. 5 Abs. 4",
  },

  gueltigkeit: {
    id: "gueltigkeit",
    law: "Art. 16 KiBV",
    title: "Wie lange der festgelegte Beitrag gilt",
    explanation:
      "Im Vorschulbereich gilt die " +
      "Beitragsfestlegung für zwölf Monate. " +
      "Im Schulbereich richtet sich die " +
      "Geltungsdauer nach dem Schuljahr. " +
      "Führt eine Regeländerung zu einem " +
      "tieferen Beitrag, soll die Kürzung " +
      "erst mit der nächsten Verfügung " +
      "wirksam werden.",
    reason:
      "Die Regel berücksichtigt die " +
      "unterschiedlichen Abläufe in " +
      "Vorschule und Schule und sorgt " +
      "für Planungssicherheit.",
    reference:
      "Erläuterungen zu KiBV Art. 16",
  },

  bundeszulage: {
    id: "bundeszulage",
    law: "UKibeG · BBl 2026 718 · Erläuterungen Kap. 3",
    title: "Abstimmung mit der Betreuungszulage des Bundes",
    explanation:
      "Die vorgesehenen kantonalen Höchstbeiträge " +
      "sind auf die neue Betreuungszulage " +
      "des Bundes abgestimmt. " +
      "Gemäss den genannten Unterlagen " +
      "beträgt diese CHF 100 pro Monat " +
      "und Betreuungstag pro Woche. " +
      "Die Kombination der Leistungen " +
      "soll nicht zu einer Überentschädigung führen. " +
      "Die Bundeszulage wird in diesem Rechner " +
      "nicht automatisch als zusätzlicher " +
      "kantonaler Beitrag ausgewiesen.",
    reason:
      "Bundesleistungen und kantonale " +
      "Beiträge sollen sinnvoll " +
      "aufeinander abgestimmt werden.",
    reference:
      "Erläuterungen Kap. 3; " +
      "UKibeG, BBl 2026 718",
  },
};

const STEP_ARTICLES: Record<ArticleStep, string[]> = {
  wohnsitz: ["obhut"],

  kinder: ["obhut"],

  kalender: [
    "betreuungszeit",
    "bundeszulage",
  ],

  haushalt: [
    "pensum",
    "ausnahmen",
    "konkubinat",
  ],

  einkommen: [
    "konkubinat",
    "einkommensgrenzen",
  ],

  aktuell: ["neuberechnung"],

  meldung: [
    "ausnahmen",
    "neuberechnung",
  ],

  result: [
    "einkommensgrenzen",
    "gueltigkeit",
    "bundeszulage",
  ],
};

const STEP_LABELS: Record<ArticleStep, string> = {
  wohnsitz: "Wohnsitz und Zuständigkeit",
  kinder: "Kinder und Obhut",
  kalender: "Betreuungsumfang",
  haushalt: "Haushalt und Erwerbstätigkeit",
  einkommen: "Einkommen und Vermögen",
  aktuell: "Aktuelle Einkommenssituation",
  meldung: "Ausnahmen und Nachweise",
  result: "Berechnung und Beitragsdauer",
};

function ArticleCard({
  article,
}: {
  article: Article;
}) {
  // Alle Artikel starten zugeklappt.
  const [open, setOpen] = useState(false);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-card">
      <button
        type="button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        aria-expanded={open}
        className="flex min-h-14 w-full items-start justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-semibold uppercase leading-relaxed tracking-wide text-pine">
            {article.law}
          </span>

          <span className="font-medium leading-relaxed text-ink">
            {article.title}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="shrink-0 text-xl text-muted"
        >
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-4 pb-5 pt-4">
          <p className="leading-relaxed text-ink">
            {article.explanation}
          </p>

          <div className="mt-4 rounded-card bg-sand p-3">
            <p className="text-sm font-semibold text-ink">
              Warum gibt es diese Regel?
            </p>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {article.reason}
            </p>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Quelle: {article.reference}
          </p>
        </div>
      )}
    </article>
  );
}

export function Articles({
  step,
}: {
  step: ArticleStep;
}) {
  const articles = STEP_ARTICLES[step]
    .map((id) => ARTICLES[id])
    .filter(
      (article): article is Article =>
        Boolean(article)
    );

  return (
    <aside className="min-w-0">
      <div className="lg:sticky lg:top-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-pine">
          Rechtliche Grundlagen
        </p>

        <h2 className="mt-2 font-serif text-2xl leading-tight text-ink">
          {STEP_LABELS[step]}
        </h2>

        <p className="mb-5 mt-3 text-sm leading-relaxed text-muted">
          Die folgenden Bestimmungen erklären
          die Voraussetzungen und Regeln,
          die für diesen Formularschritt
          wichtig sind.
        </p>

        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <ArticleCard
              key={`${step}-${article.id}`}
              article={article}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
