"""Eingaben für die Anspruchsprüfung nach dem KiBG.

Reiner Input, keine Formeln. Die Berechnung steht in kibg_eligibility.py.
"""

from openfisca_core.periods import MONTH
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
