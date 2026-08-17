# Assistant de qualification en habilitation électrique

Cette version transforme l’ancienne page statique et son envoi EmailJS en une application
multi-organismes prête pour Vercel.

Le questionnaire reste public et intégrable par iframe. Les données, le destinataire et la clé
Brevo restent côté serveur.

> **Guide utilisateur ASFOR :** suivre [`docs/GUIDE-ASFOR.md`](docs/GUIDE-ASFOR.md). L’organisme
> client n’a besoin d’aucun accès à GitHub, Vercel, Supabase ou Brevo.

## Ce qui est déjà opérationnel

- parcours public par organisme : `/q/:slug` ;
- reprise des 18 questions et de leurs embranchements métier ;
- personnalisation par organisme : nom, logo, couleur et site internet ;
- validation dans le navigateur et à nouveau dans l’API ;
- stockage du prospect et du détail des réponses dans Supabase ;
- notification Brevo au destinataire de l’organisme ;
- `Reply-To` réglé sur l’adresse du prospect ;
- journal des tentatives d’e-mail ;
- nouvelle tentative sans doublon après un échec Brevo ;
- piège anti-robot, contrôle d’origine et limitation par empreinte d’adresse IP ;
- politiques RLS séparant les données de chaque organisme ;
- succès affiché uniquement lorsque le stockage et l’envoi sont confirmés ;
- inscription et connexion des organismes avec Supabase Auth ;
- onboarding autonome : nom, slug, destinataire, nom d’expéditeur, logo et couleur ;
- vérification de l’adresse de réception ;
- espace prospects isolé par organisme ;
- import direct du logo PNG, JPG ou WebP ;
- suppression d’une demande par l’administrateur de l’organisme ;
- génération automatique du code iframe ;
- récupération de mot de passe.

La facturation Stripe, les exports et les statistiques avancées ne sont pas encore inclus.

## Architecture

```text
Site de l’organisme
  └─ iframe /q/asfor
       └─ application React sur Vercel
            ├─ GET /api/organizations?slug=asfor
            ├─ POST /api/prospects
            │    ├─ Supabase : prospect + réponses + journal
            │    └─ Brevo : notification au destinataire vérifié
            └─ espace client
                 ├─ Supabase Auth
                 ├─ POST/PATCH /api/account
                 └─ GET /api/admin-prospects
```

Le navigateur ne reçoit ni la clé Brevo, ni la clé `service_role` Supabase, ni l’adresse de
réception configurée pour l’organisme.

## Structure du projet

```text
api/
  account.js             Onboarding et réglages de l’organisme
  admin-prospects.js     Prospects de l’organisme connecté
  logo.js                Import sécurisé du logo dans Supabase Storage
  organizations.js       Configuration publique d’un organisme
  prospects.js           Validation, stockage et envoi de la demande
  verify-reception-email.js Vérification du destinataire
server/
  auth.js                Validation des sessions Supabase Auth
  email.js               Construction et envoi du message Brevo
  security.js            Origine, anti-abus et empreinte IP
  supabase.js            Client Supabase réservé au serveur
  validation.js          Validation stricte de la charge utile
src/
  data/questions.js      Arbre métier du questionnaire
  lib/                   Logique réutilisable côté interface
  App.jsx                Parcours public multi-étapes
supabase/
  schema.sql             Tables, index, fonctions et RLS
  seed.sql               Premier organisme ASFOR
tests/                   Tests de la logique métier et de la validation
```

## 1. Préparer Supabase

1. Créer un projet Supabase appartenant au compte qui exploitera le service.
2. Ouvrir **SQL Editor**.
3. Exécuter tout le contenu de [`supabase/schema.sql`](supabase/schema.sql).
4. Exécuter [`supabase/seed.sql`](supabase/seed.sql).

Le schéma crée également le bucket public `organization-assets`. Les fichiers y sont écrits
uniquement par l’API serveur authentifiée ; le navigateur ne reçoit aucune clé privilégiée.

Le fichier d’initialisation crée ASFOR avec :

```text
slug               asfor
nom                ASFOR
adresse de réception formation@asfor.net
site               https://www.asfor.net
```

La `service_role key` se trouve dans les réglages API Supabase. C’est un secret absolu : elle ne
doit être placée que dans les variables d’environnement Vercel.

### Ajouter un autre organisme

```sql
insert into public.organizations (
  slug,
  name,
  reception_email,
  logo_url,
  primary_color,
  website_url
)
values (
  'centre-exemple',
  'Centre Exemple',
  'formation@centre-exemple.fr',
  'https://centre-exemple.fr/logo.png',
  '#155e75',
  'https://centre-exemple.fr'
);
```

Son questionnaire sera alors disponible sur `/q/centre-exemple`.

## 2. Préparer Brevo

1. Créer ou utiliser un compte Brevo appartenant à l’exploitant du service.
2. Vérifier le domaine ou l’adresse qui servira d’expéditeur.
3. Créer une clé API dédiée à l’application.
4. Conserver la clé uniquement dans le gestionnaire de secrets Vercel.

