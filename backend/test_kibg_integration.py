import pytest

from backend.kibg_rechner import kibg_beitraege_berechnen


def test_kibg_vollstaendige_monatsberechnung():
    ergebnis = kibg_beitraege_berechnen(
        von="2026-11-02",
        bis="2026-11-06",
        wochenplan={
            "Montag": {"von": "06:00", "bis": "18:00"},
            "Dienstag": {"von": "06:00", "bis": "18:00"},
            "Mittwoch": {"von": "06:00", "bis": "18:00"},
            "Donnerstag": {"von": "06:00", "bis": "18:00"},
            "Freitag": {"von": "06:00", "bis": "18:00"},
        },
        einkommen=70000,
        alter_in_monaten=24,
        betreuungsart="kita",
        betreuungskosten_pro_monat=1800,
        z1=1.50,
        z2=0.50,
    )

    assert "2026-11" in ergebnis["monate"]

    monat = ergebnis["monate"]["2026-11"]

    assert monat["betreuungsstunden"] == 60.0
    assert monat["kibg_beitrag"] >= 0
    assert monat["kibg_beitrag"] <= 1800

    assert ergebnis["gesamtbeitrag"] == pytest.approx(
        monat["kibg_beitrag"]
    )