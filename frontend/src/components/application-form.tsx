
import { useState, type FormEvent } from "react";
import type { ChildInput, HouseholdInput } from "@/lib/kibg";

type Applicant = {
  firstName: string;
  lastName: string;
  birthDate: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
};

const emptyApplicant: Applicant = {
  firstName: "",
  lastName: "",
  birthDate: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  phone: "+41 ",
  email: "",
};

function normalizeSwissPhone(value: string): string | null {
  const cleaned = value.replace(/[\s().-]/g, "");
  if (!/^\+41[1-9]\d{8}$/.test(cleaned)) return null;
  return cleaned;
}

export default function ApplicationForm({
  household,
  children,
  onClose,
}: {
  household: HouseholdInput;
  children: ChildInput[];
  onClose: () => void;
}) {
  const [applicant, setApplicant] =
    useState<Applicant>(emptyApplicant);

  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof Applicant, value: string) {
    setApplicant((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
  }

  function validate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{4}$/.test(applicant.postalCode)) {
      setError(
        "Bitte geben Sie eine Schweizer Postleitzahl mit vier Ziffern ein.",
      );
      return;
    }

    if (!normalizeSwissPhone(applicant.phone)) {
      setError(
        "Bitte geben Sie eine gültige Schweizer Telefonnummer ein, z. B. +41 79 123 45 67.",
      );
      return;
    }

    const date = new Date(
      `${applicant.birthDate}T12:00:00`,
    );

    if (
      !applicant.birthDate ||
      Number.isNaN(date.getTime()) ||
      date > new Date()
    ) {
      setError(
        "Bitte geben Sie ein gültiges Geburtsdatum in der Vergangenheit ein.",
      );
      return;
    }

    setReview(true);
  }

  const fieldClass =
    "mt-1 min-h-11 w-full rounded-card border border-line bg-card px-3 text-ink";

  return (
    <section
      className="rounded-card border border-line bg-sand p-4 sm:p-6"
      aria-labelledby="application-title"
    >
      <h3
        id="application-title"
        className="font-serif text-2xl text-ink"
      >
        Gesuch vorbereiten
      </h3>

      <p className="mt-2 text-sm text-muted">
        Ihre Berechnung war anonym.
        Persönliche Angaben werden erst jetzt
        für ein mögliches Gesuch erfasst.
        Dies ist eine Demo: Es besteht keine
        Verbindung zum Kanton und es werden
        keine Daten übermittelt.
      </p>

      {!review ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={validate}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Vorname *
              <input
                className={fieldClass}
                required
                autoComplete="given-name"
                value={applicant.firstName}
                onChange={(e) =>
                  update("firstName", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              Nachname *
              <input
                className={fieldClass}
                required
                autoComplete="family-name"
                value={applicant.lastName}
                onChange={(e) =>
                  update("lastName", e.target.value)
                }
              />
            </label>
          </div>

          <label className="text-sm">
            Geburtsdatum *
            <input
              className={fieldClass}
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={applicant.birthDate}
              onChange={(e) =>
                update("birthDate", e.target.value)
              }
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Strasse *
              <input
                className={fieldClass}
                required
                autoComplete="address-line1"
                value={applicant.street}
                onChange={(e) =>
                  update("street", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              Hausnummer *
              <input
                className={fieldClass}
                required
                value={applicant.houseNumber}
                onChange={(e) =>
                  update("houseNumber", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              PLZ (Schweiz) *
              <input
                className={fieldClass}
                required
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                autoComplete="postal-code"
                value={applicant.postalCode}
                onChange={(e) =>
                  update("postalCode", e.target.value)
                }
              />
            </label>

            <label className="text-sm">
              Ort *
              <input
                className={fieldClass}
                required
                autoComplete="address-level2"
                value={applicant.city}
                onChange={(e) =>
                  update("city", e.target.value)
                }
              />
            </label>
          </div>

          <label className="text-sm">
            Telefonnummer (+41) *
            <input
              className={fieldClass}
              type="tel"
              required
              autoComplete="tel"
              placeholder="+41 79 123 45 67"
              value={applicant.phone}
              onChange={(e) =>
                update("phone", e.target.value)
              }
            />
          </label>

          <label className="text-sm">
            E-Mail-Adresse (optional)
            <input
              className={fieldClass}
              type="email"
              autoComplete="email"
              placeholder="name@beispiel.ch"
              value={applicant.email}
              onChange={(e) =>
                update("email", e.target.value)
              }
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-clay">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="min-h-11 rounded-card bg-pine px-4 text-pine-ink"
            >
              Angaben prüfen
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-card border border-line px-4"
            >
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-3 text-sm text-ink">
          <h4 className="font-medium">
            Zusammenfassung vor der Einreichung
          </h4>

          <p>
            <strong>Gesuchstellende Person:</strong>{" "}
            {applicant.firstName} {applicant.lastName},
            geboren am {applicant.birthDate}
          </p>

          <p>
            <strong>Adresse:</strong>{" "}
            {applicant.street} {applicant.houseNumber},
            {" "}{applicant.postalCode} {applicant.city}
          </p>

          <p>
            <strong>Telefon:</strong>{" "}
            {normalizeSwissPhone(applicant.phone)}
          </p>

          <p>
            <strong>E-Mail:</strong>{" "}
            {applicant.email || "Nicht angegeben"}
          </p>

          <p>
            <strong>Kinder:</strong>{" "}
            {children
              .map(
                (child) =>
                  child.name || "Unbenanntes Kind",
              )
              .join(", ") || "Keine"}
          </p>

          <p>
            <strong>Wohnsitz Kanton St.Gallen:</strong>{" "}
            {household.wohnsitz
              ? "Ja"
              : "Nein / nicht bestätigt"}
          </p>

          <label className="flex items-start gap-2 rounded-card border border-line bg-card p-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) =>
                setConfirmed(e.target.checked)
              }
            />
            <span>
              Ich bestätige, dass meine Angaben
              korrekt sind und habe verstanden,
              dass dieses Demo-Formular keine
              Daten an den Kanton sendet.
            </span>
          </label>

          <p className="text-muted">
            Eine echte Einreichung erfordert
            eine gesicherte behördliche
            Schnittstelle und Datenschutzhinweise.
            Sie ist hier noch nicht möglich.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="min-h-11 rounded-card border border-line px-4"
              onClick={() => setReview(false)}
            >
              Angaben bearbeiten
            </button>

            <button
              type="button"
              className="min-h-11 rounded-card bg-pine px-4 text-pine-ink disabled:opacity-40"
              disabled={!confirmed}
              onClick={() => {
                setConfirmed(false);
                setReview(false);
                onClose();
              }}
            >
              Demo abschliessen (nicht senden)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
