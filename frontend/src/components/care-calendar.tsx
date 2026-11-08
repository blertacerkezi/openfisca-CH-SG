
import { useMemo, useState } from "react";
import type {
  CareType,
  ChildInput,
  DayCare,
} from "@/lib/kibg";

const TYPES: Array<{
  id: CareType;
  label: string;
}> = [
  { id: "kita", label: "Kita" },
  { id: "tagesfamilie", label: "Tagesfamilie" },
  {
    id: "schulergaenzend",
    label: "Schulergänzend",
  },
];

// Erweiterung nur für diesen Kalender.
// kibg.ts muss nicht geändert werden.
type StoredCare = DayCare & {
  previousCare?: DayCare;
};

type FerienZeitraum = {
  von: string;
  bis: string;
};

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function stored(
  value: DayCare | undefined,
): StoredCare | undefined {
  return value as StoredCare | undefined;
}

function originalCare(
  value: StoredCare | undefined,
): DayCare | undefined {
  if (!value) return undefined;

  if (value.elternferien) {
    return value.previousCare;
  }

  return {
    hours: value.hours,
    type: value.type,
    obhut: value.obhut,
  };
}

function applyHoliday(
  value: StoredCare | undefined,
): StoredCare {
  return {
    hours: 0,
    type: value?.type ?? "kita",
    obhut: true,
    elternferien: true,

    // Bei erneutem Eintragen der Ferien
    // den ursprünglichen Eintrag behalten.
    previousCare: originalCare(value),
  };
}

function removeHoliday(
  value: StoredCare | undefined,
): DayCare | undefined {
  if (!value?.elternferien) return value;

  // Ursprüngliche Betreuung wiederherstellen.
  return value.previousCare;
}

function dateRange(von: string, bis: string) {
  const dates: string[] = [];

  const end = parseDate(bis);

  for (
    const current = parseDate(von);
    current <= end;
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(dateKey(current));
  }

  return dates;
}

const MAX_HOURS = 12;
const MAX_DAYS_PER_WEEK = 5;

function activeCare(care: DayCare | undefined): boolean {
  return Boolean(
    care &&
    !care.elternferien &&
    care.obhut &&
    care.hours > 0
  );
}

function mondayKey(date: string): string {
  const monday = parseDate(date);
  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7)
  );
  return dateKey(monday);
}

function validateCareDays(
  days: Record<string, DayCare>
): string | null {
  const counts = new Map<string, number>();

  for (const [date, care] of Object.entries(days)) {
    if (!activeCare(care)) continue;

    if (
      !Number.isFinite(care.hours) ||
      care.hours > MAX_HOURS
    ) {
      return `Am ${date} sind höchstens 12 Betreuungsstunden zulässig.`;
    }

    const week = mondayKey(date);
    const count = (counts.get(week) ?? 0) + 1;

    if (count > MAX_DAYS_PER_WEEK) {
      return `In der Woche ab ${week} sind höchstens 5 Betreuungstage zulässig.`;
    }

    counts.set(week, count);
  }

  return null;
}

