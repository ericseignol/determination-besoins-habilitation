# Guide ASFOR — installer et gérer le questionnaire

L’ASFOR n’a besoin d’aucun compte GitHub, Vercel, Supabase ou Brevo. La partie technique est gérée
par la plateforme **Qualification Habilitations**.

Pour utiliser l’outil, il suffit de :

1. créer le compte ASFOR ;
2. personnaliser le questionnaire ;
3. vérifier l’adresse qui recevra les demandes ;
4. copier l’iframe dans le back-office du site.

## 1. Créer le compte ASFOR

Ouvrir le lien transmis par le fournisseur :

```text
https://qualification-habilitations.vercel.app/inscription
```

Saisir :

- l’adresse `formation@asfor.net`, qui permet de récupérer l’espace ASFOR déjà réservé ;
- un mot de passe d’au moins 10 caractères ;
- la confirmation du mot de passe.

Cliquer sur **Créer mon compte**.

Un message de confirmation est envoyé à l’adresse indiquée. Ouvrir ce message et cliquer sur le
lien de confirmation, puis se connecter ici :

```text
https://qualification-habilitations.vercel.app/connexion
```

## 2. Configurer l’organisme

Lors de la première connexion, l’écran **Configurez votre organisme** s’affiche.

Renseigner :

| Champ | Valeur conseillée pour l’ASFOR |
|---|---|
| Nom de l’organisme | `ASFOR` |
| Identifiant du questionnaire | `asfor` |
| Adresse qui recevra les demandes | `formation@asfor.net` |
| Nom affiché comme expéditeur | `ASFOR` |
| Logo | choisir le fichier PNG, JPG ou WebP du logo ASFOR |
| Couleur principale | couleur de la charte ASFOR |
| Site internet | `https://www.asfor.net` |

L’identifiant `asfor` ne pourra pas être utilisé par un autre organisme.

### Adresse d’expédition

Dans les messages reçus par l’ASFOR :

- le **nom affiché** sera `ASFOR` ;
- l’adresse technique d’expédition appartiendra à la plateforme ;
- le bouton **Répondre** utilisera directement l’adresse du prospect.

L’ASFOR n’a donc aucun compte de messagerie technique à configurer.

## 3. Vérifier l’adresse de réception

Si l’adresse de réception est différente de l’adresse utilisée pour créer le compte, un message de
vérification est envoyé à cette nouvelle adresse.

1. Ouvrir le message reçu.
2. Cliquer sur **Confirmer cette adresse**.
3. Revenir dans l’espace ASFOR.

Le questionnaire devient actif après cette vérification.

Si le message n’arrive pas :

1. vérifier les courriers indésirables ;
2. ouvrir **Réglages et iframe** ;
3. contrôler l’adresse saisie ;
4. cliquer sur **Renvoyer le lien de vérification**.

## 4. Récupérer le code iframe

Après connexion :

1. ouvrir **Réglages et iframe** ;
2. vérifier l’aperçu du questionnaire ;
3. cliquer sur **Copier le code iframe**.

Le code généré ressemblera à ceci :

```html
<iframe
  src="https://qualification-habilitations.vercel.app/q/asfor"
  title="Détermination des besoins en habilitation électrique"
  style="width:100%;min-height:920px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin">
</iframe>
```

Ce code ne contient ni mot de passe ni clé secrète. Il peut être placé sur la page publique du site.

## 5. Intégrer l’iframe dans le back-office ASFOR

Dans le back-office du site :

1. ouvrir la page où doit apparaître le questionnaire ;
2. modifier le bloc HTML personnalisé ;
3. supprimer l’ancienne iframe GitHub Pages ;
4. coller le nouveau code généré ;
5. enregistrer ou publier la page ;
6. vider le cache du site si nécessaire ;
7. tester la page sur ordinateur et téléphone.

L’ancienne adresse ne doit plus apparaître :

```text
https://ericseignol.github.io/determination-besoins-habilitation/
```

La nouvelle iframe doit utiliser :

```text
https://qualification-habilitations.vercel.app/q/asfor
```

## 6. Tester sans créer de faux prospect

Avant l’ouverture au public :

1. ouvrir le questionnaire depuis le site ASFOR ;
2. utiliser des coordonnées clairement identifiées comme test ;
3. terminer le questionnaire ;
4. vérifier que le message de succès apparaît ;
5. vérifier la réception du message sur `formation@asfor.net` ;
6. cliquer sur **Répondre** et vérifier que le destinataire est bien l’adresse du testeur ;
7. supprimer ensuite la demande de test avec le bouton **Supprimer** de l’espace prospects.

Ne jamais utiliser les coordonnées d’une personne réelle pour une recette technique.

## 7. Consulter les prospects

Se connecter à :

```text
https://qualification-habilitations.vercel.app/connexion
```

La page **Vos prospects** présente :

- la date de la demande ;
- le nom du contact ;
- l’entreprise ;
- l’adresse e-mail et le téléphone ;
- les indices d’habilitation identifiés.

Chaque organisme ne peut consulter que ses propres demandes.

## 8. Modifier le logo, les couleurs ou l’adresse

Dans **Réglages et iframe**, l’administrateur ASFOR peut modifier :

- le nom de l’organisme ;
- l’adresse de réception ;
- le nom affiché comme expéditeur ;
- le logo ;
- la couleur principale ;
- l’adresse du site.

Le logo se choisit directement sur l’ordinateur. Il n’est pas nécessaire de connaître son adresse
internet. Les formats PNG, JPG et WebP sont acceptés, dans la limite de 1,5 Mo.

Une nouvelle adresse de réception ne devient active qu’après vérification. Pendant cette attente,
l’ancienne adresse vérifiée continue de recevoir les demandes.

Une modification du logo ou des couleurs est automatiquement visible dans l’iframe. Il n’est pas
nécessaire de modifier à nouveau le back-office.

## 9. Mot de passe oublié

Depuis la page de connexion :

1. cliquer sur **Mot de passe oublié ?** ;
2. saisir l’adresse du compte ASFOR ;
3. ouvrir le message reçu ;
4. choisir un nouveau mot de passe.

Le fournisseur de l’application ne connaît et ne conserve jamais le mot de passe de l’ASFOR.

## 10. Informations reçues par le fournisseur

Les demandes ne sont jamais envoyées par e-mail au fournisseur de l’application :

- aucune copie vers une adresse Formid’alpes ;
- aucun destinataire caché ;
- aucune utilisation de l’adresse Formid’alpes comme `Reply-To` ;
- destinataire configuré par l’ASFOR ;
- `Reply-To` positionné sur le prospect.

La plateforme conserve techniquement les données nécessaires à l’affichage de l’espace prospects et
à l’envoi des notifications. Son exploitant doit limiter les accès aux opérations de maintenance et
respecter les engagements de confidentialité et de protection des données prévus avec l’ASFOR.

## Assistance

Pour une demande d’assistance, l’ASFOR doit communiquer :

- le nom de l’organisme ;
- l’écran concerné ;
- la date et l’heure approximatives du problème ;
- une capture d’écran ne montrant ni mot de passe ni donnée personnelle inutile.

Ne jamais transmettre de mot de passe ou de clé de sécurité.
