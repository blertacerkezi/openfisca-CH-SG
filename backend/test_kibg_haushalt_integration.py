
import pytest

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_ch_sg import CountryTaxBenefitSystem


def test_einkommen_anspruch_und_beitrag_zusammen():
    monat = "2026-11"

    simulation = SimulationBuilder().build_from_entities(
        CountryTaxBenefitSystem(),
        {
            "persons": {
                "elternteil": {
                    "erziehungsberechtigt": {monat: True},
                    "wohnsitz_im_kanton": {monat: True},
                    "beschaeftigungsgrad": {monat: 80},
                    "reineinkommen": {"2024": 74000},
                },
                "kind": {
                    "alter_in_monaten": {monat: 24},
                    "betreuungsart": {monat: "kita"},
                    "faktische_obhut": {monat: True},
                    "betreuung_in_anspruch": {monat: True},
                    "betreuung_in_anerkannter_einrichtung": {
                        monat: True
                    },
                    "anrechenbare_betreuungsstunden": {
                        monat: 60
                    },
                    "betreuungskosten_im_monat": {
                        monat: 1800
                    },
                    "zusatzbeitrag_z1": {monat: 1.50},
                    "zusatzbeitrag_z2": {monat: 0.50},
                },
            },
            "households": {
                "haushalt": {
                    "adults": ["elternteil"],
                    "children": ["kind"],
                }
            },
        },
    )

    einkommen = float(
        simulation.calculate(
            "massgebendes_einkommen", monat
        )[1]
    )

    anspruch = bool(
        simulation.calculate(
            "kibg_anspruchsberechtigt", monat
        )[1]
    )

    beitrag = float(
        simulation.calculate(
            "beitrag_nach_kostenbegrenzung", monat
        )[1]
    )

    assert einkommen == pytest.approx(70000)
    assert anspruch is True
    assert 0 < beitrag <= 1800
