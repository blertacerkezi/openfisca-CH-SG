import { useEffect, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { TAX_YEAR } from "@/lib/kibg";

export type ArticleStep =
  | "wohnsitz"
  | "kinder"
  | "kalender"
  | "haushalt"
  | "einkommen"
  | "aktuell"
  | "meldung"
  | "result";

const ARTICLES: Record<
  ArticleStep,
  Array<{ id: string; title: string; body: string }>
> = {
  wohnsitz: [
    {
      id: "a4",
      title: "Art. 4 Abs. 1 KiBG — Wohnsitz",
      body: "Beiträge gibt es nur, wenn die erziehungsberechtigte Person den zivilrechtlichen Wohnsitz im Kanton St. Gallen hat. Wohnt niemand von ihnen im Kanton, endet die Prüfung.",
    },
  ],
  kinder: [
    {
      id: "a43",
      title: "Art. 4 Abs. 3 KiBG — Alter",
      body: "Das Kind muss mindestens drei Monate alt sein. Ein numerisches Höchstalter gibt es nicht: der Anspruch endet mit dem Abschluss der Primarschule. Einschulung und voraussichtliches Ende der Primarstufe bestimmen den Betreuungstarif und das Ende des Anspruchs.",
    },
    {
      id: "a3",
      title: "Art. 3 Abs. 1 KiBG — Einrichtung",
      body: "Die Betreuung muss in einer anerkannten und angemeldeten Einrichtung stattfinden: Kindertagesstätte, Tagesfamilie oder schulergänzende Betreuung.",
    },
  ],
  kalender: [
    {
      id: "a7",
      title: "Art. 7 KiBV — Obhut und Betreuung",
      body: "Gezählt werden nur Tage, an denen die faktische Obhut besteht und Betreuung tatsächlich beansprucht wird. Stunden und Betreuungsart am Kalendertag bestimmen den Beitrag dieses Monats.",
    },
  ],
  haushalt: [
    {
      id: "pensum",
      title: "Art. 4 Abs. 1 KiBG — Pensum",
      body: "Eine erziehungsberechtigte Person braucht wenigstens 20 Prozent Beschäftigung. Leben mehrere Erziehungsberechtigte im Haushalt, müssen sie zusammen wenigstens 120 Prozent erreichen. 120 und 0 erfüllt den Wortlaut.",
    },
    {
      id: "a8",
      title: "Art. 8 KiBV — Haushalt",
      body: "Massgebend sind Einkommen und Vermögen der Personen mit Obhut. Bei Ehe oder eingetragener Partnerschaft und bei einer Lebensgemeinschaft von wenigstens zwei Jahren zählt auch die Partnerin oder der Partner mit, selbst bei getrenntem Haushalt.",
    },
    {
      id: "a12k",
      title: "Art. 4 Abs. 2 KiBG und Art. 12 KiBV — Ausnahme",
      body: "Liegt das Pensum darunter, kann der Kanton eine Ausnahme prüfen: berufliche Integration, familiäre Belastung oder eine kindliche Indikation. Diese Angaben gehen mit dem Gesuch an den Kanton.",
    },
  ],
  einkommen: [
    {
      id: "a12",
      title: "Art. 12 EG-KVG — ordentlich besteuert",
      body: `Grundlage ist das Reineinkommen der Steuerperiode ${TAX_YEAR}. Fehlt eine rechtskräftige Veranlagung, gilt die Steuerdeklaration, nicht Art. 12bis. Hinzu kommen 20 Prozent des Vermögens, Säule 3a, BVG, übersteigender Liegenschaftsaufwand, Verluste, 75 Prozent des vereinfachten Lohns, Zuwendungen sowie 30 Prozent von Eigenmietwert und qualifizierten Beteiligungen. Abzug: 4'000 Franken je Kind.`,
    },
    {
      id: "a12bis",
      title: "Art. 12bis EG-KVG — quellenbesteuert",
      body: "Massgebend ist das definitive Bruttoeinkommen der Quellensteuer des vorletzten Jahres, plus Lohn aus dem vereinfachten Verfahren. Davon zählen 75 Prozent. Bei Grenzgängerinnen und Grenzgängern wird mit dem Kaufkraftindex umgerechnet. Ein Kinderabzug wird hier nicht abgezogen.",
    },
    {
      id: "a12a",
      title: "Art. 12a EG-KVG — keine Veranlagung",
      body: "Gibt es keine ordentliche Steuerveranlagung, etwa nach Zuzug, zählen Einkommens- und Vermögensnachweise. Fehlt auch das Vorjahr, ist das voraussichtliche Einkommen des Bezugsjahrs massgebend. Vermögen wird zu 20 Prozent hinzugerechnet.",
    },
  ],
  aktuell: [
    {
      id: "a11",
      title: "Art. 11 KiBV — 25 Prozent",
      body: "Weicht die heutige Situation um wenigstens einen Viertel vom massgebenden Betrag aus der Veranlagung ab, gilt der heutige Stand. Darunter bleibt die Veranlagung.",
    },
  ],
  meldung: [
    {
      id: "a12m",
      title: "Art. 12 KiBV — Ausnahme",
      body: "Wer das Pensum nicht erreicht, nennt den Grund: berufliche Integration oder Stellensuche, familiäre Belastung, oder eine Entwicklungs-, Verhaltens- oder Sprachindikation des Kindes. Der Kanton prüft das mit dem Gesuch.",
    },
    {
      id: "a12a-m",
      title: "Art. 12 und 12a EG-KVG — ohne Veranlagung",
      body: "Liegt keine rechtskräftige Veranlagung vor, ersetzen Steuerdeklaration oder Einkommens- und Vermögensnachweise die Verfügung. Die Belege werden mit dem Gesuch an den Kanton geschickt.",
    },
  ],
  result: [
    {
      id: "a15",
      title: "Art. 13–15 KiBV — Beitrag",
      body: "Bis 40'000 Franken massgebendes Einkommen gilt der Höchstbeitrag je Stunde. Er sinkt linear und ist ab 154'000 Franken null. Der Stundensatz hängt von Betreuungsart und Alter ab: Kita unter 18 Monaten 11 Franken, Kita ab 18 Monaten 7.50, Tagesfamilie unter 18 Monaten 8.30, sonst 5.50.",
    },
  ],
};

export function Articles({ step }: { step: ArticleStep }) {
  const items = ARTICLES[step];
  const [open, setOpen] = useState<string[]>([items[0]?.id ?? ""]);
  useEffect(() => {
    setOpen([items[0]?.id ?? ""]);
  }, [step, items]);
  return (
    <aside className="flex flex-col gap-4">
      <p className="font-serif text-2xl text-ink">Gesetz, das jetzt gilt</p>
      <p className="text-muted">
        Die Stelle, die zur aktuellen Frage gehört, ist offen. Die anderen lassen sich aufklappen.
      </p>
      <Accordion.Root
        type="multiple"
        value={open}
        onValueChange={setOpen}
        className="flex flex-col gap-2"
      >
        {items.map((item) => (
          <Accordion.Item
            key={item.id}
            value={item.id}
            className="overflow-hidden rounded-card border border-line bg-card"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium text-ink">
                {item.title}
                <span className="text-muted" aria-hidden>
                  +
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="px-4 pb-4 text-ink leading-relaxed">
              {item.body}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </aside>
  );
}
