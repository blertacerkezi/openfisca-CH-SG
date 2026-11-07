
from datetime import date

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_ch_sg import CountryTaxBenefitSystem

from backend.betreuungskalender import (
    betreuungsplan_berechnen,
)


# ==================================================
# KiBG-RECHNER
# Verbindung zwischen Betreuungskalender und OpenFisca
# ==================================================


def kibg_beitraege_berechnen(
    von,
    bis,
    wochenplan,
    einkommen,
    alter_in_monaten,
    betreuungsart,
    betreuungskosten_pro_monat,
    z1=0,
    z2=0,
    ferien=None,
    ferienbetreuung=None,
    ausnahmen=None,
):
    """
    Berechnet monatliche KiBG-Beiträge.

    einkommen:
        Massgebendes Einkommen und Vermögen
        gemäss KiBG, in CHF.

    betreuungsart:
        "kita", "tagesfamilie" oder
        "schulergaenzend".

    betreuungskosten_pro_monat:
        Tatsächliche monatliche Betreuungskosten
        in CHF.

    z1:
        Einkommensabhängiger kommunaler
        Zusatzbeitrag pro Stunde.

    z2:
        Einkommensunabhängiger kommunaler
        Zusatzbeitrag pro Stunde.
    """

    # ----------------------------------------------
    # 1. Betreuungskalender berechnen
    # ----------------------------------------------

    kalender = betreuungsplan_berechnen(
        von=von,
        bis=bis,
        wochenplan=wochenplan,
        ferien=ferien,
        ferienbetreuung=ferienbetreuung,
        ausnahmen=ausnahmen,
    )

    # ----------------------------------------------
    # 2. OpenFisca vorbereiten
    # ----------------------------------------------

    tax_benefit_system = CountryTaxBenefitSystem()

    ergebnisse = {}
    gesamtbeitrag = 0.0

    # ----------------------------------------------
    # 3. Jeden Monat einzeln berechnen
    # ----------------------------------------------

    for monat, stunden in kalender[
        "monatsstunden"
    ].items():

        simulation = SimulationBuilder().build_from_entities(
            tax_benefit_system,
            {
                "persons": {
                    "kind_1": {
                        "alter_in_monaten": {
                            monat: alter_in_monaten
                        },
                        "betreuungsart": {
                            monat: betreuungsart
                        },
                        "massgebendes_einkommen": {
                            monat: einkommen
                        },
                        "anrechenbare_betreuungsstunden": {
                            monat: stunden
                        },
                        "betreuungskosten_im_monat": {
                            monat: betreuungskosten_pro_monat
                        },
                        "zusatzbeitrag_z1": {
                            monat: z1
                        },
                        "zusatzbeitrag_z2": {
                            monat: z2
                        },
                    }
                }
            },
        )

        # ------------------------------------------
        # 4. OpenFisca-Berechnung
        # ------------------------------------------

        stundenbeitrag = simulation.calculate(
            "gesamter_stundenbeitrag",
            monat,
        )[0]

        beitrag = simulation.calculate(
            "beitrag_nach_kostenbegrenzung",
            monat,
        )[0]

        stundenbeitrag = round(
            float(stundenbeitrag), 2
        )

        beitrag = round(
            float(beitrag), 2
        )

        ergebnisse[monat] = {
            "betreuungsstunden": stunden,
            "stundenbeitrag": stundenbeitrag,
            "betreuungskosten": betreuungskosten_pro_monat,
            "kibg_beitrag": beitrag,
        }

        gesamtbeitrag += beitrag

    return {
        "von": von,
        "bis": bis,
        "monate": ergebnisse,
        "gesamtstunden": kalender["gesamtstunden"],
        "gesamtbeitrag": round(
            gesamtbeitrag, 2
        ),
    }


# ==================================================
# BEISPIEL
# ==================================================

if __name__ == "__main__":

    ergebnis = kibg_beitraege_berechnen(
        von="2026-11-01",
        bis="2027-10-31",

        wochenplan={
            "Montag": {
                "von": "06:00",
                "bis": "18:00",
            },
            "Dienstag": {
                "von": "06:00",
                "bis": "18:00",
            },
            "Mittwoch": {
                "von": "06:00",
                "bis": "18:00",
            },
            "Donnerstag": {
                "von": "06:00",
                "bis": "18:00",
            },
            "Freitag": {
                "von": "06:00",
                "bis": "18:00",
            },
        },

        einkommen=70000,
        alter_in_monaten=24,
        betreuungsart="kita",

        betreuungskosten_pro_monat=1800,

        z1=1.50,
        z2=0.50,

        ferien=[
            {
                "von": "2026-12-21",
                "bis": "2027-01-03",
            },
        ],
    )

    print("\nKiBG BEITRAGSBERECHNUNG")
    print("=" * 55)

    for monat, daten in ergebnis["monate"].items():
        print(
            f"{monat}: "
            f"{daten['betreuungsstunden']} Stunden | "
            f"CHF {daten['kibg_beitrag']:.2f}"
        )

    print("=" * 55)
    print(
        "Gesamtbeitrag: CHF",
        f"{ergebnis['gesamtbeitrag']:.2f}",
    )