export function CareCalendar({
  children,
  onChange,
}: {
  children: ChildInput[];
  onChange: (next: ChildInput[]) => void;
}) {
  const [cursor, setCursor] = useState({
    year: 2026,
    month: 10,
  });

  const [active, setActive] = useState(
    children[0]?.id ?? "",
  );

  const [picked, setPicked] = useState<
    string | null
  >(null);

  const [ferienVon, setFerienVon] = useState("");
  const [ferienBis, setFerienBis] = useState("");

  const child =
    children.find((item) => item.id === active) ??
    children[0];

  const cells = useMemo(() => {
    const first = new Date(
      cursor.year,
      cursor.month,
      1,
    ).getDay();

    const lead = (first + 6) % 7;
    const count = daysIn(
      cursor.year,
      cursor.month,
    );

    const blanks = Array.from(
      { length: lead },
      () => null,
    );

    const dates = Array.from(
      { length: count },
      (_, index) =>
        `${monthKey(cursor.year, cursor.month)}-${String(
          index + 1,
        ).padStart(2, "0")}`,
    );

    return [...blanks, ...dates];
  }, [cursor]);

  // Ferien aus allen Kindern ermitteln.
  const ferienZeitraeume = useMemo(() => {
    const dates = [
      ...new Set(
        children.flatMap((item) =>
          Object.entries(item.days)
            .filter(
              ([, care]) => care.elternferien,
            )
            .map(([date]) => date),
        ),
      ),
    ].sort();

    const ranges: FerienZeitraum[] = [];

    for (const date of dates) {
      const last = ranges[ranges.length - 1];

      if (last) {
        const next = parseDate(last.bis);
        next.setDate(next.getDate() + 1);

        if (dateKey(next) === date) {
          last.bis = date;
          continue;
        }
      }

      ranges.push({
        von: date,
        bis: date,
      });
    }

    return ranges;
  }, [children]);

  if (!child) return null;

  const draft = picked
    ? stored(child.days[picked])
    : undefined;

  function patch(
    date: string,
    next: DayCare | null,
  ) {
    if (
      next !== null &&
      (
        !Number.isFinite(next.hours) ||
        next.hours < 0 ||
        next.hours > MAX_HOURS
      )
    ) {
      alert(
        "Gemäss Art. 14 Abs. 4 KiBV sind höchstens " +
        "12 subventionierte Betreuungsstunden pro Tag zulässig."
      );
      return;
    }

    const days = { ...child.days };

    if (next === null) {
      delete days[date];
    } else {
      days[date] = next;
    }

    const error = validateCareDays(days);

    if (error) {
      alert(
        `${error} Rechtsgrundlage: Art. 14 Abs. 4 KiBV.`
      );
      return;
    }

    onChange(
      children.map((item) =>
        item.id === child.id
          ? { ...item, days }
          : item
      )
    );
  }

  function ferienEintragen() {
    if (
      !ferienVon ||
      !ferienBis ||
      ferienVon > ferienBis
    ) {
      return;
    }

    const dates = dateRange(
      ferienVon,
      ferienBis,
    );

    if (dates.length > 366) {
      alert(
        "Bitte einen Zeitraum von maximal 366 Tagen auswählen.",
      );
      return;
    }

    onChange(
      children.map((item) => {
        const days = { ...item.days };

        for (const date of dates) {
          days[date] = applyHoliday(
            stored(days[date]),
          );
        }

        return {
          ...item,
          days,
        };
      }),
    );

    setFerienVon("");
    setFerienBis("");
  }

  function ferienZeitraumEntfernen(
    von: string,
    bis: string,
  ) {
    const dates = dateRange(von, bis);

    onChange(
      children.map((item) => {
        const days = { ...item.days };

        for (const date of dates) {
          const existing = stored(days[date]);

          if (!existing?.elternferien) {
            continue;
          }

          const previous = removeHoliday(existing);

          if (previous) {
            days[date] = previous;
          } else {
            delete days[date];
          }
        }

        return {
          ...item,
          days,
        };
      }),
    );
  }

  function ferienFuerEinKindEntfernen(
    date: string,
  ) {
    const previous = removeHoliday(draft);

    patch(date, previous ?? null);
  }

  function spread() {
    const prefix = monthKey(
      cursor.year,
      cursor.month,
    );

    const pattern = new Map<number, DayCare>();

    // Wochenmuster aus dem angezeigten
    // Monat lesen.
    for (const [date, raw] of Object.entries(
      child.days,
    )) {
      if (!date.startsWith(prefix)) {
        continue;
      }

      const care = stored(raw);

      // Auch während Elternferien kann ein
      // gespeichertes Wochenmuster existieren.
      const sample = originalCare(care);

      if (!sample) continue;

      pattern.set(
        parseDate(date).getDay(),
        {
          hours: sample.hours,
          type: sample.type,
          obhut: sample.obhut,
        },
      );
    }

    if (pattern.size === 0) {
      alert(
        "Bitte zuerst ein Wochenmuster im angezeigten Monat erfassen.",
      );
      return;
    }

    const updatedChildren = children.map((item) => {
        if (item.id !== child.id) {
          return item;
        }

        const days = { ...item.days };

        for (
          let offset = 0;
          offset < 12;
          offset += 1
        ) {
          const start = new Date(
            2026,
            10 + offset,
            1,
          );

          const year = start.getFullYear();
          const month = start.getMonth();
          const count = daysIn(year, month);

          for (
            let day = 1;
            day <= count;
            day += 1
          ) {
            const date = [
              year,
              String(month + 1).padStart(2, "0"),
              String(day).padStart(2, "0"),
            ].join("-");

            const sample = pattern.get(
              parseDate(date).getDay(),
            );

            if (!sample) continue;

            const existing = stored(days[date]);

            if (existing?.elternferien) {
              // Ferien bleiben bei 0 Stunden.
              // Neues Wochenmuster wird aber
              // für später gespeichert.
              days[date] = {
                ...existing,
                previousCare: {
                  hours: sample.hours,
                  type: sample.type,
                  obhut: sample.obhut,
                },
              };
            } else {
              days[date] = {
                hours: sample.hours,
                type: sample.type,
                obhut: sample.obhut,
                elternferien: false,
              };
            }
          }
        }

        return {
          ...item,
          days,
        };
      });

    const updatedChild = updatedChildren.find(
      (item) => item.id === child.id
    );

    const error = updatedChild
      ? validateCareDays(updatedChild.days)
      : null;

    if (error) {
      alert(
        `Wochenmuster nicht übertragen: ${error} ` +
        "Rechtsgrundlage: Art. 14 Abs. 4 KiBV."
      );
      return;
    }

    onChange(updatedChildren);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-sand p-4 text-sm">
        <p className="font-medium text-ink">
          Gesetzliche Begrenzung der subventionierten Betreuung
        </p>

        <p className="mt-2 text-muted">
          Pro Kind können höchstens 12 Betreuungsstunden
          pro Tag und höchstens 5 Betreuungstage pro Woche
          berücksichtigt werden.
          Rechtsgrundlage: Art. 14 Abs. 4 KiBV.
        </p>

        <p className="mt-1 text-muted">
          Diese Grenzen betreffen die subventionierbare
          Betreuung, nicht zwingend die tatsächlich
          genutzte Betreuung.
        </p>
      </div>

      {/* Kind auswählen */}
      <div className="flex flex-wrap gap-2">
        {children.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActive(item.id);
              setPicked(null);
            }}
            className={`min-h-11 rounded-card px-3 ${
              item.id === child.id
                ? "bg-pine text-pine-ink"
                : "bg-sand text-ink"
            }`}
          >
            {item.name || `Kind ${index + 1}`}
          </button>
        ))}
      </div>

      {/* Monat wechseln */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="min-h-11 px-3"
          onClick={() =>
            setCursor((current) =>
              current.month === 0
                ? {
                    year: current.year - 1,
                    month: 11,
                  }
                : {
                    ...current,
                    month: current.month - 1,
                  },
            )
          }
        >
          Zurück
        </button>

        <p className="font-medium">
          {new Date(
            cursor.year,
            cursor.month,
            1,
          ).toLocaleDateString("de-CH", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <button
          type="button"
          className="min-h-11 px-3"
          onClick={() =>
            setCursor((current) =>
              current.month === 11
                ? {
                    year: current.year + 1,
                    month: 0,
                  }
                : {
                    ...current,
                    month: current.month + 1,
                  },
            )
          }
        >
          Weiter
        </button>
      </div>

      {/* Wochentage */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">
        {[
          "Mo",
          "Di",
          "Mi",
          "Do",
          "Fr",
          "Sa",
          "So",
        ].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      {/* Monatskalender */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) {
            return <span key={`blank-${index}`} />;
          }

          const care = stored(child.days[date]);
          const day = Number(date.slice(-2));

          return (
            <button
              key={date}
              type="button"
              onClick={() => setPicked(date)}
              className={`min-h-11 rounded-md border text-sm ${
                care?.elternferien
                  ? "border-amber-500 bg-amber-50 text-ink"
                  : care?.hours
                    ? "border-pine bg-moss text-ink"
                    : "border-line bg-card text-ink"
              } ${
                picked === date
                  ? "ring-2 ring-pine"
                  : ""
              }`}
            >
              {day}

              {care?.elternferien ? (
                <span className="block text-xs">
                  Ferien
                </span>
              ) : care?.hours ? (
                <span className="block text-xs">
                  {care.hours}h
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Einzelnen Tag bearbeiten */}
      {picked && (
        <div className="rounded-card border border-line bg-card p-4">
          <p className="font-medium">
            {parseDate(picked).toLocaleDateString(
              "de-CH",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
              },
            )}
          </p>

          {draft?.elternferien && (
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-ink">
              <p>
                Elternferien: Das Kind wird zu
                Hause betreut.
              </p>

              {draft.previousCare && (
                <p className="mt-1">
                  Gespeicherte Betreuung:{" "}
                  {draft.previousCare.hours} Stunden
                  {" · "}
                  {TYPES.find(
                    (type) =>
                      type.id ===
                      draft.previousCare?.type,
                  )?.label ??
                    draft.previousCare.type}
                </p>
              )}

              <button
                type="button"
                className="mt-2 underline"
                onClick={() =>
                  ferienFuerEinKindEntfernen(
                    picked,
                  )
                }
              >
                Ferien für dieses Kind entfernen
              </button>
            </div>
          )}

          <label className="mt-3 flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={draft?.obhut ?? false}
              onChange={(event) =>
                patch(picked, {
                  obhut: event.target.checked,
                  hours: draft?.hours ?? 0,
                  type: draft?.type ?? "kita",
                  elternferien: false,
                })
              }
            />
            An diesem Tag habe ich die Obhut
          </label>

          <label className="mt-2 block text-sm text-muted">
            Betreuungsart

            <select
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
              value={draft?.type ?? "kita"}
              onChange={(event) =>
                patch(picked, {
                  obhut: draft?.obhut ?? true,
                  hours: draft?.hours ?? 0,
                  type: event.target.value as CareType,
                  elternferien: false,
                })
              }
            >
              {TYPES.map((type) => (
                <option
                  key={type.id}
                  value={type.id}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-2 block text-sm text-muted">
            Subventionierbare Betreuungsstunden
            (max. 12 pro Tag)

            <input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={draft?.hours ?? 0}
              onFocus={(event) => {
                if (
                  event.currentTarget.value ===
                  "0"
                ) {
                  event.currentTarget.select();
                }
              }}
              onChange={(event) => {
                const raw = event.currentTarget.value;
                const hours = raw === "" ? 0 : Number(raw);

                if (
                  !Number.isFinite(hours) ||
                  hours < 0 ||
                  hours > MAX_HOURS
                ) {
                  alert(
                    "Maximal 12 Stunden pro Tag gemäss " +
                    "Art. 14 Abs. 4 KiBV."
                  );
                  return;
                }

                patch(picked, {
                  obhut: draft?.obhut ?? true,
                  type: draft?.type ?? "kita",
                  hours,
                  elternferien: false,
                });
              }}
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>
        </div>
      )}

      {/* Elternferien */}
      <div className="rounded-card border border-line bg-card p-4">
        <h3 className="font-medium">
          Ferien der Eltern – mehrere Zeiträume
          möglich
        </h3>

        <p className="mt-2 text-sm text-muted">
          Elternferien gelten automatisch für
          alle Kinder. Während der Ferien
          zählen 0 externe Betreuungsstunden.
          Die vorherige Kita- oder
          Tagesfamilienbetreuung bleibt
          gespeichert und wird beim Entfernen
          der Ferien wiederhergestellt.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Ferien von

            <input
              type="date"
              value={ferienVon}
              onChange={(event) =>
                setFerienVon(
                  event.target.value,
                )
              }
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>

          <label className="text-sm">
            Ferien bis

            <input
              type="date"
              value={ferienBis}
              min={ferienVon || undefined}
              onChange={(event) =>
                setFerienBis(
                  event.target.value,
                )
              }
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={ferienEintragen}
          disabled={
            !ferienVon ||
            !ferienBis ||
            ferienVon > ferienBis
          }
          className="mt-3 min-h-11 rounded-card bg-pine px-4 text-pine-ink disabled:opacity-50"
        >
          Ferienzeitraum hinzufügen
        </button>

        <div className="mt-4">
          <h4 className="font-medium">
            Bereits eingetragene Ferienzeiträume
            {" "}({ferienZeitraeume.length})
          </h4>

          {ferienZeitraeume.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Noch keine Elternferien eingetragen.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {ferienZeitraeume.map(
                (zeitraum) => (
                  <li
                    key={`${zeitraum.von}-${zeitraum.bis}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line p-3 text-sm"
                  >
                    <span>
                      {zeitraum.von ===
                      zeitraum.bis
                        ? zeitraum.von
                        : `${zeitraum.von} bis ${zeitraum.bis}`}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        ferienZeitraumEntfernen(
                          zeitraum.von,
                          zeitraum.bis,
                        )
                      }
                      className="min-h-10 rounded-md border border-line px-3"
                    >
                      Zeitraum entfernen
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Wochenmuster */}
      <button
        type="button"
        onClick={spread}
        className="min-h-11 self-start rounded-card bg-sand px-4"
      >
        Dieses Wochenmuster auf zwölf Monate
        übertragen
      </button>
    </div>
  );
}
