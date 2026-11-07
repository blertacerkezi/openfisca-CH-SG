"""Höchstbeiträge je Betreuungsstunde."""

from openfisca_core.model_api import MONTH, Enum, Variable, not_, select

from openfisca_ch_sg.entities import Person


class Betreuungsart(Enum):
    kita = "Kindertagesstätte"
    tagesfamilie = "Tagesfamilie"
    schulergaenzend = "Schulergänzende Betreuung"


class kind_eingeschult(Variable):
    value_type = bool
    entity = Person
    definition_period = MONTH
    default_value = False
    label = "Kind ist eingeschult"
    reference = "KiBV Art. 14"


class betreuungsart(Variable):
    value_type = Enum
    possible_values = Betreuungsart
    default_value = Betreuungsart.kita
    entity = Person
    definition_period = MONTH
    label = "Art der Kinderbetreuung"
    reference = "KiBV Art. 14"


class maximaler_stundenbeitrag(Variable):
    value_type = float
    entity = Person
    definition_period = MONTH
    default_value = 0
    label = "Maximaler Beitrag je Betreuungsstunde"
    reference = "KiBV Art. 14"

    def formula(person, period, parameters):
        alter = person("alter_in_monaten", period)
        eingeschult = person("kind_eingeschult", period)
        art = person("betreuungsart", period)
        saetze = parameters(period).kibg.max_hourly_rate
        return select(
            [
                (art == Betreuungsart.kita) & eingeschult,
                (art == Betreuungsart.tagesfamilie) & eingeschult,
                (art == Betreuungsart.kita) & not_(eingeschult) & (alter < 18),
                (art == Betreuungsart.kita) & not_(eingeschult) & (alter >= 18),
                (art == Betreuungsart.tagesfamilie) & not_(eingeschult) & (alter < 18),
                (art == Betreuungsart.tagesfamilie) & not_(eingeschult) & (alter >= 18),
                (art == Betreuungsart.schulergaenzend) & eingeschult,
            ],
            [
                saetze.daycare_from_18_months,
                saetze.family_care_from_18_months,
                saetze.daycare_under_18_months,
                saetze.daycare_from_18_months,
                saetze.family_care_under_18_months,
                saetze.family_care_from_18_months,
                saetze.school_care,
            ],
            default=0,
        )
