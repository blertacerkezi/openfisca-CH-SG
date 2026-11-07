
from decimal import Decimal, ROUND_HALF_UP

from openfisca_core.simulation_builder import SimulationBuilder
from openfisca_ch_sg import CountryTaxBenefitSystem

from backend.betreuungskalender import betreuungsplan_berechnen
from backend.minutengenaue_berechnung import (
    monatsminuten_berechnen,
    beitrag_aus_minuten,
)


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
    beschaeftigungsgrad=80,
    wohnsitz_im_kanton=True,
    anerkannte_einrichtung=True,
    faktische_obhut=True,
    primarschule_abgeschlossen=False,
    kind_eingeschult=False,
    berufliche_integration=False,
    familiaere_belastung=False,
    kindliche_indikation=False,
):
    """
    KiBG-Berechnung fuer einen Haushalt mit einem Elternteil
    und einem Kind.

    einkommen:
        Jaehrliches Reineinkommen des Elternteils aus dem
        vorletzten Steuerjahr, nicht das bereits berechnete
        massgebende Haushaltseinkommen.

    Weitere Steuerdaten und Mehrpersonenhaushalte muessen
    spaeter ueber eine erweiterte Eingabeschnittstelle
    unterstuetzt werden.
    """

    kalender = betreuungsplan_berechnen(
        von=von,
        bis=bis,
        wochenplan=wochenplan,
        ferien=ferien,
        ferienbetreuung=ferienbetreuung,
        ausnahmen=ausnahmen,
    )

    monatsminuten = monatsminuten_berechnen(kalender)
    system = CountryTaxBenefitSystem()

    ergebnisse = {}
    gesamtbeitrag = Decimal("0.00")

    for monat, minuten in monatsminuten.items():
        steuerjahr = str(int(monat[:4]) - 2)

        simulation = SimulationBuilder().build_from_entities(
            system,
            {
                "persons": {
                    "elternteil": {
                        "erziehungsberechtigt": {monat: True},
                        "wohnsitz_im_kanton": {
                            monat: wohnsitz_im_kanton
                        },
                        "beschaeftigungsgrad": {
                            monat: beschaeftigungsgrad
                        },
                        "berufliche_integration": {
                            monat: berufliche_integration
                        },
                        "familiaere_belastung": {
                            monat: familiaere_belastung
                        },
                        "reineinkommen": {
                            steuerjahr: einkommen
                        },
                    },
                    "kind": {
                        "alter_in_monaten": {
                            monat: alter_in_monaten
                        },
                        "betreuungsart": {
                            monat: betreuungsart
                        },
                        "kind_eingeschult": {
                            monat: kind_eingeschult
                        },
                        "primarschule_abgeschlossen": {
                            monat: primarschule_abgeschlossen
                        },
                        "faktische_obhut": {
                            monat: faktische_obhut
                        },
                        "betreuung_in_anspruch": {
                            monat: minuten > 0
                        },
                        "betreuung_in_anerkannter_einrichtung": {
                            monat: anerkannte_einrichtung
                        },
                        "kindliche_indikation": {
                            monat: kindliche_indikation
                        },
                        "anrechenbare_betreuungsstunden": {
                            monat: minuten / 60
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

        # Personenindex nicht fest annehmen.
        personen_ids = list(simulation.persons.ids)
        kind_index = personen_ids.index("kind")

        def kind_wert(variable):
            return simulation.calculate(
                variable, monat
            )[kind_index]

        einkommen_massgebend = float(
            kind_wert("massgebendes_einkommen")
        )

        anspruch = bool(
            kind_wert("kibg_anspruchsberechtigt")
        )

        sonderantrag = bool(
            kind_wert("kibg_sonderantrag_noetig")
        )

        stundenbeitrag = float(
            kind_wert("gesamter_stundenbeitrag")
        )

        # Exakte Minuten statt gerundeter Kalenderstunden.
        # Geldbetrag erst am Schluss auf Rappen runden.
        beitrag = beitrag_aus_minuten(
            minuten,
            stundenbeitrag,
        )

        kosten = Decimal(str(betreuungskosten_pro_monat))

        if kosten < 0:
            raise ValueError(
                "Betreuungskosten duerfen nicht negativ sein."
            )

        # Kostenbegrenzung und Anspruchspruefung.
        beitrag = min(
            max(beitrag, Decimal("0.00")),
            kosten,
        )

        if not anspruch:
            beitrag = Decimal("0.00")

        beitrag = beitrag.quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        ergebnisse[monat] = {
            "betreuungsminuten": minuten,
            "betreuungsstunden": round(minuten / 60, 2),
            "massgebendes_einkommen": einkommen_massgebend,
            "anspruchsberechtigt": anspruch,
            "sonderantrag_noetig": sonderantrag,
            "stundenbeitrag": round(stundenbeitrag, 2),
            "betreuungskosten": betreuungskosten_pro_monat,
            "kibg_beitrag": float(beitrag),
        }

        gesamtbeitrag += beitrag

    return {
        "von": von,
        "bis": bis,
        "monate": ergebnisse,
        "gesamtminuten": sum(monatsminuten.values()),
        "gesamtstunden": round(
            sum(monatsminuten.values()) / 60, 2
        ),
        "gesamtbeitrag": float(gesamtbeitrag),
    }


if __name__ == "__main__":
    ergebnis = kibg_beitraege_berechnen(
        von="2026-11-02",
        bis="2026-11-06",
        wochenplan={
            tag: {"von": "07:13", "bis": "17:48"}
            for tag in [
                "Montag",
                "Dienstag",
                "Mittwoch",
                "Donnerstag",
                "Freitag",
            ]
        },
        einkommen=74000,
        alter_in_monaten=24,
        betreuungsart="kita",
        betreuungskosten_pro_monat=1800,
        beschaeftigungsgrad=80,
        z1=1.50,
        z2=0.50,
    )

    for monat, daten in ergebnis["monate"].items():
        print(f"\nMonat: {monat}")
        print("Minuten:", daten["betreuungsminuten"])
        print(
            "Massgebendes Einkommen:",
            daten["massgebendes_einkommen"],
        )
        print("Anspruch:", daten["anspruchsberechtigt"])
        print("Sonderantrag:", daten["sonderantrag_noetig"])
        print("KiBG-Beitrag: CHF", daten["kibg_beitrag"])

    print("\nGesamtbeitrag: CHF", ergebnis["gesamtbeitrag"])
