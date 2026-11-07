"""Anspruchsprüfung KiBG.

Schnittstelle für die Beitragsberechnung:
    kibg_anspruchsberechtigt (Person, MONTH, bool)
    kibg_sonderantrag_noetig (Person, MONTH, bool)

true nur für das betreute Kind. Die übrigen kibg_*-Variablen sind
Zwischenergebnisse. Einkommen und Beitragshöhe stehen nicht hier.

Art. 4 Abs. 1 KiBG: wenigstens der Parameter mindest_pensum_allein, bei
mehreren erziehungsberechtigten Personen zusammen mindest_pensum_gemeinsam.
Art. 4 Abs. 2 KiBG und Art. 12 KiBV heben nur diese Pensumsschwelle auf.
Ist sie nicht erfüllt, wird kibg_sonderantrag_noetig gesetzt.
"""

from openfisca_core.periods import MONTH
from openfisca_core.variables import Variable

from openfisca_ch_sg.entities import Household, Person


def _erziehungsberechtigte_erwachsene(household, period):
    """1 für erziehungsberechtigte Erwachsene, sonst 0."""
    ist_erziehungsberechtigt = household.members("erziehungsberechtigt", period)
    ist_erwachsen = household.members.has_role(Household.ADULT)
    return 1 * ist_erziehungsberechtigt * ist_erwachsen


class erwerbstaetig(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Person ist erwerbstätig"
    reference = "Art. 4 Abs. 1 KiBG"

    def formula(person, period):
        """Abgeleitet aus dem Beschäftigungsgrad. Die Schwellen sind Parameter."""
        return person("beschaeftigungsgrad", period) > 0


class kibg_anzahl_erziehungsberechtigte(Variable):
    value_type = int
    entity = Household
    definition_period = MONTH
    label = "Anzahl erziehungsberechtigter Erwachsener im Haushalt"
    reference = "Art. 4 Abs. 1 KiBG"

    def formula(household, period):
        return household.sum(_erziehungsberechtigte_erwachsene(household, period))


class kibg_pensum_erziehungsberechtigte(Variable):
    value_type = float
    entity = Household
    definition_period = MONTH
    label = "Summe der Beschäftigungsgrade der erziehungsberechtigten Erwachsenen"
    reference = "Art. 4 Abs. 1 KiBG"

    def formula(household, period):
        pensum = household.members("beschaeftigungsgrad", period)
        return household.sum(
            pensum * _erziehungsberechtigte_erwachsene(household, period)
        )


class kibg_alle_erziehungsberechtigten_im_kanton(Variable):
    value_type = bool
    entity = Household
    definition_period = MONTH
    label = "Jede erziehungsberechtigte Person im Haushalt wohnt im Kanton"
    reference = "Art. 4 Abs. 1 KiBG"

    def formula(household, period):
        ist_eb = _erziehungsberechtigte_erwachsene(household, period)
        anzahl = household.sum(ist_eb)
        mit_wohnsitz = household.sum(
            ist_eb * household.members("wohnsitz_im_kanton", period),
        )
        return (anzahl > 0) * (mit_wohnsitz == anzahl)


class kibg_pensum_ausnahme_eltern(Variable):
    value_type = bool
    entity = Household
    definition_period = MONTH
    label = "Pensumsausnahme wegen Integration oder familiärer Belastung"
    reference = "Art. 4 Abs. 2 KiBG und Art. 12 Bst. a und b KiBV"

    def formula(household, period):
        ist_eb = _erziehungsberechtigte_erwachsene(household, period)
        integration = household.members("berufliche_integration", period)
        belastung = household.members("familiaere_belastung", period)
        return household.sum(ist_eb * (integration + belastung)) > 0


class kibg_pensum_erfuellt(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Pensumsschwelle oder Ausnahme ist erfüllt"
    reference = "Art. 4 Abs. 1 und 2 KiBG"

    def formula(person, period, parameters):
        anzahl = person.household("kibg_anzahl_erziehungsberechtigte", period)
        pensum = person.household("kibg_pensum_erziehungsberechtigte", period)
        eltern_ausnahme = person.household("kibg_pensum_ausnahme_eltern", period)
        kind_ausnahme = person("kindliche_indikation", period)
        allein = parameters(period).kibg.mindest_pensum_allein
        gemeinsam = parameters(period).kibg.mindest_pensum_gemeinsam
        schwelle = ((anzahl == 1) * (pensum >= allein)) + (
            (anzahl >= 2) * (pensum >= gemeinsam)
        )
        ausnahme = (anzahl >= 1) * ((eltern_ausnahme + kind_ausnahme) > 0)
        return (schwelle + ausnahme) > 0


class kibg_voraussetzungen_ohne_pensum(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Anspruchsvoraussetzungen ausser dem Pensum"
    reference = "Art. 3 Abs. 1 und Art. 4 KiBG, Art. 7 KiBV"

    def formula(person, period, parameters):
        ist_kind = person.has_role(Household.CHILD)
        alter_ok = (
            person("alter_in_monaten", period)
            >= parameters(period).kibg.mindestalter_monate
        )
        schule_ok = person("primarschule_abgeschlossen", period) == 0
        obhut_ok = person("faktische_obhut", period)
        betreuung_ok = person("betreuung_in_anspruch", period)
        einrichtung_ok = person("betreuung_in_anerkannter_einrichtung", period)
        wohnsitz_ok = person.household(
            "kibg_alle_erziehungsberechtigten_im_kanton",
            period,
        )
        return (
            ist_kind
            * alter_ok
            * schule_ok
            * obhut_ok
            * betreuung_ok
            * einrichtung_ok
            * wohnsitz_ok
        )


class kibg_anspruchsberechtigt(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Kind ist für einen KiBG-Beitrag anspruchsberechtigt"
    reference = "Art. 3 Abs. 1 und Art. 4 KiBG, Art. 7 und Art. 12 KiBV"

    def formula(person, period):
        """Nur das betreute Kind wird true. Eltern und Partner bleiben false."""
        voraussetzungen = person("kibg_voraussetzungen_ohne_pensum", period)
        pensum_ok = person("kibg_pensum_erfuellt", period)
        return voraussetzungen * pensum_ok


class kibg_sonderantrag_noetig(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Pensum nicht erfüllt, Spezialantrag nötig"
    reference = "Art. 4 Abs. 2 KiBG"

    def formula(person, period):
        """Signal für das Formular. Hebt den Anspruch nicht selbst auf oder an."""
        voraussetzungen = person("kibg_voraussetzungen_ohne_pensum", period)
        pensum_ok = person("kibg_pensum_erfuellt", period)
        return voraussetzungen * (pensum_ok == 0)
