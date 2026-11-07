
from openfisca_core.model_api import *
from openfisca_ch_sg.entities import Person
from numpy import clip, maximum, minimum


# ==================================================
# 1. EINKOMMENSFAKTOR
# KiBV Art. 13 und Art. 15
# ==================================================

class einkommensfaktor(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Einkommensabhängiger Beitragsfaktor"

    def formula(person, period, parameters):
        einkommen = person(
            "massgebendes_einkommen", period
        )

        kibg = parameters(period).kibg

        minimum_einkommen = kibg.minimum_income
        maximum_einkommen = kibg.maximum_income

        faktor = (
            (maximum_einkommen - einkommen)
            / (maximum_einkommen - minimum_einkommen)
        )

        return clip(faktor, 0, 1)


# ==================================================
# 2. GRUNDBEITRAG PRO STUNDE
# Ohne Gemeindezuschläge
# ==================================================

class grundbeitrag_pro_stunde(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Grundbeitrag pro Betreuungsstunde"

    def formula(person, period):
        maximalbeitrag = person(
            "maximaler_stundenbeitrag", period
        )

        faktor = person(
            "einkommensfaktor", period
        )

        return maximalbeitrag * faktor


# ==================================================
# 3. KOMMUNALE ZUSATZBEITRÄGE
# Z1 und Z2 gemäss KiBV-Anhang
# ==================================================

class zusatzbeitrag_z1(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = (
        "Einkommensabhängiger kommunaler "
        "Zusatzbeitrag pro Stunde"
    )


class zusatzbeitrag_z2(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = (
        "Einkommensunabhängiger kommunaler "
        "Zusatzbeitrag pro Stunde"
    )


# ==================================================
# 4. GESAMTER STUNDENBEITRAG
#
# B = (MaxV + Z1) * Faktor + Z2
#
# KiBV Art. 13 und Anhang
# ==================================================

class gesamter_stundenbeitrag(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Gesamter Beitrag pro Betreuungsstunde"
    reference = "KiBV Art. 13 und Anhang"

    def formula(person, period):
        maximalbeitrag = person(
            "maximaler_stundenbeitrag", period
        )

        faktor = person(
            "einkommensfaktor", period
        )

        z1 = person(
            "zusatzbeitrag_z1", period
        )

        z2 = person(
            "zusatzbeitrag_z2", period
        )

        return maximum(
            (
                maximalbeitrag + maximum(z1, 0)
            ) * faktor + maximum(z2, 0),
            0,
        )


# ==================================================
# 5. BETREUUNGSSTUNDEN PRO TAG
# Eingabe
# ==================================================

class betreuungsstunden_pro_tag(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Betreuungsstunden pro Betreuungstag"


# ==================================================
# 6. BETREUUNGSTAGE IM MONAT
# Eingabe
# ==================================================

class betreuungstage_im_monat(Variable):
    value_type = int
    entity = Person
    definition_period = MONTH
    label = "Tatsächliche Betreuungstage im Monat"


# ==================================================
# 7. ANRECHENBARE BETREUUNGSSTUNDEN
# KiBV Art. 14 Abs. 4
# Maximal 12 Stunden pro Tag
# ==================================================

class anrechenbare_betreuungsstunden(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Anrechenbare Betreuungsstunden im Monat"
    reference = "KiBV Art. 14 Abs. 4"

    def formula(person, period):
        stunden_pro_tag = person(
            "betreuungsstunden_pro_tag", period
        )

        tage = person(
            "betreuungstage_im_monat", period
        )

        begrenzte_stunden = clip(
            stunden_pro_tag, 0, 12
        )

        begrenzte_tage = maximum(tage, 0)

        return begrenzte_stunden * begrenzte_tage


# ==================================================
# 8. TATSÄCHLICHE BETREUUNGSKOSTEN
# Eingabe
# ==================================================

class betreuungskosten_im_monat(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Tatsächliche Betreuungskosten im Monat"


# ==================================================
# 9. MONATSBEITRAG VOR KOSTENBEGRENZUNG
# Inklusive Z1 und Z2
# ==================================================

class beitrag_vor_kostenbegrenzung(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Monatsbeitrag vor Kostenbegrenzung"

    def formula(person, period):
        stunden = person(
            "anrechenbare_betreuungsstunden", period
        )

        beitrag_pro_stunde = person(
            "gesamter_stundenbeitrag", period
        )

        return stunden * beitrag_pro_stunde


# ==================================================
# 10. MONATSBEITRAG NACH KOSTENBEGRENZUNG
# KiBG Art. 6 Abs. 2 und Art. 20 Abs. 3
# ==================================================

class beitrag_nach_kostenbegrenzung(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Monatsbeitrag nach Kostenbegrenzung"

    def formula(person, period):
        beitrag = person(
            "beitrag_vor_kostenbegrenzung", period
        )

        kosten = person(
            "betreuungskosten_im_monat", period
        )

        return minimum(
            maximum(beitrag, 0),
            maximum(kosten, 0),
        )
