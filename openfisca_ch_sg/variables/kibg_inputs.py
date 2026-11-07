"""Eingaben für Anspruch und massgebendes Einkommen.

Reiner Input, keine Formeln. Nicht gesetzte Beträge zählen als 0.
"""

from openfisca_core.periods import MONTH, YEAR
from openfisca_core.variables import Variable

from openfisca_ch_sg.entities import Person


class wohnsitz_im_kanton(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Zivilrechtlicher Wohnsitz im Kanton St. Gallen"
    reference = "Art. 4 Abs. 1 KiBG"


class erziehungsberechtigt(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Person ist für das Kind erziehungsberechtigt"
    reference = "Art. 4 Abs. 1 KiBG"


class beschaeftigungsgrad(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    default_value = 0
    label = "Beschäftigungsgrad in Prozent"
    reference = "Art. 4 Abs. 1 KiBG"


class berufliche_integration(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Berufliche Integration, Stellensuche, Aus- oder Weiterbildung"
    reference = "Art. 12 Bst. a KiBV"


class familiaere_belastung(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Familiäre Belastung der erziehungsberechtigten Person"
    reference = "Art. 12 Bst. b KiBV"


class alter_in_monaten(Variable):
    value_type = int
    entity = Person
    definition_period = MONTH
    default_value = 0
    label = "Alter des Kindes in Monaten"
    reference = "Art. 4 Abs. 3 KiBG"


class primarschule_abgeschlossen(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Primarschule ist abgeschlossen"
    reference = "Art. 4 Abs. 3 KiBG"


class faktische_obhut(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Faktische Obhut für das betreute Kind"
    reference = "Art. 7 KiBV"


class betreuung_in_anspruch(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Familien- oder schulergänzende Betreuung wird in Anspruch genommen"
    reference = "Art. 7 KiBV"


class betreuung_in_anerkannter_einrichtung(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Betreuung in einer anerkannten und angemeldeten Einrichtung"
    reference = "Art. 3 Abs. 1 KiBG"


class kindliche_indikation(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Entwicklungs-, Verhaltens- oder sprachliche Indikation des Kindes"
    reference = "Art. 12 Bst. c KiBV"


class reineinkommen(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Reineinkommen der Steuerperiode"
    reference = "Art. 12 Abs. 1 EG-KVG"


class steuerbares_vermoegen(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Steuerbares Vermögen"
    reference = "Art. 12 Abs. 2 Ziff. 1 EG-KVG"


class beitraege_saeule_3a(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Beiträge an die gebundene Selbstvorsorge Säule 3a"
    reference = "Art. 12 Abs. 2 Ziff. 2 EG-KVG"


class bvg_leistungen_und_einkauf(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Leistungen und Einkaufsbeiträge der beruflichen Vorsorge"
    reference = "Art. 12 Abs. 2 Ziff. 3 EG-KVG"


class liegenschaftsaufwand_ueber_pauschale(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Liegenschaftsaufwand über dem Pauschalabzug von 20 Prozent"
    reference = "Art. 12 Abs. 2 Ziff. 4 EG-KVG"


class vorjahresverlust(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Vorjahresverlust"
    reference = "Art. 12 Abs. 2 Ziff. 5 EG-KVG"


class bruttolohn_vereinfachtes_verfahren(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Bruttolohn aus dem vereinfachten Verfahren"
    reference = "Art. 12 Abs. 2 Ziff. 5bis EG-KVG"


class freiwillige_zuwendungen(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Freiwillige Zuwendungen und Parteispenden"
    reference = "Art. 12 Abs. 2 Ziff. 5ter EG-KVG"


class eigenmietwert(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Mietwert des selbstbewohnten Eigenheims"
    reference = "Art. 12 Abs. 2 Ziff. 5quinquies EG-KVG"


class ertrag_qualifizierte_beteiligung_geschaeft(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Ertrag qualifizierter Beteiligungen des Geschäftsvermögens"
    reference = "Art. 12 Abs. 2 Ziff. 5sexies EG-KVG"


class ertrag_qualifizierte_beteiligung_privat(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Ertrag qualifizierter Beteiligungen des Privatvermögens"
    reference = "Art. 12 Abs. 2 Ziff. 5septies EG-KVG"


class uebrige_zuschlaege(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Übrige Zuschläge nach Art. 12, soweit nicht einzeln erfasst"
    reference = "Art. 12 Abs. 2 EG-KVG"


class quellenbesteuert(Variable):
    value_type = bool
    entity = Person
    definition_period = YEAR
    default_value = False
    label = "Person ist quellenbesteuert"
    reference = "Art. 12bis EG-KVG"


class bruttoeinkommen_quellensteuer(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Definitives Bruttoeinkommen der Quellensteuer"
    reference = "Art. 12bis Abs. 1 EG-KVG"


class grenzgaenger(Variable):
    value_type = bool
    entity = Person
    definition_period = YEAR
    default_value = False
    label = "Grenzgängerin oder Grenzgänger"
    reference = "Art. 12bis Abs. 5 EG-KVG"


class kaufkraftindex(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 1
    label = "Kaufkraftindex des Wohnlandes"
    reference = "Art. 12bis Abs. 5 EG-KVG"


class verheiratet(Variable):
    value_type = bool
    entity = Person
    definition_period = YEAR
    default_value = False
    label = "Person ist verheiratet"
    reference = "Art. 8 Abs. 2 KiBV"


class lebensgemeinschaft_jahre(Variable):
    value_type = int
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Dauer der ununterbrochenen Lebensgemeinschaft in Jahren"
    reference = "Art. 8 Abs. 2 KiBV"


class aktuelle_situation_bekannt(Variable):
    value_type = bool
    entity = Person
    definition_period = YEAR
    default_value = False
    label = "Aktuelle Einkommenssituation ist bekannt"
    reference = "Art. 11 KiBV"


class einkommen_aktuelle_gegebenheiten(Variable):
    value_type = float
    entity = Person
    definition_period = YEAR
    default_value = 0
    label = "Massgebendes Einkommen nach den aktuellen Gegebenheiten"
    reference = "Art. 11 KiBV"
