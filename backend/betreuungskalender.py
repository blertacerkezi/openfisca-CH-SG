
from datetime import date, datetime, timedelta
from collections import defaultdict


# ==================================================
# BETREUUNGSKALENDER
# 24-Stunden-System, minutengenaue Eingabe
# ==================================================

WOCHENTAGE = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
]


def datum_lesen(wert):
    if isinstance(wert, datetime):
        return wert.date()
    if isinstance(wert, date):
        return wert
    return date.fromisoformat(wert)


def uhrzeit_lesen(wert):
    """
    Akzeptiert z.B. 6:00, 06:00, 7:13, 18:45.
    24:00 ist ausschliesslich als Endzeit erlaubt.
    """
    teile = wert.strip().split(":")

    if len(teile) != 2:
        raise ValueError("Uhrzeit muss HH:MM sein.")

    stunde, minute = map(int, teile)

    if stunde == 24 and minute == 0:
        return 1440

    if not (0 <= stunde <= 23 and 0 <= minute <= 59):
        raise ValueError("Ungültige Uhrzeit.")

    return stunde * 60 + minute


def stunden_berechnen(von, bis):
    start = uhrzeit_lesen(von)
    ende = uhrzeit_lesen(bis)

    if start == 1440:
        raise ValueError(
            "24:00 ist als Startzeit nicht erlaubt."
        )

    if ende <= start:
        raise ValueError(
            "Die Endzeit muss nach der Startzeit liegen. "
            "Zum Beispiel 06:00 bis 18:00."
        )

    return (ende - start) / 60


def wochenplan_pruefen(plan):
    for tag, zeiten in plan.items():
        if tag not in WOCHENTAGE:
            raise ValueError(
                f"Ungültiger Wochentag: {tag}"
            )

        stunden_berechnen(
            zeiten["von"],
            zeiten["bis"],
        )


def zeitraum_pruefen(zeitraum):
    start = datum_lesen(zeitraum["von"])
    ende = datum_lesen(zeitraum["bis"])

    if ende < start:
        raise ValueError(
            "Enddatum liegt vor Startdatum."
        )

    return start, ende


def betreuungszeiten_fuer_tag(
    tag,
    wochenplan,
    ferien,
    ferienbetreuung,
    ausnahmen,
):
    datum = tag.isoformat()
    wochentag = WOCHENTAGE[tag.weekday()]

    # Einzelne Ausnahmen haben höchste Priorität.
    if datum in ausnahmen:
        return ausnahmen[datum], "Ausnahme"

    # Ferien ohne Betreuung
    for zeitraum in ferien:
        start, ende = zeitraum_pruefen(zeitraum)

        if start <= tag <= ende:
            return None, "Ferien ohne Betreuung"

    # Ferien mit anderem Wochenplan
    for zeitraum in ferienbetreuung:
        start, ende = zeitraum_pruefen(zeitraum)

        if start <= tag <= ende:
            return (
                zeitraum["wochenplan"].get(wochentag),
                "Ferienbetreuung",
            )

    return (
        wochenplan.get(wochentag),
        "Reguläre Betreuung",
    )


