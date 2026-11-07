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

function daysIn(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function CareCalendar({
  children,
  onChange,
}: {
  children: ChildInput[];
  onChange: (next: ChildInput[]) => void;
}) {
  const [cursor, setCursor] = useState({ year: 2026, month: 10 });
  const [active, setActive] = useState(children[0]?.id ?? "");
  const [picked, setPicked] = useState<string | null>(null);
  const child = children.find((c) => c.id === active) ?? children[0];

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1).getDay();
    const lead = (first + 6) % 7;
    const count = daysIn(cursor.year, cursor.month);
    const blanks = Array.from({ length: lead }, () => null);
    const days = Array.from({ length: count }, (_, i) => {
      const date = `${monthKey(cursor.year, cursor.month)}-${String(i + 1).padStart(2, "0")}`;
      return date;
    });
    return [...blanks, ...days];
  }, [cursor]);

  if (!child) return null;
  const draft = picked ? child.days[picked] : undefined;

  function patch(date: string, next: DayCare | null) {
    onChange(
      children.map((item) => {
        if (item.id !== child.id) return item;
        const days = { ...item.days };
        if (!next) delete days[date];
        else days[date] = next;
        return { ...item, days };
      }),
    );
  }

  function spread() {
    const prefix = monthKey(cursor.year, cursor.month);
    const pattern = new Map<number, DayCare>();
    for (const [date, care] of Object.entries(child.days)) {
      if (!date.startsWith(prefix)) continue;
      pattern.set(new Date(`${date}T00:00:00`).getDay(), care);
    }
    onChange(
      children.map((item) => {
        if (item.id !== child.id) return item;
        const days = { ...item.days };
        for (let offset = 0; offset < 12; offset += 1) {
          const start = new Date(2026, 10 + offset, 1);
          const year = start.getFullYear();
          const month = start.getMonth();
          const count = daysIn(year, month);
          for (let day = 1; day <= count; day += 1) {
            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const sample = pattern.get(new Date(`${date}T00:00:00`).getDay());
            if (sample) days[date] = { ...sample };
          }
        }
        return { ...item, days };
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
            className={`min-h-11 rounded-card px-3 ${item.id === child.id ? "bg-pine text-pine-ink" : "bg-sand text-ink"}`}
          >
            {item.name || `Kind ${index + 1}`}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="min-h-11 px-3"
          onClick={() =>
            setCursor((c) =>
              c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 },
            )
          }
        >
          Zurück
        </button>
        <p className="font-medium">
          {new Date(cursor.year, cursor.month, 1).toLocaleDateString("de-CH", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <button
          type="button"
          className="min-h-11 px-3"
          onClick={() =>
            setCursor((c) =>
              c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 },
            )
          }
        >
          Weiter
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <span key={`b-${index}`} />;
          const care = child.days[date];
          const day = Number(date.slice(-2));
          return (
            <button
              key={date}
              type="button"
              onClick={() => setPicked(date)}
              className={`min-h-11 rounded-md border text-sm ${
                care?.hours
                  ? "border-pine bg-moss text-ink"
                  : "border-line bg-card text-ink"
              } ${picked === date ? "ring-2 ring-pine" : ""}`}
            >
              {day}
              {care?.hours ? <span className="block text-xs">{care.hours}h</span> : null}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="rounded-card border border-line bg-card p-4">
          <p className="font-medium">
            {new Date(picked + "T00:00:00").toLocaleDateString("de-CH", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <label className="mt-3 flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={draft?.obhut ?? false}
              onChange={(e) =>
                patch(picked, {
                  obhut: e.target.checked,
                  hours: draft?.hours ?? 0,
                  type: draft?.type ?? "kita",
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
              onChange={(e) =>
                patch(picked, {
                  obhut: draft?.obhut ?? true,
                  hours: draft?.hours ?? 0,
                  type: e.target.value as CareType,
                })
              }
            >
              {TYPES.map((type) => (
                <option key={type.id} value={type.id}>
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
              max={14}
              step={0.5}
              value={draft?.hours ?? 0}
              onChange={(e) =>
                patch(picked, {
                  obhut: draft?.obhut ?? true,
                  type: draft?.type ?? "kita",
                  hours: Number(e.target.value),
                })
              }
              className="mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3"
            />
          </label>
        </div>
      )}
      <button type="button" onClick={spread} className="min-h-11 self-start rounded-card bg-sand px-4">
        Dieses Wochenmuster auf zwölf Monate übertragen
      </button>
    </div>
  );
}
