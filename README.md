# KiBG St. Gallen in OpenFisca

Modell des Beitrags an die familienergänzende Kinderbetreuung im Kanton
St. Gallen. Gesetz: Kinderbetreuungsgesetz (KiBG). Verordnung: KiBV.
Einkommen: Einführungsgesetz zum Krankenversicherungsgesetz, Art. 12 und
Art. 12bis (EG-KVG).

Das ist ein Hackathon-Stand, kein Gesuchsentscheid.

## Was im Repo zum KiBG gehört

Nur diese Pfade:

- `openfisca_ch_sg/variables/kibg_inputs.py` — Eingaben, eine Variable pro Tatbestand
- `openfisca_ch_sg/variables/kibg_eligibility.py` — Anspruch
- `openfisca_ch_sg/variables/kibg_income.py` — massgebendes Einkommen
- `openfisca_ch_sg/variables/kibg_rates.py` — Stundensatz nach Art
- `openfisca_ch_sg/variables/kibg_calculations.py` — Monatsbeitrag
- `openfisca_ch_sg/parameters/kibg/` — Sätze und Schwellen
- `openfisca_ch_sg/tests/kibg_*.yaml`

Der Rest (`benefits`, `taxes`, `reforms`, Grundeinkommen, Wohnbeihilfe) ist
die OpenFisca-Vorlage. Den brauchen wir nicht.

## Schnittstelle

Anspruch, Person, Monat:

- `kibg_anspruchsberechtigt` — true nur für das betreute Kind
- `kibg_sonderantrag_noetig` — Pensum fehlt, die übrigen Voraussetzungen gelten

Einkommen, Haushalt, Monat, Franken pro Jahr:

- `kibg_massgebendes_einkommen`
- `massgebendes_einkommen` — derselbe Betrag, auf die Person gelegt

Beitrag, Person, Monat:

- `einkommensfaktor`
- `maximaler_stundenbeitrag`
- `gesamter_stundenbeitrag` — `(MaxV + Z1) * Faktor + Z2`
- `anrechenbare_betreuungsstunden` — höchstens 12 Stunden pro Tag
- `beitrag_nach_kostenbegrenzung` — nie höher als die tatsächlichen Kosten

Nicht gesetzte Beträge nach Art. 12 EG-KVG zählen als 0.

## Tests

Im Repo-Root, mit installiertem Paket:

```bash
uv run openfisca test openfisca_ch_sg/tests/kibg_eligibility.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_income.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_rates.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_calculation.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_costs.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_hours.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_zuschlaege.yaml --country-package openfisca_ch_sg
```

## Regel: eine Gesetzeszeile, eine Variable

Jede Ziffer, jeder Buchstabe, jeder Absatz ist eine eigene Variable oder ein
eigener Parameter. Keine Hilfsfunktion, die mehrere Tatbestände zusammenzieht.
Eine Formel darf nur das tun, was genau dieser Absatz sagt: zum Beispiel
addieren, was der Absatz addiert, oder eine Schwelle prüfen.

Eingaben in `kibg_inputs.py` und die Parameter unter `parameters/kibg/` halten
das ein. Jede Ziffer von Art. 12 EG-KVG ist eine eigene Eingabe. Jeder
Stundensatz im Anhang ist eine eigene YAML-Datei.

Diese Formeln fassen noch mehrere Zeilen zusammen und sollten auseinandergezogen
werden, ohne die Namen der Schnittstelle zu ändern:

| Stelle | Was zusammenliegt |
| --- | --- |
| `_erziehungsberechtigte_erwachsene` in `kibg_eligibility.py` | Hilfsfunktion, keine eigene Variable. Wird von Anzahl, Pensum, Wohnsitz und Ausnahme benutzt. |
| `kibg_pensum_erfuellt` | Allein-Schwelle, gemeinsame Schwelle und Ausnahme in einer Formel. |
| `kibg_voraussetzungen_ohne_pensum` | Alter, Primarschule, Obhut, Betreuung, Einrichtung und Wohnsitz multipliziert. |
| `kibg_einkommen_person` | Alle Zuschläge von Art. 12 und der ganze Art. 12bis inklusive Grenzgänger. |
| `kibg_massgebendes_einkommen` | Veranlagung des vorletzten Jahres und die 25-Prozent-Regel. |
| `maximaler_stundenbeitrag` | Alle Zeilen des Anhangs in einem `select`. |
| `einkommensfaktor` | Untergrenze und Obergrenze des Einkommensbands in einer Formel. |
| `gefaestigte_lebensgemeinschaft` | Ehe und Mindestdauer der Lebensgemeinschaft in einer Formel. |

Schon getrennt, so soll es bleiben: `zusatzbeitrag_z1`, `zusatzbeitrag_z2`,
`anrechenbare_betreuungsstunden` (Art. 14 Abs. 4 KiBV),
`beitrag_nach_kostenbegrenzung` (Art. 6 Abs. 2 und Art. 20 Abs. 3 KiBG).
