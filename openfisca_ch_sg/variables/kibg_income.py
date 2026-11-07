"""Massgebendes Einkommen und Vermögen.

Schnittstelle für die Beitragsberechnung:
    kibg_massgebendes_einkommen (Household, MONTH, float)
    Jahresbetrag in Franken. Steuerdaten aus dem vorletzten Jahr.

Gefestigte Lebensgemeinschaft: verheiratet oder mindestens
lebensgemeinschaft_mindestjahre. Solche Partner werden als Erwachsene
im selben Haushalt geführt. Eine zweite Haushalts-Entity gibt es nicht.
Nicht gesetzte Art.-12-Beträge sind 0. Der Kaufkraftindex ist 1.
"""

from numpy import absolute, maximum, where
from openfisca_core.periods import MONTH, YEAR
from openfisca_core.variables import Variable

from openfisca_ch_sg.entities import Household, Person


class gefaestigte_lebensgemeinschaft(Variable):
    value_type = bool
    entity = Household
    definition_period = YEAR
    default_value = False
    label = "Ehe oder ununterbrochene Lebensgemeinschaft"
    reference = "Art. 8 Abs. 2 KiBV"

    def formula(household, period, parameters):
        mindestjahre = parameters(period).kibg.lebensgemeinschaft_mindestjahre
        verheiratet = household.members("verheiratet", period)
        jahre = household.members("lebensgemeinschaft_jahre", period)
        return (household.sum(1 * verheiratet) > 0) + (
            household.sum(1 * (jahre >= mindestjahre)) > 0
        )


class kibg_zaehlt_fuer_einkommen(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Einkommen und Vermögen dieser Person zählen mit"
    reference = "Art. 8 KiBV"

    def formula(person, period):
        erwachsen = person.has_role(Household.ADULT)
        erziehungsberechtigt = person("erziehungsberechtigt", period)
        gemeinschaft = person.household(
            "gefaestigte_lebensgemeinschaft",
            period.this_year,
        )
        return erwachsen * ((erziehungsberechtigt + gemeinschaft) > 0)


class kibg_einkommen_person(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Massgebendes Einkommen einer Person vor dem Kinderabzug"
    reference = "Art. 12 und Art. 12bis EG-KVG"

    def formula(person, period, parameters):
        """Art. 12 für ordentlich besteuerte, Art. 12bis für quellenbesteuerte."""
        saetze = parameters(period)
        ordentlich = (
            person("reineinkommen", period)
            + saetze.kibg.vermoegensanteil * person("steuerbares_vermoegen", period)
            + person("beitraege_saeule_3a", period)
            + person("bvg_leistungen_und_einkauf", period)
            + person("liegenschaftsaufwand_ueber_pauschale", period)
            + person("vorjahresverlust", period)
            + saetze.kibg.zuschlag_vereinfachtes_verfahren
            * person("bruttolohn_vereinfachtes_verfahren", period)
            + person("freiwillige_zuwendungen", period)
            + saetze.kibg.abzugssatz_eigenmietwert * person("eigenmietwert", period)
            + saetze.kibg.abzugssatz_qualifizierte_beteiligung
            * person("ertrag_qualifizierte_beteiligung_geschaeft", period)
            + saetze.kibg.abzugssatz_qualifizierte_beteiligung
            * person("ertrag_qualifizierte_beteiligung_privat", period)
            + person("uebrige_zuschlaege", period)
        )
        quellen_basis = person("bruttoeinkommen_quellensteuer", period) + person(
            "bruttolohn_vereinfachtes_verfahren",
            period,
        )
        quellen = quellen_basis * saetze.kibg.quellensteuer_anteil
        quellen = quellen * where(
            person("grenzgaenger", period), person("kaufkraftindex", period), 1
        )
        return where(person("quellenbesteuert", period), quellen, ordentlich)


class kibg_einkommen_aus_veranlagung(Variable):
    value_type = float
    entity = Household
    definition_period = MONTH
    default_value = 0
    label = "Massgebendes Einkommen aus der Veranlagung des vorletzten Jahres"
    reference = "Art. 9 KiBV und Art. 12 EG-KVG"

    def formula(household, period, parameters):
        steuerjahr = period.this_year.offset(-2, "year")
        zaehlt = household.members("kibg_zaehlt_fuer_einkommen", period)
        summe = household.sum(
            household.members("kibg_einkommen_person", steuerjahr) * zaehlt
        )
        quellenbesteuert = household.members("quellenbesteuert", steuerjahr)
        hat_ordentlich = household.sum(1 * zaehlt * (quellenbesteuert == 0)) > 0
        abzug = (
            hat_ordentlich
            * household.nb_persons(Household.CHILD)
            * parameters(period).kibg.kinderabzug
        )
        return maximum(summe - abzug, 0)


class kibg_massgebendes_einkommen(Variable):
    value_type = float
    entity = Household
    definition_period = MONTH
    default_value = 0
    label = "Massgebendes Einkommen des Haushalts"
    reference = "Art. 5 KiBG, Art. 9 und Art. 11 KiBV"

    def formula(household, period, parameters):
        """Art. 11: ab 25 Prozent Abweichung gelten die aktuellen Gegebenheiten."""
        aus_veranlagung = household("kibg_einkommen_aus_veranlagung", period)
        zaehlt = household.members("kibg_zaehlt_fuer_einkommen", period)
        bezugsjahr = period.this_year
        aktuell = household.sum(
            household.members("einkommen_aktuelle_gegebenheiten", bezugsjahr) * zaehlt
        )
        bekannt = (
            household.sum(
                1 * household.members("aktuelle_situation_bekannt", bezugsjahr) * zaehlt
            )
            > 0
        )
        schwelle = parameters(period).kibg.abweichungsschwelle
        abweichung = where(
            aus_veranlagung == 0,
            (aktuell != 0) * 1.0,
            absolute(aktuell - aus_veranlagung) / aus_veranlagung,
        )
        return where(
            bekannt & (abweichung >= schwelle),
            maximum(aktuell, 0),
            aus_veranlagung,
        )


class massgebendes_einkommen(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    default_value = 0
    label = "Massgebendes Einkommen, auf die Person projiziert"
    reference = "Art. 5 KiBG"

    def formula(person, period):
        """Dieselbe Haushaltsgrösse für jede Person. CS2 liest diesen Namen."""
        return person.household("kibg_massgebendes_einkommen", period)
