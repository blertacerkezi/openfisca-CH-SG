
import { useMemo, useState } from "react";
import type { CareType, ChildInput, DayCare } from "@/lib/kibg";

const TYPES: Array<{ id: CareType; label: string }> = [
  { id: "kita", label: "Kita" },
  { id: "tagesfamilie", label: "Tagesfamilie" },
  { id: "schulergaenzend", label: "Schulergänzend" },
];

function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

type FerienZeitraum = {
  von: string;
  bis: string;
};

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

  const [picked, setPicked] = useState<string | null>(
    null,
  );

  const [ferienVon, setFerienVon] = useState("");
  const [ferienBis, setFerienBis] = useState("");

  const child =
    children.find((c) => c.id === active) ??
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

    const days = Array.from(
      { length: count },
      (_, i) =>
        `${monthKey(cursor.year, cursor.month)}-${String(
          i + 1,
        ).padStart(2, "0")}`,
    );

    return [...blanks, ...days];
  }, [cursor]);

  // Elternferien aus allen Kindern auslesen.
  // Zusammenhängende Ferientage werden als Zeitraum angezeigt.
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
    ? child.days[picked]
    : undefined;

  function patch(
    date: string,
    next: DayCare | null,
  ) {
    onChange(
      children.map((item) => {
        if (item.id !== child.id) {
          return item;
        }

        const days = { ...item.days };

        if (!next) {
          delete days[date];
        } else {
          days[date] = next;
        }

        return {
          ...item,
          days,
        };
      }),
    );
  }

  function elternferienEintragen() {
    if (
      !ferienVon ||
      !ferienBis ||
      ferienVon > ferienBis
    ) {
      return;
    }

    const start = parseDate(ferienVon);
    const end = parseDate(ferienBis);

    const tage =
      Math.round(
        (end.getTime() - start.getTime()) /
          86400000,
      ) + 1;

    if (tage > 366) {
      alert(
        "Bitte einen Zeitraum von maximal 366 Tagen auswählen.",
      );
      return;
    }

    onChange(
      children.map((item) => {
        const days = { ...item.days };

        for (
          const current = new Date(start);
          current <= end;
          current.setDate(
            current.getDate() + 1,
          )
        ) {
          const date = dateKey(current);

          days[date] = {
            obhut: true,
            hours: 0,
            type:
              days[date]?.type ?? "kita",
            elternferien: true,
          };
        }

        return {
          ...item,
          days,
        };
      }),
    );

    // Felder leeren, damit weitere Ferien
    // hinzugefügt werden können.
    setFerienVon("");
    setFerienBis("");
  }

  function ferienZeitraumEntfernen(
    von: string,
    bis: string,
  ) {
    onChange(
      children.map((item) => {
        const days = { ...item.days };

        for (const date of Object.keys(days)) {
          if (
            date >= von &&
            date <= bis &&
            days[date]?.elternferien
          ) {
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

  function spread() {
    const prefix = monthKey(
      cursor.year,
      cursor.month,
    );

    const pattern = new Map<
      number,
      DayCare
    >();

    for (const [date, care] of Object.entries(
      child.days,
    )) {
      if (
        !date.startsWith(prefix) ||
        care.elternferien
      ) {
        continue;
      }

      pattern.set(
        parseDate(date).getDay(),
        care,
      );
    }

    onChange(
      children.map((item) => {
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

          const count = daysIn(
            year,
            month,
          );

          for (
            let day = 1;
            day <= count;
            day += 1
          ) {
            const date = `${year}-${String(
              month + 1,
            ).padStart(2, "0")}-${String(
              day,
            ).padStart(2, "0")}`;

            // Bereits eingetragene Elternferien
            // dürfen nicht überschrieben werden.
            if (days[date]?.elternferien) {
              continue;
            }

            const sample = pattern.get(
              parseDate(date).getDay(),
            );

            if (sample) {
              days[date] = {
                ...sample,
                elternferien: false,
              };
            }
          }
        }

        return {
          ...item,
          days,
        };
      }),
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
            {item.name ||
              `Kind ${index + 1}`}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="min-h-11 px-3"
          onClick={() =>
            setCursor((c) =>
              c.month === 0
                ? {
                    year: c.year - 1,
                    month: 11,
                  }
                : {
                    ...c,
                    month: c.month - 1,
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
            setCursor((c) =>
              c.month === 11
                ? {
                    year: c.year + 1,
                    month: 0,
                  }
                : {
                    ...c,
                    month: c.month + 1,
                  },
            )
          }
        >
          Weiter
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">
        {[
          "Mo",
          "Di",
          "Mi",
          "Do",
          "Fr",
          "Sa",
          "So",
        ].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) {
            return (
              <span key={`b-${index}`} />
            );
          }

          const care = child.days[date];
          const day = Number(
            date.slice(-2),
          );

          return (
            <button
              key={date}
              type="button"
              onClick={() =>
                setPicked(date)
              }
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

      {picked && (
        <div className="rounded-card border border-line bg-card p-4">
          <p className="font-medium">
            {parseDate(
              picked,
            ).toLocaleDateString("de-CH", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>

          {draft?.elternferien && (
            <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-ink">
              Elternferien: Das Kind wird
              zu Hause betreut.

              <button
                type="button"
                className="ml-2 underline"
                onClick={() =>
                  patch(picked, null)
                }
              >
                Für dieses Kind entfernen
              </button>
            </div>
          )}

          <label className="mt-3 flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={
                draft?.obhut ?? false
              }
              onChange={(e) =>
                patch(picked, {
                  obhut:
                    e.target.checked,
                  hours:
                    draft?.hours ?? 0,
                  type:
                    draft?.type ?? "kita",
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
              value={
                draft?.type ?? "kita"
              }
              onChange={(e) =>
                patch(picked, {
                  obhut:
                    draft?.obhut ?? true,
                  hours:
                    draft?.hours ?? 0,
                  type:
                    e.target.value as CareType,
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
            Stunden

            <input
              type="number"
              min={0}
              max={12}
              step={0.5}
              value={
                draft?.hours ?? 0
              }
              onFocus={(e) => {
                if (
                  e.currentTarget.value ===
                  "0"
                ) {
                  e.currentTarget.select();
                }
              }}
              onChange={(e) =>
                patch(picked, {
                  obhut:
                    draft?.obhut ?? true,
                  type:
                    draft?.type ?? "kita",
                  hours: Number(
                    e.target.value,
                  ),
                  elternferien: false,
                })
              }
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>
        </div>
      )}

      {/* Elternferien: beliebig viele Zeiträume */}
      <div className="rounded-card border border-line bg-card p-4">
        <h3 className="font-medium">
          Ferien der Eltern – mehrere Zeiträume möglich
        </h3>

        <p className="mt-2 text-sm text-muted">
          Du kannst mehrere Ferienzeiträume
          eintragen, zum Beispiel eine Woche
          im Frühling und zwei Wochen im
          Sommer. Die Ferien gelten
          automatisch für alle Kinder.
          Wenn die Kinder zu Hause betreut
          werden, werden die externen
          Betreuungsstunden auf 0 gesetzt.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Ferien von

            <input
              type="date"
              value={ferienVon}
              onChange={(e) =>
                setFerienVon(
                  e.target.value,
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
              min={
                ferienVon || undefined
              }
              onChange={(e) =>
                setFerienBis(
                  e.target.value,
                )
              }
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={
            elternferienEintragen
          }
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
              Noch keine Elternferien
              eingetragen.
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

      <button
        type="button"
        onClick={spread}
        className="min-h-11 self-start rounded-card bg-sand px-4"
      >
        Dieses Wochenmuster auf zwölf Monate übertragen
      </button>
    </div>
  );
}
