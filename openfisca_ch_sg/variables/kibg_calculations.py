from openfisca_core.model_api import *
from openfisca_ch_sg.entities import Person


class einkommensfaktor(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Einkommensabhängiger Beitragsfaktor"
    reference = "KiBV Art. 13–15, Anhang"

    def formula(person, period, parameters):
        einkommen = person("massgebendes_einkommen", period)

        kibg = parameters(period).kibg
        minimum = kibg.minimum_income
        maximum = kibg.maximum_income

        faktor = (maximum - einkommen) / (maximum - minimum)

        return max_(0, min_(1, faktor))


class grundbeitrag_pro_stunde(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    label = "Einkommensabhängiger Grundbeitrag pro Stunde"
    reference = "KiBV Art. 13–15, Anhang"

    def formula(person, period):
        faktor = person("einkommensfaktor", period)
        hoechstbeitrag = person("maximaler_stundenbeitrag", period)

        return hoechstbeitrag * faktor