def betreuungsplan_berechnen(
    von,
    bis,
    wochenplan,
    ferien=None,
    ferienbetreuung=None,
    ausnahmen=None,
):
    startdatum = datum_lesen(von)
    enddatum = datum_lesen(bis)

    if enddatum < startdatum:
        raise ValueError(
            "Enddatum liegt vor Startdatum."
        )

    ferien = ferien or []
    ferienbetreuung = ferienbetreuung or []
    ausnahmen = ausnahmen or {}

    wochenplan_pruefen(wochenplan)

    for zeitraum in ferien:
        zeitraum_pruefen(zeitraum)

    for zeitraum in ferienbetreuung:
        zeitraum_pruefen(zeitraum)
        wochenplan_pruefen(zeitraum["wochenplan"])

    for datum, zeiten in ausnahmen.items():
        datum_lesen(datum)
        if zeiten is not None:
            stunden_berechnen(
                zeiten["von"],
                zeiten["bis"],
            )

    monatsstunden = defaultdict(float)
    monatstage = defaultdict(int)
    wochentage_zaehler = defaultdict(int)

    termine = []
    ausgeschlossene_termine = []

    # Alle Monate im Zeitraum vorbereiten
    jahr = startdatum.year
    monat = startdatum.month

    while (jahr, monat) <= (
        enddatum.year,
        enddatum.month,
    ):
        schluessel = f"{jahr:04d}-{monat:02d}"
        monatsstunden[schluessel] = 0.0
        monatstage[schluessel] = 0

        if monat == 12:
            jahr += 1
            monat = 1
        else:
            monat += 1

    aktueller_tag = startdatum

    while aktueller_tag <= enddatum:
        zeiten, art = betreuungszeiten_fuer_tag(
            aktueller_tag,
            wochenplan,
            ferien,
            ferienbetreuung,
            ausnahmen,
        )

        if zeiten is not None:
            tatsaechliche_stunden = stunden_berechnen(
                zeiten["von"],
                zeiten["bis"],
            )

            # Höchstens 12 anrechenbare Stunden pro Tag
            anrechenbare_stunden = min(
                tatsaechliche_stunden,
                12,
            )

            iso = aktueller_tag.isocalendar()
            woche = (iso.year, iso.week)

            if wochentage_zaehler[woche] < 5:
                monat = aktueller_tag.strftime("%Y-%m")

                monatsstunden[monat] += anrechenbare_stunden
                monatstage[monat] += 1
                wochentage_zaehler[woche] += 1

                termine.append({
                    "datum": aktueller_tag.isoformat(),
                    "wochentag": WOCHENTAGE[
                        aktueller_tag.weekday()
                    ],
                    "von": zeiten["von"],
                    "bis": zeiten["bis"],
                    "tatsaechliche_stunden": round(
                        tatsaechliche_stunden, 2
                    ),
                    "anrechenbare_stunden": round(
                        anrechenbare_stunden, 2
                    ),
                    "art": art,
                })
            else:
                ausgeschlossene_termine.append({
                    "datum": aktueller_tag.isoformat(),
                    "grund": "Mehr als 5 Betreuungstage pro Woche",
                })

        aktueller_tag += timedelta(days=1)

    monatsstunden = {
        monat: round(stunden, 2)
        for monat, stunden in monatsstunden.items()
    }

    return {
        "von": startdatum.isoformat(),
        "bis": enddatum.isoformat(),
        "monatsstunden": monatsstunden,
        "monatstage": dict(monatstage),
        "gesamtstunden": round(
            sum(monatsstunden.values()), 2
        ),
        "gesamtbetreuungstage": len(termine),
        "betreuungstermine": termine,
        "ausgeschlossene_termine": ausgeschlossene_termine,
    }


# ==================================================
# BEISPIEL
# ==================================================

if __name__ == "__main__":

    wochenplan = {
        "Montag": {
            "von": "6:00",
            "bis": "18:00",
        },
        "Dienstag": {
            "von": "07:13",
            "bis": "17:48",
        },
        "Donnerstag": {
            "von": "08:00",
            "bis": "16:00",
        },
    }

    ferien = [
        {
            "von": "2026-12-21",
            "bis": "2027-01-03",
        },
    ]

    ferienbetreuung = [
        {
            "von": "2027-07-12",
            "bis": "2027-07-30",
            "wochenplan": {
                "Montag": {
                    "von": "09:00",
                    "bis": "16:00",
                },
                "Dienstag": {
                    "von": "09:00",
                    "bis": "16:00",
                },
                "Mittwoch": {
                    "von": "09:00",
                    "bis": "16:00",
                },
            },
        },
    ]

    ausnahmen = {
        "2027-03-15": None,
        "2027-03-16": {
            "von": "10:00",
            "bis": "14:00",
        },
    }

    ergebnis = betreuungsplan_berechnen(
        von="2026-11-01",
        bis="2027-10-31",
        wochenplan=wochenplan,
        ferien=ferien,
        ferienbetreuung=ferienbetreuung,
        ausnahmen=ausnahmen,
    )

    print("\nKiBG BETREUUNGSKALENDER")
    print("=" * 45)

    for monat, stunden in ergebnis[
        "monatsstunden"
    ].items():
        tage = ergebnis["monatstage"][monat]

        print(
            f"{monat}: {stunden:.2f} Stunden "
            f"({tage} Tage)"
        )

    print("=" * 45)
    print(
        "Gesamtstunden:",
        ergebnis["gesamtstunden"],
    )
