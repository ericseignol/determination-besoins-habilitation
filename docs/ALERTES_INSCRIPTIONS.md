# Alertes commerciales HabiliCible

## Quand une notification est-elle envoyée ?

- **Demande d'accès pilote (site Formid'Alpes)** : le formulaire Formspree envoie déjà un e-mail à `formidalpes@gmail.com` ; aucun changement apporté à ce circuit.
- **Nouvel organisme dans HabiliCible** : `POST /api/account` déclenche un e-mail interne via la même configuration Brevo que les questionnaires, uniquement **après** la création réussie d'un organisme et de son profil administrateur. La revendication réussie d'un organisme réservé suit le même chemin.
- **Simple création d'utilisateur Supabase Auth sans onboarding finalisé** : aucun e-mail. Cette première version privilégie les espaces réellement configurés, et non les connexions ou visites.

La réception va par défaut à `formidalpes@gmail.com`. Elle peut être personnalisée avec `PLATFORM_ALERT_EMAIL` côté serveur Vercel (production et/ou prévisualisation). Aucune nouvelle clé Brevo n'est nécessaire si `BREVO_API_KEY` et `BREVO_SENDER_EMAIL` sont déjà configurées.

Les comptes utilisés pour les tests internes (`eric.seignol@gmail.com`, `formidalpes@gmail.com`) et l'organisme `formid-alpes` n'émettent pas de notification commerciale.

## Sûreté

- Aucune clé n'est exposée au navigateur ni enregistrée dans GitHub.
- Le message utilise des données échappées en HTML ; seul le compte de réception interne est destinataire.
- L'envoi Brevo est limité à 8 secondes et ses erreurs sont journalisées. **Une panne de notification ne bloque jamais la création de l'espace organisme.**
- Aucun prospect ni organisme n'est créé pour tester ce mécanisme en production.
- Le suivi des organismes créés reste disponible dans les tables `public.organizations` et `public.profiles` si le courriel n'arrive pas.

## Vérifications avant mise en production

1. Exécuter les tests `pnpm test` et le build `pnpm build`.
2. Vérifier la prévisualisation Vercel et ses variables Brevo.
3. Effectuer une inscription de test contrôlée avec une adresse distincte, puis vérifier la réception de l'alerte à `formidalpes@gmail.com`.
4. Contrôler que l'inscription de l'organisme fonctionne même si Brevo refuse l'envoi (par exemple IP non reconnue).
5. Vérifier ensuite le déploiement du commit sur la production.

**Attention :** l'activation n'est pas démontrée tant qu'un e-mail réel n'a pas été reçu. Des adresses IP Vercel peuvent encore être refusées par le réglage « IP autorisées » de Brevo.

## Vérifier la performance ASFOR

Les questionnaires publics ASFOR sont stockés sous `organizations.slug = 'asfor'` dans `public.prospects`, `public.questionnaire_submissions` et `public.email_logs`.

Une consultation en lecture seule permet de calculer les demandes par organisme :

```sql
select
  o.slug,
  count(distinct p.id) as demandes,
  count(distinct q.id) as questionnaires,
  max(p.created_at) as derniere_demande
from public.organizations o
left join public.prospects p on p.organization_id = o.id
left join public.questionnaire_submissions q on q.organization_id = o.id
where o.slug = 'asfor'
group by o.slug;
```

Le tableau ne mesure pas les consultations de l'iframe ni les abandons avant soumission. Les enregistrements de test doivent être séparés des prospects réels pour calculer le taux de conversion.
