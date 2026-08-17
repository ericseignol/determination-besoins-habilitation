import { useEffect, useMemo, useRef, useState } from "react";
import { questions } from "./data/questions.js";
import { fetchOrganization, submitProspect } from "./lib/api.js";
import {
  addUniqueRecommendation,
  buildAnswer,
  getOrganizationSlug,
  isQuestionnaireComplete,
  splitEmployeeNames,
} from "./lib/questionnaire.js";

const emptyContact = {
  name: "",
  company: "",
  email: "",
  phone: "",
};

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function Brand({ organization }) {
  return (
    <div className="brand">
      {organization.logoUrl ? (
        <img className="brand__logo" src={organization.logoUrl} alt={`Logo ${organization.name}`} />
      ) : (
        <span className="brand__mark" aria-hidden="true">
          {organization.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="brand__name">{organization.name}</span>
    </div>
  );
}

function Shell({ organization, eyebrow, title, children }) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand organization={organization} />
        <span className="topbar__label">Assistant d’orientation</span>
      </header>
      <section className="card">
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex="-1" id="page-title">
          {title}
        </h1>
        {children}
      </section>
      <p className="footer-note">
        Cette estimation constitue une aide à l’orientation. L’employeur reste responsable de
        l’habilitation adaptée aux missions réellement confiées.
      </p>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="status-screen" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Préparation du questionnaire…</p>
    </main>
  );
}

function UnavailableScreen({ message }) {
  return (
    <main className="status-screen status-screen--error">
      <div className="status-icon" aria-hidden="true">
        !
      </div>
      <h1>Questionnaire indisponible</h1>
      <p>{message}</p>
    </main>
  );
}

function IntroStep({ organization, onStart }) {
  return (
    <Shell
      organization={organization}
      eyebrow="Habilitation électrique"
      title="Identifiez les habilitations adaptées aux missions"
    >
      <p className="lead">
        Répondez à quelques questions sur les tâches réellement effectuées. Vous obtiendrez une
        première estimation des indices d’habilitation à prévoir pour vos salariés.
      </p>
      <div className="voltage-grid">
        <article>
          <span className="voltage-grid__tag">BT</span>
          <h2>Basse tension</h2>
          <p>Installations dont la tension est inférieure ou égale à 1 000 volts.</p>
        </article>
        <article>
          <span className="voltage-grid__tag">HT</span>
          <h2>Haute tension</h2>
          <p>Installations dont la tension dépasse 1 000 volts.</p>
        </article>
      </div>
      <button className="button button--primary button--wide" type="button" onClick={onStart}>
        Commencer le questionnaire
        <span aria-hidden="true">→</span>
      </button>
      <p className="microcopy">Durée indicative : 3 à 5 minutes.</p>
    </Shell>
  );
}

function ContactStep({
  organization,
  contact,
  consent,
  website,
  onContactChange,
  onConsentChange,
  onWebsiteChange,
  onSubmit,
}) {
  return (
    <Shell organization={organization} eyebrow="Étape 1" title="Parlons de votre besoin">
      <p className="lead lead--compact">
        Ces coordonnées permettront à {organization.name} de reprendre contact avec vous au sujet
        de cette demande.
      </p>
      <form className="form" onSubmit={onSubmit}>
        <div className="field-grid">
          <label className="field">
            <span>Nom et prénom</span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              maxLength="120"
              value={contact.name}
              onChange={onContactChange}
              required
            />
          </label>
          <label className="field">
            <span>Entreprise</span>
            <input
              name="company"
              type="text"
              autoComplete="organization"
              maxLength="160"
              value={contact.company}
              onChange={onContactChange}
              required
            />
          </label>
          <label className="field">
            <span>Adresse e-mail</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength="254"
              value={contact.email}
              onChange={onContactChange}
              required
            />
          </label>
          <label className="field">
            <span>Téléphone</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength="40"
              value={contact.phone}
              onChange={onContactChange}
              required
            />
          </label>
        </div>
        <label className="honeypot" aria-hidden="true">
          Site internet
          <input
            name="website"
            type="text"
            autoComplete="off"
            tabIndex="-1"
            value={website}
            onChange={onWebsiteChange}
          />
        </label>
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => onConsentChange(event.target.checked)}
            required
          />
          <span>
            J’accepte que mes informations soient transmises à {organization.name} afin de traiter
            ma demande et de me recontacter.
          </span>
        </label>
        <button className="button button--primary button--wide" type="submit">
          Continuer
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </Shell>
  );
}

