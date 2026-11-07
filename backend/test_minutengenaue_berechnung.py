
from decimal import Decimal

import pytest

from backend.betreuungskalender import betreuungsplan_berechnen
from backend.minutengenaue_berechnung import (
    minuten_fuer_termin,
    monatsminuten_berechnen,
    beitrag_aus_minuten,
)


def test_635_minuten():
    termin = {
        "von": "07:13",
        "bis": "17:48",
    }

    assert minuten_fuer_termin(termin) == 635


def test_maximal_12_stunden():
    termin = {
        "von": "06:00",
        "bis": "20:00",
    }

    assert minuten_fuer_termin(termin) == 720


def test_beitrag_minutengenau():
    assert beitrag_aus_minuten(
        635, "7.50"
    ) == Decimal("79.38")


def test_rundung_auf_rappen():
    assert beitrag_aus_minuten(
        1, "1.00"
    ) == Decimal("0.02")


def test_monatsminuten():
    kalender = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-03",
        wochenplan={
            "Montag": {
                "von": "07:13",
                "bis": "17:48",
            },
            "Dienstag": {
                "von": "08:00",
                "bis": "12:00",
            },
        },
    )

    monate = monatsminuten_berechnen(kalender)

    assert monate["2026-11"] == 875


def test_ferien_ohne_betreuung():
    kalender = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-03",
        wochenplan={
            "Montag": {
                "von": "08:00",
                "bis": "17:00",
            },
            "Dienstag": {
                "von": "08:00",
                "bis": "17:00",
            },
        },
        ferien=[
            {
                "von": "2026-11-03",
                "bis": "2026-11-03",
            }
        ],
    )

    monate = monatsminuten_berechnen(kalender)

    assert monate["2026-11"] == 540


def test_ausnahme_hat_vorrang_vor_ferien():
    kalender = betreuungsplan_berechnen(
        von="2026-11-02",
        bis="2026-11-02",
        wochenplan={
            "Montag": {
                "von": "08:00",
                "bis": "17:00",
            },
        },
        ferien=[
            {
                "von": "2026-11-02",
                "bis": "2026-11-02",
            }
        ],
        ausnahmen={
            "2026-11-02": {
                "von": "10:00",
                "bis": "14:00",
            }
        },
    )

    monate = monatsminuten_berechnen(kalender)

    assert monate["2026-11"] == 240


def test_ungueltiger_zeitraum():
    with pytest.raises(ValueError):
        betreuungsplan_berechnen(
            von="2026-11-10",
            bis="2026-11-01",
            wochenplan={},
        )


def test_ungueltige_uhrzeit():
    with pytest.raises(ValueError):
        betreuungsplan_berechnen(
            von="2026-11-02",
            bis="2026-11-02",
            wochenplan={
                "Montag": {
                    "von": "25:00",
                    "bis": "18:00",
                }
            },
        )


def test_monatswechsel_minutengenau():
    kalender = betreuungsplan_berechnen(
        von="2026-11-30",
        bis="2026-12-01",
        wochenplan={
            "Montag": {
                "von": "07:13",
                "bis": "17:48",
            },
            "Dienstag": {
                "von": "08:00",
                "bis": "12:00",
            },
        },
    )

    monate = monatsminuten_berechnen(kalender)

    assert monate["2026-11"] == 635
    assert monate["2026-12"] == 240
