
from pathlib import Path
import json

# Ziel: public/data im Frontend für den Kanton
OUTPUT = Path("frontend/public/data/kanton_familien_testfaelle.yaml")

FAMILIENFORMEN = [
    {
        "name": "verheiratet_gemeinsam",
        "zivilstand": "verheiratet",
        "haushaltsform": "gemeinsam",
        "erwachsene": 2,
        "pensen": [80, 60],
        "konkubinat_jahre": 0,
    },
    {
        "name": "konkubinat_kurz",
        "zivilstand": "ledig",
        "haushaltsform": "konkubinat",
        "erwachsene": 2,
        "pensen": [80, 60],
        "konkubinat_jahre": 1,
    },
    {
        "name": "konkubinat_lang",
        "zivilstand": "ledig",
        "haushaltsform": "konkubinat",
        "erwachsene": 2,
        "pensen": [80, 60],
        "konkubinat_jahre": 4,
    },
    {
        "name": "alleinerziehend",
        "zivilstand": "ledig",
        "haushaltsform": "alleine",
        "erwachsene": 1,
        "pensen": [80],
        "konkubinat_jahre": 0,
    },
    {
        "name": "geschieden",
        "zivilstand": "geschieden",
        "haushaltsform": "getrennt",
        "erwachsene": 1,
        "pensen": [80],
        "konkubinat_jahre": 0,
    },
    {
        "name": "verheiratet_getrennt",
        "zivilstand": "verheiratet",
        "haushaltsform": "getrennt",
        "erwachsene": 2,
        "pensen": [80, 60],
        "konkubinat_jahre": 0,
    },
    {
        "name": "patchwork",
        "zivilstand": "ledig",
        "haushaltsform": "patchwork",
        "erwachsene": 2,
        "pensen": [80, 60],
        "konkubinat_jahre": 3,
    },
    {
        "name": "verheiratet_ein_verdiener",
        "zivilstand": "verheiratet",
        "haushaltsform": "gemeinsam",
        "erwachsene": 2,
        "pensen": [100, 0],
        "konkubinat_jahre": 0,
    },
]

EINKOMMEN = [
    ("sehr_niedrig", 20000),
    ("niedrig", 40000),
    ("mittel", 70000),
    ("gehoben", 110000),
    ("hoch", 160000),
]

ALTER_MONATE = [8, 30, 60, 96, 132]

BETREUUNGSARTEN = [
    "kita",
    "tagesfamilie",
    "schulergaenzend",
]

szenarien = []

def create_case(anzahl_kinder, familie, einkommen_name, einkommen):
    erwachsene = familie["erwachsene"]

    if erwachsene == 1:
        einkommen_personen = [einkommen]
    elif familie["name"] == "verheiratet_ein_verdiener":
        einkommen_personen = [einkommen, 0]
    else:
        einkommen_personen = [
            round(einkommen * 0.6),
            round(einkommen * 0.4),
        ]

    kinder = []

    for i in range(anzahl_kinder):
        alter = ALTER_MONATE[i]

        if alter < 48:
            betreuungsart = BETREUUNGSARTEN[i % 2]
            stunden = 60
        else:
            betreuungsart = "schulergaenzend"
            stunden = 30

        kinder.append({
            "id": f"kind_{i + 1}",
            "alter_monate": alter,
            "betreuungsart": betreuungsart,
            "betreuungsstunden_monat": stunden,
            "elternferien_tage": 0,
        })

    return {
        "id": (
            f"{anzahl_kinder}k_"
            f"{familie['name']}_"
            f"{einkommen_name}"
        ),
        "familie": {
            "zivilstand": familie["zivilstand"],
            "haushaltsform": familie["haushaltsform"],
            "anzahl_kinder": anzahl_kinder,
            "anzahl_erwachsene_im_szenario": erwachsene,
            "konkubinat_jahre": familie["konkubinat_jahre"],
        },
        "finanzen": {
            "szenario_einkommen_chf_jahr": einkommen,
            "einkommen_erwachsene_chf_jahr": einkommen_personen,
        },
        "erwerb": {
            "pensen_prozent": familie["pensen"],
        },
        "wohnsitz_kanton_sg": True,
        "kinder": kinder,
        # Muss vom OpenFisca-Backend berechnet werden
        "erwartete_auszahlung_chf": None,
    }

# Alle Familienformen mit 0 bis 5 Kindern und Einkommen kombinieren
for anzahl_kinder in range(6):
    for familie in FAMILIENFORMEN:
        for einkommen_name, einkommen in EINKOMMEN:
            szenarien.append(
                create_case(
                    anzahl_kinder,
                    familie,
                    einkommen_name,
                    einkommen,
                )
            )

# Zusätzliche Sonderfälle
sonderfaelle = [
    ("kein_wohnsitz", False, 2, 70000),
    ("kein_einkommen", True, 1, 0),
    ("sehr_hohes_einkommen", True, 3, 180000),
    ("keine_kinderbetreuung", True, 2, 70000),
]

for name, wohnsitz, kinderzahl, einkommen in sonderfaelle:
    fall = create_case(
        kinderzahl,
        FAMILIENFORMEN[0],
        name,
        einkommen,
    )

    fall["id"] = f"sonderfall_{name}"
    fall["wohnsitz_kanton_sg"] = wohnsitz

    if name == "keine_kinderbetreuung":
        for kind in fall["kinder"]:
            kind["betreuungsstunden_monat"] = 0

    sonderfall = fall
    szenarien.append(sonderfall)

# JSON ist gültige YAML-1.2-Syntax.
# Dadurch benötigen wir kein externes YAML-Paket.
daten = {
    "schema_version": 1,
    "zweck": "Synthetische Testfamilien für das Kantons-Dashboard",
    "zeitraum": "2026-11",
    "waehrung": "CHF",
    "hinweis": (
        "Keine echten Familien. Einkommen sind Szenariowerte. "
        "Beiträge und Anspruch werden vom Backend berechnet."
    ),
    "szenarien": szenarien,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(
    json.dumps(daten, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Erstellt: {OUTPUT}")
print(f"Anzahl Testfälle: {len(szenarien)}")
