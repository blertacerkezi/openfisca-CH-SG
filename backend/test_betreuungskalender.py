
import pytest

from backend.betreuungskalender import (
    betreuungsplan_berechnen,
    stunden_berechnen,
)


def test_6_bis_18():
    assert stunden_berechnen("6:00", "18:00") == 12


def test_6_bis_6_ungueltig():
    with pytest.raises(ValueError):
        stunden_berechnen("6:00", "6:00")


def test_minutengenaue_zeiten():
    assert stunden_berechnen("7:15", "16:45") == 9.5


def test_regulaere_betreuung():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-06",
        wochenplan={
            "Montag": {"von": "6:00", "bis": "18:00"},
            "Dienstag": {"von": "8:00", "bis": "17:00"},
        },
    )

    assert ergebnis["gesamtstunden"] == 21


def test_maximal_12_stunden():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-02",
        wochenplan={
            "Montag": {"von": "6:00", "bis": "20:00"},
        },
    )

    assert ergebnis["gesamtstunden"] == 12


def test_maximal_5_tage():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-08",
        wochenplan={
            tag: {"von": "8:00", "bis": "16:00"}
            for tag in [
                "Montag", "Dienstag", "Mittwoch",
                "Donnerstag", "Freitag",
                "Samstag", "Sonntag",
            ]
        },
    )

    assert ergebnis["gesamtstunden"] == 40


def test_ferien_ohne_betreuung():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-03",
        wochenplan={
            "Montag": {"von": "8:00", "bis": "17:00"},
            "Dienstag": {"von": "8:00", "bis": "17:00"},
        },
        ferien=[
            {"von": "2026-11-03", "bis": "2026-11-03"}
        ],
    )

    assert ergebnis["gesamtstunden"] == 9


def test_ferienbetreuung():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-03",
        wochenplan={},
        ferienbetreuung=[
            {
                "von": "2026-11-02",
                "bis": "2026-11-03",
                "wochenplan": {
                    "Montag": {"von": "9:00", "bis": "16:00"},
                    "Dienstag": {"von": "9:00", "bis": "16:00"},
                },
            }
        ],
    )

    assert ergebnis["gesamtstunden"] == 14


def test_einzelne_ausnahme():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-03",
        wochenplan={
            "Montag": {"von": "8:00", "bis": "17:00"},
            "Dienstag": {"von": "8:00", "bis": "17:00"},
        },
        ausnahmen={
            "2026-11-02": None,
            "2026-11-03": {
                "von": "10:00",
                "bis": "14:00",
            },
        },
    )

    assert ergebnis["gesamtstunden"] == 4


def test_monatswechsel():
    ergebnis = betreuungsplan_berechnen(
        von="2026-11-30",
        bis="2026-12-01",
        wochenplan={
            "Montag": {"von": "8:00", "bis": "17:00"},
            "Dienstag": {"von": "8:00", "bis": "17:00"},
        },
    )

    assert ergebnis["monatsstunden"]["2026-11"] == 9
    assert ergebnis["monatsstunden"]["2026-12"] == 9
