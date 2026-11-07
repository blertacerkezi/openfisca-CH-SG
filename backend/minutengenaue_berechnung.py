
from decimal import Decimal, ROUND_HALF_UP

from backend.betreuungskalender import (
    betreuungsplan_berechnen,
    uhrzeit_lesen,
)


def minuten_fuer_termin(termin):
    """Berechnet anrechenbare Minuten für einen Betreuungstermin."""
    start = uhrzeit_lesen(termin["von"])
    ende = uhrzeit_lesen(termin["bis"])

    return min(ende - start, 12 * 60)


def monatsminuten_berechnen(kalender):
    """Summiert die exakten Minuten je Monat."""
    monate = {
        monat: 0
        for monat in kalender["monatsstunden"]
    }

    for termin in kalender["betreuungstermine"]:
        monat = termin["datum"][:7]
        monate[monat] += minuten_fuer_termin(termin)

    return monate


def beitrag_aus_minuten(minuten, stundenbeitrag):
    """
    Berechnet einen Geldbetrag aus Minuten und CHF pro Stunde.
    Rundung erst beim Endbetrag auf Rappen.
    """
    betrag = (
        Decimal(minuten)
        * Decimal(str(stundenbeitrag))
        / Decimal(60)
    )

    return betrag.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


if __name__ == "__main__":
    kalender = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-02",
        wochenplan={
            "Montag": {
                "von": "07:13",
                "bis": "17:48",
            }
        },
    )

    minuten = monatsminuten_berechnen(kalender)

    print("Minuten:", minuten["2026-11"])
    print("Stunden (Anzeige):", kalender["gesamtstunden"])
    print(
        "Beitrag bei CHF 7.50/Stunde:",
        beitrag_aus_minuten(minuten["2026-11"], "7.50"),
    )
