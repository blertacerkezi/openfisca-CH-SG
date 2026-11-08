
# KiBG St. Gallen in OpenFisca

Model of financial contributions towards supplementary childcare in the Canton of St. Gallen.

Act: Childcare Act (KiBG).
Ordinance: KiBV.
Income: Introductory Act to the Federal Health Insurance Act, Articles 12 and 12bis (EG-KVG).

This is a hackathon-stage implementation, not an official decision on an application.

## What Belongs to the KiBG Implementation in the Repository

Only the following paths:

- `openfisca_ch_sg/variables/kibg_inputs.py` — Inputs, one variable per legal condition
- `openfisca_ch_sg/variables/kibg_eligibility.py` — Eligibility
- `openfisca_ch_sg/variables/kibg_income.py` — Assessable income
- `openfisca_ch_sg/variables/kibg_rates.py` — Hourly contribution rate by category
- `openfisca_ch_sg/variables/kibg_calculations.py` — Monthly contribution
- `openfisca_ch_sg/parameters/kibg/` — Rates and thresholds
- `openfisca_ch_sg/tests/kibg_*.yaml`

The remaining components (`benefits`, `taxes`, `reforms`, basic income, housing assistance) belong to the OpenFisca template. They are not needed for this implementation.

## Interface

Eligibility, individual, month:

- `kibg_anspruchsberechtigt` — `true` only for the child receiving childcare
- `kibg_sonderantrag_noetig` — The employment requirement is not met, but the remaining eligibility conditions are satisfied

Income, household, month, Swiss francs per year:

- `kibg_massgebendes_einkommen`
- `massgebendes_einkommen` — The same amount assigned to the individual

Contribution, individual, month:

- `einkommensfaktor`
- `maximaler_stundenbeitrag`
- `gesamter_stundenbeitrag` — `(MaxV + Z1) * Factor + Z2`
- `anrechenbare_betreuungsstunden` — Maximum of 12 hours per day
- `beitrag_nach_kostenbegrenzung` — Never higher than the actual costs

Amounts not specified under Article 12 EG-KVG are treated as 0.

## Tests

Run from the repository root with the package installed:

```bash
uv run openfisca test openfisca_ch_sg/tests/kibg_eligibility.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_income.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_rates.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_calculation.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_costs.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_hours.yaml --country-package openfisca_ch_sg
uv run openfisca test openfisca_ch_sg/tests/kibg_zuschlaege.yaml --country-package openfisca_ch_sg
```

## Rule: One Legal Provision, One Variable

Each numbered item, letter, and paragraph is represented by a separate variable or parameter. No helper function should combine multiple legal conditions.

A formula should only perform the operation prescribed by the specific paragraph: for example, adding the amounts that the paragraph requires to be added or checking a threshold.

The inputs in `kibg_inputs.py` and the parameters under `parameters/kibg/` follow this principle. Each numbered item of Article 12 EG-KVG is a separate input. Each hourly rate in the annex is stored in a separate YAML file.

The following formulas still combine several legal provisions and should be separated without changing the names of the interface variables:

| Location | What Is Combined |
| --- | --- |
| `_erziehungsberechtigte_erwachsene` in `kibg_eligibility.py` | Helper function rather than a separate variable. Used for the number of adults, employment requirements, residence, and exceptions. |
| `kibg_pensum_erfuellt` | Individual employment threshold, combined employment threshold, and exceptions in one formula. |
| `kibg_voraussetzungen_ohne_pensum` | Age, primary school, custody, childcare, childcare institution, and residence multiplied together. |
| `kibg_einkommen_person` | All supplements under Article 12 and the entirety of Article 12bis, including cross-border workers. |
| `kibg_massgebendes_einkommen` | Tax assessment from the year before last and the 25% rule. |
| `maximaler_stundenbeitrag` | All lines of the annex combined in one `select` statement. |
| `einkommensfaktor` | Lower and upper limits of the income range in one formula. |
| `gefaestigte_lebensgemeinschaft` | Marriage and the minimum duration of a stable cohabiting relationship in one formula. |

Already separated and should remain so: `zusatzbeitrag_z1`, `zusatzbeitrag_z2`, `anrechenbare_betreuungsstunden` (Article 14 paragraph 4 KiBV), and `beitrag_nach_kostenbegrenzung` (Article 6 paragraph 2 and Article 20 paragraph 3 KiBG).
