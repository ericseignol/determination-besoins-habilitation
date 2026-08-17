import { useEffect, useMemo, useState } from "react";
import PublicQuestionnaire from "./PublicQuestionnaire.jsx";
import {
  createOrganization,
  deleteAdminProspect,
  fetchAccount,
  fetchAdminProspects,
  resendReceptionVerification,
  updateOrganization,
  uploadOrganizationLogo,
  verifyReceptionEmail,
} from "./lib/account-api.js";
import { requireSupabase } from "./lib/supabase.js";

const productName = "Qualification Habilitations";

function navigate(path) {
  window.location.assign(path);
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 63);
}

function copyToClipboard(value) {
  return navigator.clipboard.writeText(value);
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-shell">
      <a className="product-brand" href="/">
        <span className="product-brand__mark">QH</span>
        <span>{productName}</span>
      </a>
      <section className="auth-card">
        <p className="eyebrow">Espace organismes</p>
        <h1>{title}</h1>
        <p className="lead lead--compact">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isSignup && password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 10) {
      setError("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      const client = requireSupabase();

      if (isSignup) {
        const { data, error: signupError } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/connexion?confirmed=1`,
          },
        });
        if (signupError) throw signupError;

        if (data.session) {
          navigate("/onboarding");
          return;
        }

        setMessage(
          "Votre compte est créé. Consultez votre messagerie et cliquez sur le lien de confirmation avant de vous connecter.",
        );
      } else {
        const { data, error: loginError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;

        const account = await fetchAccount(data.session);
        navigate(account.organization ? "/admin" : "/onboarding");
      }
    } catch (caughtError) {
      setError(
        caughtError.message === "Invalid login credentials"
          ? "Adresse e-mail ou mot de passe incorrect."
          : caughtError.message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={isSignup ? "Créer votre accès" : "Bienvenue"}
      subtitle={
        isSignup
          ? "Quelques minutes suffisent pour configurer votre questionnaire et obtenir votre iframe."
          : "Connectez-vous pour consulter vos prospects et gérer votre questionnaire."
      }
    >
      {new URLSearchParams(window.location.search).get("confirmed") ? (
        <div className="notice notice--success">Votre adresse est confirmée. Vous pouvez vous connecter.</div>
      ) : null}
      {message ? <div className="notice notice--success">{message}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}
      <form className="form admin-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Adresse e-mail professionnelle</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength="10"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {isSignup ? <small>Au moins 10 caractères.</small> : null}
        </label>
        {isSignup ? (
          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength="10"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </label>
        ) : null}
        <button className="button button--primary button--wide" type="submit" disabled={submitting}>
          {submitting ? "Patientez…" : isSignup ? "Créer mon compte" : "Se connecter"}
        </button>
      </form>
      <p className="auth-switch">
        {isSignup ? "Vous avez déjà un compte ?" : "Vous n’avez pas encore de compte ?"}{" "}
        <a href={isSignup ? "/connexion" : "/inscription"}>
          {isSignup ? "Se connecter" : "Créer un accès"}
        </a>
      </p>
      {!isSignup ? (
        <p className="auth-switch">
          <a href="/mot-de-passe-oublie">Mot de passe oublié ?</a>
        </p>
      ) : null}
    </AuthLayout>
  );
}

function PasswordPage({ recovery = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const client = requireSupabase();
      if (recovery) {
        if (password.length < 10) {
          setError("Le mot de passe doit contenir au moins 10 caractères.");
          return;
        }
        const { error: updateError } = await client.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage("Votre mot de passe est modifié. Vous pouvez accéder à votre espace.");
      } else {
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
        });
        if (resetError) throw resetError;
        setMessage("Un lien de réinitialisation vient de vous être envoyé.");
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  return (
    <AuthLayout
      title={recovery ? "Choisir un nouveau mot de passe" : "Mot de passe oublié"}
      subtitle={
        recovery
          ? "Saisissez votre nouveau mot de passe."
          : "Nous vous enverrons un lien sécurisé."
      }
    >
      {message ? <div className="notice notice--success">{message}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}
      <form className="form admin-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{recovery ? "Nouveau mot de passe" : "Adresse e-mail"}</span>
          <input
            type={recovery ? "password" : "email"}
            autoComplete={recovery ? "new-password" : "email"}
            value={recovery ? password : email}
            onChange={(event) =>
              recovery ? setPassword(event.target.value) : setEmail(event.target.value)
            }
            required
          />
        </label>
        <button className="button button--primary button--wide" type="submit">
          {recovery ? "Enregistrer le mot de passe" : "Envoyer le lien"}
        </button>
      </form>
      <p className="auth-switch">
        <a href="/connexion">Retour à la connexion</a>
      </p>
    </AuthLayout>
  );
}

function useProtectedAccount() {
  const [state, setState] = useState({
    loading: true,
    session: null,
    account: null,
    error: "",
  });

  async function refresh() {
    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        navigate("/connexion");
        return;
      }
      const account = await fetchAccount(data.session);
      setState({ loading: false, session: data.session, account, error: "" });
    } catch (error) {
      setState({ loading: false, session: null, account: null, error: error.message });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { ...state, refresh };
}

function LoadingClientArea() {
  return (
    <main className="status-screen">
      <span className="spinner" aria-hidden="true" />
      <p>Chargement de votre espace…</p>
    </main>
  );
}

function OnboardingPage() {
  const accountState = useProtectedAccount();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    receptionEmail: "",
    senderName: "",
    logoUrl: "",
    primaryColor: "#096b72",
    websiteUrl: "",
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (accountState.account?.organization) {
      navigate("/admin");
    } else if (accountState.session?.user?.email) {
      setForm((current) => ({
        ...current,
        receptionEmail: current.receptionEmail || accountState.session.user.email,
      }));
    }
  }, [accountState.account, accountState.session]);

  function updateField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "name" && !slugEdited) {
        next.slug = slugify(value);
        next.senderName = current.senderName || value;
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await createOrganization(accountState.session, form);
      if (logoFile) {
        try {
          await uploadOrganizationLogo(accountState.session, logoFile);
        } catch {
          navigate("/admin/reglages?logo=error");
          return;
        }
      }
      navigate(result.organization.emailVerified ? "/admin" : "/admin/reglages?verification=1");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (accountState.loading) return <LoadingClientArea />;

  return (
    <AuthLayout
      title="Configurez votre organisme"
      subtitle="Ces informations personnaliseront automatiquement votre questionnaire et son iframe."
    >
      {error ? <div className="notice notice--error">{error}</div> : null}
      <form className="form onboarding-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Nom de l’organisme</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            maxLength="160"
            required
          />
        </label>
        <label className="field">
          <span>Identifiant du questionnaire</span>
          <input
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              updateField("slug", slugify(event.target.value));
            }}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength="63"
            required
          />
          <small>Exemple : asfor. Cet identifiant apparaîtra dans le lien.</small>
        </label>
        <label className="field">
          <span>Adresse qui recevra les demandes</span>
          <input
            type="email"
            value={form.receptionEmail}
            onChange={(event) => updateField("receptionEmail", event.target.value)}
            required
          />
          <small>Cette adresse devra être vérifiée.</small>
        </label>
        <label className="field">
          <span>Nom affiché comme expéditeur</span>
          <input
            value={form.senderName}
            onChange={(event) => updateField("senderName", event.target.value)}
            maxLength="120"
            required
          />
          <small>L’adresse technique d’envoi reste protégée par la plateforme.</small>
        </label>
        <label className="field">
          <span>Logo de l’organisme</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
          />
          <small>PNG, JPG ou WebP, 1,5 Mo maximum.</small>
        </label>
        <label className="field">
          <span>Couleur principale</span>
          <span className="color-field">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(event) => updateField("primaryColor", event.target.value)}
            />
            <input
              value={form.primaryColor}
              onChange={(event) => updateField("primaryColor", event.target.value)}
              pattern="#[0-9A-Fa-f]{6}"
              required
            />
          </span>
        </label>
        <label className="field onboarding-grid__wide">
          <span>Site internet</span>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={(event) => updateField("websiteUrl", event.target.value)}
            placeholder="https://www.exemple.fr"
          />
        </label>
        <button
          className="button button--primary button--wide onboarding-grid__wide"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Création…" : "Créer mon questionnaire"}
        </button>
      </form>
    </AuthLayout>
  );
}

function AdminLayout({ organization, active, children }) {
  async function logout() {
    const client = requireSupabase();
    await client.auth.signOut();
    navigate("/connexion");
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="product-brand product-brand--inverse" href="/admin">
          <span className="product-brand__mark">QH</span>
          <span>{productName}</span>
        </a>
        <div className="admin-org">
          <strong>{organization.name}</strong>
          <span>{organization.emailVerified ? "Questionnaire actif" : "Activation en attente"}</span>
        </div>
        <nav className="admin-nav" aria-label="Espace organisme">
          <a className={active === "prospects" ? "is-active" : ""} href="/admin">
            Prospects
          </a>
          <a className={active === "settings" ? "is-active" : ""} href="/admin/reglages">
            Réglages et iframe
          </a>
          <a href={`/q/${organization.slug}`} target="_blank" rel="noreferrer">
            Voir le questionnaire
          </a>
        </nav>
        <button className="admin-logout" type="button" onClick={logout}>
          Se déconnecter
        </button>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  );
}

function DashboardPage() {
  const accountState = useProtectedAccount();
  const [prospects, setProspects] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (!accountState.loading && !accountState.account?.organization) {
      navigate("/onboarding");
      return;
    }
    if (accountState.session && accountState.account?.organization) {
      fetchAdminProspects(accountState.session)
        .then((result) => setProspects(result.prospects))
        .catch((caughtError) => setError(caughtError.message));
    }
  }, [accountState.loading, accountState.session, accountState.account]);

  async function handleDelete(prospect) {
    const confirmed = window.confirm(
      `Supprimer définitivement la demande de ${prospect.contactName} ?`,
    );
    if (!confirmed) return;

    setDeletingId(prospect.id);
    setError("");
    try {
      await deleteAdminProspect(accountState.session, prospect.id);
      setProspects((current) => current.filter((item) => item.id !== prospect.id));
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setDeletingId("");
    }
  }

  if (accountState.loading || !accountState.account?.organization) return <LoadingClientArea />;
  const organization = accountState.account.organization;

  return (
    <AdminLayout organization={organization} active="prospects">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1>Vos prospects</h1>
        </div>
        <a className="button button--secondary" href={`/q/${organization.slug}`} target="_blank">
          Tester le questionnaire
        </a>
      </header>
      {!organization.emailVerified ? (
        <div className="notice notice--warning">
          Vérifiez l’adresse de réception dans les réglages pour activer le questionnaire.
        </div>
      ) : null}
      {error ? <div className="notice notice--error">{error}</div> : null}
      <section className="metric-grid">
        <article>
          <span>Demandes reçues</span>
          <strong>{prospects.length}</strong>
        </article>
        <article>
          <span>Nouveaux prospects</span>
          <strong>{prospects.filter((prospect) => prospect.status === "new").length}</strong>
        </article>
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading">
          <h2>Demandes récentes</h2>
        </div>
        {prospects.length ? (
          <div className="table-wrap">
            <table className="prospect-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Contact</th>
                  <th>Entreprise</th>
                  <th>Coordonnées</th>
                  <th>Indices</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => (
                  <tr key={prospect.id}>
                    <td>{new Date(prospect.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td>{prospect.contactName}</td>
                    <td>{prospect.companyName}</td>
                    <td>
                      <a href={`mailto:${prospect.email}`}>{prospect.email}</a>
                      <span>{prospect.phone}</span>
                    </td>
                    <td>{prospect.recommendations.join(", ") || "À confirmer"}</td>
                    <td>
                      <button
                        className="text-button text-button--danger"
                        type="button"
                        disabled={deletingId === prospect.id}
                        onClick={() => handleDelete(prospect)}
                      >
                        {deletingId === prospect.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Aucune demande pour le moment</h2>
            <p>Une fois l’iframe publiée, les nouvelles demandes apparaîtront ici.</p>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

function SettingsPage() {
  const accountState = useProtectedAccount();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copier le code iframe");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const organization = accountState.account?.organization;

  useEffect(() => {
    if (!accountState.loading && !organization) {
      navigate("/onboarding");
    } else if (organization && !form) {
      setForm({
        name: organization.name,
        receptionEmail: organization.pendingReceptionEmail || organization.receptionEmail,
        senderName: organization.senderName,
        logoUrl: organization.logoUrl || "",
        primaryColor: organization.primaryColor,
        websiteUrl: organization.websiteUrl || "",
      });
    }
  }, [accountState.loading, organization, form]);

  const questionnaireUrl = organization
    ? `${window.location.origin}/q/${organization.slug}`
    : "";
  const iframeCode = `<iframe
  src="${questionnaireUrl}"
  title="Détermination des besoins en habilitation électrique"
  style="width:100%;min-height:920px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>`;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await updateOrganization(accountState.session, form);
      setMessage(result.message || "Les réglages sont enregistrés.");
      await accountState.refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function resendVerification() {
    setError("");
    setMessage("");
    try {
      const result = await resendReceptionVerification(accountState.session);
      setMessage(result.message);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function handleCopy() {
    await copyToClipboard(iframeCode);
    setCopyLabel("Code copié !");
    window.setTimeout(() => setCopyLabel("Copier le code iframe"), 1800);
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError("");
    setMessage("");
    try {
      const result = await uploadOrganizationLogo(accountState.session, file);
      setForm((current) => ({ ...current, logoUrl: result.logoUrl }));
      setMessage("Le logo est enregistré et déjà visible dans le questionnaire.");
      await accountState.refresh();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  if (accountState.loading || !organization || !form) return <LoadingClientArea />;

  return (
    <AdminLayout organization={organization} active="settings">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">Personnalisation</p>
          <h1>Réglages et iframe</h1>
        </div>
      </header>
      {new URLSearchParams(window.location.search).get("verification") ? (
        <div className="notice notice--warning">
          Un lien de vérification a été envoyé à l’adresse de réception.
        </div>
      ) : null}
      {new URLSearchParams(window.location.search).get("logo") === "error" ? (
        <div className="notice notice--warning">
          Le questionnaire a bien été créé, mais le logo n’a pas pu être importé. Vous pouvez
          réessayer ci-dessous.
        </div>
      ) : null}
      {message ? <div className="notice notice--success">{message}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}
      <div className="settings-grid">
        <section className="admin-panel">
          <h2>Identité du questionnaire</h2>
          <form className="form admin-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Nom de l’organisme</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Adresse de réception</span>
              <input
                type="email"
                value={form.receptionEmail}
                onChange={(event) => setForm({ ...form, receptionEmail: event.target.value })}
                required
              />
              <small>
                {organization.emailVerified && !organization.pendingReceptionEmail
                  ? "Adresse vérifiée."
                  : "La nouvelle adresse devra être vérifiée avant activation."}
              </small>
            </label>
            {organization.pendingReceptionEmail ? (
              <button className="text-button" type="button" onClick={resendVerification}>
                Renvoyer le lien de vérification
              </button>
            ) : null}
            <label className="field">
              <span>Nom affiché comme expéditeur</span>
              <input
                value={form.senderName}
                onChange={(event) => setForm({ ...form, senderName: event.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Logo de l’organisme</span>
              {form.logoUrl ? (
                <img className="logo-preview" src={form.logoUrl} alt="Logo actuellement utilisé" />
              ) : null}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingLogo}
                onChange={handleLogoUpload}
              />
              <small>
                {uploadingLogo ? "Import en cours…" : "PNG, JPG ou WebP, 1,5 Mo maximum."}
              </small>
            </label>
            <label className="field">
              <span>Couleur principale</span>
              <span className="color-field">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(event) => setForm({ ...form, primaryColor: event.target.value })}
                />
                <input
                  value={form.primaryColor}
                  onChange={(event) => setForm({ ...form, primaryColor: event.target.value })}
                  required
                />
              </span>
            </label>
            <label className="field">
              <span>Site internet</span>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
              />
            </label>
            <button className="button button--primary" type="submit">
              Enregistrer
            </button>
          </form>
        </section>
        <section className="admin-panel">
          <h2>Intégration sur votre site</h2>
          <p className="panel-copy">
            Copiez ce bloc dans un module HTML de votre back-office. Aucun compte technique n’est
            nécessaire.
          </p>
          <pre className="iframe-code">
            <code>{iframeCode}</code>
          </pre>
          <div className="button-row">
            <a className="button button--secondary" href={questionnaireUrl} target="_blank">
              Prévisualiser
            </a>
            <button className="button button--primary" type="button" onClick={handleCopy}>
              {copyLabel}
            </button>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function VerificationPage() {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token") || "",
    [],
  );
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    verifyReceptionEmail(token)
      .then(() => setState({ loading: false, error: "" }))
      .catch((error) => setState({ loading: false, error: error.message }));
  }, [token]);

  return (
    <AuthLayout
      title={state.loading ? "Vérification en cours…" : state.error ? "Lien invalide" : "Adresse vérifiée"}
      subtitle={
        state.loading
          ? "Veuillez patienter quelques secondes."
          : state.error || "Votre questionnaire est maintenant prêt à recevoir des demandes."
      }
    >
      {!state.loading && !state.error ? (
        <a className="button button--primary button--wide" href="/admin">
          Accéder à mon espace
        </a>
      ) : null}
    </AuthLayout>
  );
}

function LandingPage() {
  return (
    <AuthLayout
      title="Transformez votre site en outil de qualification"
      subtitle="Un questionnaire personnalisable, une iframe à copier et des prospects directement dans votre espace."
    >
      <div className="landing-actions">
        <a className="button button--primary" href="/inscription">
          Créer un accès
        </a>
        <a className="button button--secondary" href="/connexion">
          Se connecter
        </a>
      </div>
    </AuthLayout>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/u, "") || "/";

  if (path.startsWith("/q/")) return <PublicQuestionnaire />;
  if (path === "/inscription") return <AuthForm mode="signup" />;
  if (path === "/connexion") return <AuthForm mode="login" />;
  if (path === "/mot-de-passe-oublie") return <PasswordPage />;
  if (path === "/reinitialiser-mot-de-passe") return <PasswordPage recovery />;
  if (path === "/onboarding") return <OnboardingPage />;
  if (path === "/admin/reglages") return <SettingsPage />;
  if (path === "/admin") return <DashboardPage />;
  if (path === "/verification-email") return <VerificationPage />;
  return <LandingPage />;
}
