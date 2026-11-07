
import pytest

from backend.kibg_rechner import kibg_beitraege_berechnen


def berechnen(**aenderungen):
    daten = {
        "von": "2026-11-02",
        "bis": "2026-11-06",
        "wochenplan": {
            tag: {"von": "07:13", "bis": "17:48"}
            for tag in [
                "Montag", "Dienstag", "Mittwoch",
                "Donnerstag", "Freitag",
            ]
        },
        "einkommen": 74000,
        "alter_in_monaten": 24,
        "betreuungsart": "kita",
        "betreuungskosten_pro_monat": 1800,
        "beschaeftigungsgrad": 80,
        "z1": 1.50,
        "z2": 0.50,
    }
    daten.update(aenderungen)
    return kibg_beitraege_berechnen(**daten)


def test_minutengenaue_integration():
    ergebnis = berechnen()
    monat = ergebnis["monate"]["2026-11"]

    assert monat["betreuungsminuten"] == 3175
    assert monat["massgebendes_einkommen"] == pytest.approx(70000)
    assert monat["anspruchsberechtigt"] is True
    assert monat["sonderantrag_noetig"] is False
    assert monat["kibg_beitrag"] == pytest.approx(377.38)


def test_keine_anspruchsberechtigung():
    ergebnis = berechnen(wohnsitz_im_kanton=False)
    monat = ergebnis["monate"]["2026-11"]

    assert monat["anspruchsberechtigt"] is False
    assert monat["kibg_beitrag"] == 0


def test_kostenbegrenzung():
    ergebnis = berechnen(betreuungskosten_pro_monat=100)
    monat = ergebnis["monate"]["2026-11"]

    assert monat["anspruchsberechtigt"] is True
    assert monat["kibg_beitrag"] == 100


def test_ferien_ohne_betreuung():
    ergebnis = berechnen(
        ferien=[
            {"von": "2026-11-02", "bis": "2026-11-06"}
        ]
    )
    monat = ergebnis["monate"]["2026-11"]

    assert monat["betreuungsminuten"] == 0
    assert monat["kibg_beitrag"] == 0


def test_sonderantrag_bei_zu_niedrigem_pensum():
    ergebnis = berechnen(beschaeftigungsgrad=0)
    monat = ergebnis["monate"]["2026-11"]

    assert monat["anspruchsberechtigt"] is False
    assert monat["sonderantrag_noetig"] is True
    assert monat["kibg_beitrag"] == 0


def test_monatswechsel_integration():
    ergebnis = berechnen(
        von="2026-11-30",
        bis="2026-12-01",
    )

    november = ergebnis["monate"]["2026-11"]
    dezember = ergebnis["monate"]["2026-12"]

    assert november["betreuungsminuten"] == 635
    assert dezember["betreuungsminuten"] == 635

    assert november["anspruchsberechtigt"] is True
    assert dezember["anspruchsberechtigt"] is True

    assert november["kibg_beitrag"] > 0
    assert dezember["kibg_beitrag"] > 0

    assert ergebnis["gesamtminuten"] == 1270

    assert ergebnis["gesamtbeitrag"] == pytest.approx(
        november["kibg_beitrag"] + dezember["kibg_beitrag"]
    )