function EmployeesStep({ organization, namesValue, onNamesChange, onBack, onSubmit }) {
  return (
    <Shell organization={organization} eyebrow="Étape 2" title="Qui est concerné ?">
      <p className="lead lead--compact">
        Indiquez les salariés ayant les mêmes missions. Pour des missions différentes, effectuez un
        questionnaire séparé.
      </p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Nom et prénom du ou des salariés</span>
          <textarea
            rows="3"
            maxLength="2000"
            placeholder="Ex. Marie Dupont, Jules Martin"
            value={namesValue}
            onChange={(event) => onNamesChange(event.target.value)}
            required
          />
          <small>Séparez plusieurs personnes par une virgule.</small>
        </label>
        <div className="button-row">
          <button className="button button--secondary" type="button" onClick={onBack}>
            Retour
          </button>
          <button className="button button--primary" type="submit">
            Commencer les questions
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </Shell>
  );
}

function QuestionStep({ organization, question, answeredCount, onAnswer }) {
  return (
    <Shell
      organization={organization}
      eyebrow={`Question ${answeredCount + 1}`}
      title={question.question}
    >
      <div className="progress" aria-label={`${answeredCount} réponse(s) enregistrée(s)`}>
        <span style={{ width: `${Math.min(18 + answeredCount * 7, 92)}%` }} />
      </div>
      <div className="choices" role="group" aria-label="Choisissez une réponse">
        {question.options.map((option, index) => (
          <button
            className="choice"
            type="button"
            key={option}
            onClick={() => onAnswer(index)}
          >
            <span>{option}</span>
            <span className="choice__arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
      <p className="microcopy">Choisissez la réponse correspondant aux missions réelles.</p>
    </Shell>
  );
}

function SummaryStep({
  organization,
  employeeNames,
  recommendations,
  answers,
  submitting,
  submitError,
  onCorrect,
  onSubmit,
}) {
  return (
    <Shell organization={organization} eyebrow="Synthèse" title="Vérifiez votre estimation">
      <div className="result-panel">
        <p className="result-panel__label">Salarié(s) concerné(s)</p>
        <p className="result-panel__names">{employeeNames.join(", ")}</p>
        <p className="result-panel__label">Indices identifiés</p>
        {recommendations.length ? (
          <div className="badges">
            {recommendations.map((recommendation) => (
              <span className="badge" key={recommendation}>
                {recommendation}
              </span>
            ))}
          </div>
        ) : (
          <p className="result-panel__empty">
            Aucun indice n’a été identifié automatiquement. Un conseiller pourra confirmer le
            besoin.
          </p>
        )}
      </div>
      <details className="answers">
        <summary>Relire les {answers.length} réponses</summary>
        <ol>
          {answers.map((answer) => (
            <li key={answer.questionId}>
              <strong>{answer.answer}</strong>
              <span>{answer.affirmation}</span>
            </li>
          ))}
        </ol>
      </details>
      {submitError ? (
        <div className="alert" role="alert">
          {submitError}
        </div>
      ) : null}
      <div className="button-row">
        <button
          className="button button--secondary"
          type="button"
          onClick={onCorrect}
          disabled={submitting}
        >
          Corriger les réponses
        </button>
        <button
          className="button button--primary"
          type="button"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner spinner--button" aria-hidden="true" />
              Transmission…
            </>
          ) : (
            <>
              Transmettre la demande
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>
      </div>
    </Shell>
  );
}

function SuccessStep({ organization }) {
  return (
    <Shell organization={organization} eyebrow="Demande transmise" title="Merci, c’est envoyé">
      <div className="success-mark" aria-hidden="true">
        ✓
      </div>
      <p className="lead">
        Votre demande a bien été enregistrée et transmise à {organization.name}. Un conseiller
        pourra vous recontacter aux coordonnées indiquées.
      </p>
      {organization.websiteUrl ? (
        <a className="button button--primary button--wide" href={organization.websiteUrl} target="_top">
          Retour au site de {organization.name}
          <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </Shell>
  );
}

export default function PublicQuestionnaire() {
  const fallbackSlug = import.meta.env.VITE_DEFAULT_ORGANIZATION_SLUG || "";
  const organizationSlug = useMemo(
    () => getOrganizationSlug(window.location.pathname, fallbackSlug),
    [fallbackSlug],
  );
  const [organization, setOrganization] = useState(null);
  const [organizationError, setOrganizationError] = useState("");
  const [stage, setStage] = useState("intro");
  const [contact, setContact] = useState(emptyContact);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [namesValue, setNamesValue] = useState("");
  const [employeeNames, setEmployeeNames] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [formStartedAt, setFormStartedAt] = useState(Date.now());
  const [submissionId] = useState(createSubmissionId);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const previousStage = useRef(stage);

  useEffect(() => {
    if (!organizationSlug) {
      setOrganizationError("Le lien utilisé ne précise aucun organisme.");
      return undefined;
    }

    const controller = new AbortController();
    fetchOrganization(organizationSlug, controller.signal)
      .then((loadedOrganization) => {
        setOrganization(loadedOrganization);
        document.documentElement.style.setProperty(
          "--brand",
          loadedOrganization.primaryColor || "#096b72",
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setOrganizationError(error.message);
        }
      });

    return () => controller.abort();
  }, [organizationSlug]);

  useEffect(() => {
    if (previousStage.current !== stage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => document.getElementById("page-title")?.focus(), 80);
      previousStage.current = stage;
    }
  }, [stage]);

  function handleStart() {
    setFormStartedAt(Date.now());
    setStage("contact");
  }

  function handleContactChange(event) {
    const { name, value } = event.target;
    setContact((current) => ({ ...current, [name]: value }));
  }

  function handleContactSubmit(event) {
    event.preventDefault();
    setStage("employees");
  }

  function handleEmployeesSubmit(event) {
    event.preventDefault();
    const parsedNames = splitEmployeeNames(namesValue);

    if (!parsedNames.length) {
      return;
    }

    setEmployeeNames(parsedNames);
    setStage("questions");
  }

  function handleAnswer(optionIndex) {
    const answer = buildAnswer(currentQuestion, optionIndex);
    setAnswers((current) => [...current, answer]);
    setRecommendations((current) =>
      addUniqueRecommendation(current, answer.recommendation),
    );

    if (isQuestionnaireComplete(answer.nextQuestion)) {
      setStage("summary");
      return;
    }

    setCurrentQuestion(answer.nextQuestion);
  }

  function handleCorrection() {
    setCurrentQuestion(0);
    setAnswers([]);
    setRecommendations([]);
    setSubmitError("");
    setStage("questions");
  }

  async function handleSubmission() {
    setSubmitting(true);
    setSubmitError("");

    try {
      await submitProspect({
        submissionId,
        organizationSlug,
        contact,
        employeeNames,
        recommendations,
        affirmations: answers.map((answer) => answer.affirmation),
        answers: answers.map(({ questionId, question, answer, affirmation, recommendation }) => ({
          questionId,
          question,
          answer,
          affirmation,
          recommendation,
        })),
        consent,
        website,
        formStartedAt,
      });
      setStage("success");
    } catch (error) {
      if (error.code === "EMAIL_DELIVERY_FAILED") {
        setSubmitError(
          "Votre demande est enregistrée, mais la notification n’a pas pu être envoyée. Vous pouvez réessayer sans créer de doublon.",
        );
      } else if (error.code === "RATE_LIMITED") {
        setSubmitError(
          "Plusieurs demandes ont été envoyées récemment depuis cette connexion. Merci de patienter avant de réessayer.",
        );
      } else {
        setSubmitError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (organizationError) {
    return <UnavailableScreen message={organizationError} />;
  }

  if (!organization) {
    return <LoadingScreen />;
  }

  if (stage === "intro") {
    return <IntroStep organization={organization} onStart={handleStart} />;
  }

  if (stage === "contact") {
    return (
      <ContactStep
        organization={organization}
        contact={contact}
        consent={consent}
        website={website}
        onContactChange={handleContactChange}
        onConsentChange={setConsent}
        onWebsiteChange={(event) => setWebsite(event.target.value)}
        onSubmit={handleContactSubmit}
      />
    );
  }

  if (stage === "employees") {
    return (
      <EmployeesStep
        organization={organization}
        namesValue={namesValue}
        onNamesChange={setNamesValue}
        onBack={() => setStage("contact")}
        onSubmit={handleEmployeesSubmit}
      />
    );
  }

  if (stage === "questions") {
    return (
      <QuestionStep
        organization={organization}
        question={questions[currentQuestion]}
        answeredCount={answers.length}
        onAnswer={handleAnswer}
      />
    );
  }

  if (stage === "summary") {
    return (
      <SummaryStep
        organization={organization}
        employeeNames={employeeNames}
        recommendations={recommendations}
        answers={answers}
        submitting={submitting}
        submitError={submitError}
        onCorrect={handleCorrection}
        onSubmit={handleSubmission}
      />
    );
  }

  return <SuccessStep organization={organization} />;
}