L’adresse d’expédition Brevo peut être commune à tous les organismes. L’adresse de réception est
définie dans `organizations.reception_email`, et l’adresse du prospect est utilisée en
`Reply-To`.

## 3. Configurer les variables

Copier `.env.example` vers `.env.local` pour le développement, puis renseigner :

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
PUBLIC_APP_URL
RATE_LIMIT_SECRET
```

Le navigateur utilise également les deux valeurs publiques suivantes pour Supabase Auth :

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

`RATE_LIMIT_SECRET` doit être une longue valeur aléatoire propre au projet. Elle sert à produire une
empreinte irréversible de l’adresse IP ; l’adresse brute n’est pas enregistrée.

Variables facultatives :

```text
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MINUTES=15
VITE_DEFAULT_ORGANIZATION_SLUG=asfor
```

Seule la variable préfixée par `VITE_` est publique. Aucun secret ne doit porter ce préfixe.

## 4. Développer et vérifier localement

Prérequis : Node.js 20.19 ou plus récent et pnpm.

```bash
pnpm install
pnpm test
pnpm build
```

`pnpm dev` affiche l’interface seule. Pour tester aussi les fonctions `/api` avec les variables
locales, utiliser Vercel CLI :

```bash
pnpm dlx vercel dev
```

Puis ouvrir :

```text
http://localhost:3000/q/asfor
```

## 5. Déployer sur Vercel

1. Placer ce projet dans un dépôt GitHub.
2. Dans le compte Vercel destiné au produit, choisir **Add New → Project**.
3. Importer le dépôt.
4. Conserver le framework détecté **Vite** et la commande de build `pnpm build`.
5. Dans **Settings → Environment Variables**, ajouter toutes les variables serveur listées plus
   haut pour `Production` et, si nécessaire, `Preview`.
6. Déployer.
7. Tester une vraie soumission sur :

```text
https://votre-projet.vercel.app/q/asfor
```

Vérifier les trois résultats :

- le message final apparaît dans le questionnaire ;
- le prospect est présent dans Supabase ;
- l’e-mail arrive sur `formation@asfor.net` et le bouton **Répondre** cible bien le prospect.

## 6. Intégrer le questionnaire sur le site ASFOR

Une fois le test Vercel validé, remplacer l’ancienne iframe GitHub Pages par :

```html
<iframe
  src="https://votre-projet.vercel.app/q/asfor"
  title="Détermination des besoins en habilitation électrique"
  style="width: 100%; min-height: 920px; border: 0;"
  loading="lazy"
></iframe>
```

Si la hauteur fixe devient gênante, une communication `postMessage` pourra être ajoutée dans une
évolution ultérieure pour ajuster automatiquement la hauteur de l’iframe.

## Comptes organismes

Le parcours autonome est disponible sur `/inscription`. Après confirmation de son adresse Supabase
Auth, l’utilisateur est dirigé vers `/onboarding`. L’API crée l’organisme et le rattache comme
administrateur. Aucun identifiant d’organisme envoyé par le navigateur n’est accepté pour consulter
les prospects : l’API retrouve toujours l’organisme depuis la session authentifiée.

Un organisme pré-réservé par l’exploitant, comme ASFOR, peut être récupéré uniquement par un compte
dont l’adresse confirmée correspond exactement à son adresse de réception et tant qu’aucun
administrateur n’y est déjà rattaché.

Lorsque l’adresse de réception diffère de l’adresse de connexion confirmée, un lien valable
24 heures est envoyé à la nouvelle adresse. Le changement ne devient actif qu’après validation.

## Comportement en cas d’erreur

- Si la validation ou Supabase échoue, aucun succès n’est affiché.
- Si le stockage réussit mais que Brevo échoue, la demande reste enregistrée et la tentative est
  marquée `failed`.
- Le visiteur peut réessayer avec le même identifiant de soumission : l’API tente à nouveau l’e-mail
  sans créer un second prospect.
- Si l’e-mail a déjà été envoyé, la même soumission retourne directement un succès.

Cette stratégie privilégie la conservation du prospect même lors d’une panne temporaire du
fournisseur de messagerie.

## Points de sécurité à conserver

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` ou `BREVO_API_KEY` dans le code client.
- Ne jamais ajouter ces secrets à Git.
- Maintenir la RLS active sur toutes les tables.
- Créer une clé Brevo dédiée et la renouveler si elle a été exposée.
- Limiter l’accès aux projets Vercel, Supabase et Brevo et activer la double authentification.
- Définir une durée de conservation des prospects et supprimer les données devenues inutiles.
- Ajouter, avant commercialisation, les mentions de confidentialité et le mécanisme d’exercice des
  droits adaptés à l’activité.

## Commandes de contrôle

```bash
pnpm test
pnpm build
```

Les tests vérifient notamment l’intégrité de l’arbre des 18 questions, plusieurs parcours
représentatifs, la route multi-organismes et les validations serveur.
