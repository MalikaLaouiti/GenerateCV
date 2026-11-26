# Documentation technique

## 1. Principe général

Le formulaire et l'aperçu sont reliés **uniquement par des attributs `data-*`**. Le JavaScript n'a aucune connaissance des champs en dur : ajouter un champ revient à ajouter deux balises (une dans le formulaire, une dans l'aperçu) avec la même clé.

```
 Formulaire (data-field)  ──readState()──▶  état (objet JS)  ──render()──▶  Aperçu (data-out…)
                                                   │
                                                   └──save()──▶ localStorage (immédiat)
                                                          └────▶ api.php ──▶ PostgreSQL (après 1 s d'inactivité)
```

À chaque frappe : `render()` met l'aperçu à jour et renvoie l'état, puis `save(état)` l'écrit tout de suite dans `localStorage` et programme l'envoi au serveur (voir §3, Sauvegarde et §8, Backend PHP).

## 2. HTML : conventions d'attributs

### Côté formulaire

| Attribut | Où | Rôle |
|---|---|---|
| `data-field="clé"` | `<input>`, `<textarea>` | Champ lu par le script. La clé relie le champ à l'aperçu. |
| `data-list="nom"` | `<fieldset>` | Liste répétable (`experiences`, `formations`, `projets`). Contient des `<details class="entry">`. |
| `data-action="add"` + `data-target="nom"` | `<button>` | Ajoute une entrée à la liste `nom`. |
| `data-action="remove"` | `<button>` dans une `.entry` | Supprime l'entrée (ou la vide s'il n'en reste qu'une). |
| `data-action="print"` | `<button>` | Appelle `window.print()`. |
| `data-action="pdf"` | `<button>` | Envoie les dernières modifications au serveur, puis télécharge `api.php?a=pdf` (bouton « PDF recrutement »). |
| `data-action="vis"` | `<button>` (injecté par le JS) | Bascule le statut `view` / `hidden` d'un champ ou d'une entrée de liste (voir « Statut affiché / masqué »). |
| `data-action="logout"` | `<button>` | Efface la copie locale, appelle `api.php?a=logout`, redirige vers `login.html`. |
| `data-action="reset"` | `<button>` | Efface formulaire et sauvegarde (après confirmation). |
| `data-action="theme"` | `<button>` | Bascule le thème clair / sombre (voir §3, Thème). |
| `data-action="toggle-all"` + `data-target="id"` | `<button>` | Ouvre ou ferme tous les `details.more` de la section `#id`. |

### Côté aperçu

| Attribut | Rôle |
|---|---|
| `data-out="clé"` | Le texte de l'élément est remplacé par la valeur du champ. Si le champ est vide, le texte d'origine (placeholder `[...]`) est restauré. |
| `data-out-href="clé"` | Met à jour le `href` du lien (voir `hrefFor`). Si la valeur est invalide ou vide, le `href` d'origine est conservé. |
| `data-out-badges="clé"` | Liste `<ul>` : la valeur est découpée sur les virgules, un `<li>` est créé par élément. La syntaxe `Nom:80` (ou `Nom:80%`) crée un `<li class="lvl">` avec la variable CSS `--lvl` (0-100) pour la barre de niveau. |
| `details.more` | Bloc « Voir les détails » dépliable (natif) dans les expériences, formations et projets. |
| `.is-empty` | Ajoutée automatiquement aux éléments sans valeur saisie ; masquée à l'impression. |
| `data-out-photo` | Conteneur de la photo (avatar). |
| `data-preview-list="nom"` | Conteneur dont les enfants sont clonés/supprimés pour suivre le nombre d'entrées de la liste `nom`. Le premier enfant sert de modèle. |

### Clés de champs

- **Profil** : `photo`, `nom`, `specialite`, `presentation`
- **Coordonnées** : `email`, `telephone`, `ville`, `linkedin`, `github`, `portfolio`
- **Compétences** : `competences-techniques`, `langages`, `outils`, `bases`, `transversales`, `langues`, `autres`
- **experiences** : `poste`, `entreprise`, `periode`, `lieu`, `description`, `realisations`
- **formations** : `diplome`, `etablissement`, `ville-formation`, `annees`, `description`
- **projets** : `titre`, `description`, `lien`
- **Pied de page** : `pied`

### Onglets mobiles

Deux boutons radio (`#vue-form`, `#vue-apercu`) et des `<label>` pilotent l'affichage du formulaire ou de l'aperçu en **CSS seul** (sélecteur `:checked`), sans JavaScript.

## 3. JavaScript ([script.js](script.js))

Tout le code est dans une IIFE en mode strict : aucune variable globale.

### Constantes et variables d'état

| Nom | Description |
|---|---|
| `STORAGE_KEY` | `'cv-interactif-v1'`, clé `localStorage` (copie locale du CV). |
| `DIRTY_KEY` | `'cv-interactif-dirty'` : présent tant que des modifications locales n'ont pas été confirmées par le serveur. |
| `IDLE_MS` | `1000` : délai d'inactivité avant l'envoi au serveur. |
| `PHOTO_MAX` | `400` : taille maximale (px) du plus grand côté de la photo. |
| `form`, `sheet`, `avatar` | Éléments DOM principaux (`#cv-form`, `#cv`, `[data-out-photo]`). |
| `avatarDefault` | HTML initial de l'avatar (icône), restauré sans photo. |
| `photoData` | Photo courante, en data URL JPEG (chaîne vide si aucune). |
| `saveTimer` | Identifiant du timer d'envoi différé au serveur. |
| `formLists` | Par nom de liste : `{ el, template, initial, label }` (élément, modèle d'entrée vide, nombre initial d'entrées, libellé sans numéro). |
| `previewLists` | Par nom de liste : `{ el, template }` côté aperçu. |

Les modèles (`template`) sont **clonés au chargement**, avant tout remplissage, pour obtenir des entrées vides.

### Fonctions utilitaires

- `$all(root, sel)` : `querySelectorAll` renvoyant un vrai tableau.
- `inList(el, attr)` : vrai si `el` est à l'intérieur d'un élément portant l'attribut `attr`. Sert à séparer les champs « simples » des champs appartenant à une liste.
- `safeUrl(value)` : normalise une URL. Ajoute `https://` si aucun schéma n'est donné, et **n'accepte que `http:` et `https:`** ; renvoie `''` sinon (protection contre `javascript:` etc.).
- `hrefFor(key, value)` : construit le lien selon la clé : `mailto:` pour `email` (si le format est valide), `tel:` pour `telephone` (chiffres et `+` conservés), `safeUrl` pour les autres.

### Lecture

- `readFields(scope, excludeLists)` : renvoie `{ clé: valeur }` pour tous les `[data-field]` de `scope` (hors champs fichier). Avec `excludeLists = true`, ignore ceux situés dans une liste.
- `readState()` : renvoie l'état complet `{ fields, lists, photo }`.

### Rendu

- `fillScope(scope, data, topLevel)` : applique `data-out`, `data-out-href` et `data-out-badges` dans `scope`. Le texte d'origine est mémorisé (`dataset.def`, `dataset.defHref`, `dataset.defBadges`) pour être restauré quand un champ est vidé. Avec `topLevel = true`, les éléments situés dans une liste d'aperçu sont ignorés (ils sont traités par `renderLists`). Le contenu est écrit via `textContent` : pas d'injection HTML.
- `markEmpty()` : voir « Détails dépliables et timeline ».
- `renderPhoto()` : affiche l'image (avec `alt` personnalisé) ou restaure l'avatar par défaut avec ses attributs ARIA.
- `renderLists(state)` : ajuste le nombre d'enfants de chaque liste d'aperçu (clonage du modèle ou suppression) puis remplit chaque ligne.
- `render()` : enchaîne `fillScope`, `renderPhoto`, `renderLists`, `markEmpty` et renvoie l'état.

### Sauvegarde

- `store(clé, valeur)` : écrit ou supprime (valeur `null`) une clé `localStorage`, erreurs ignorées (stockage plein ou désactivé).
- `save(state)` : écrit l'état dans `localStorage` **de façon synchrone**, pose `DIRTY_KEY`, puis (re)programme `push(state)` après `IDLE_MS` d'inactivité (anti-rebond).
- `push(state, keepalive)` : envoie l'état au serveur (`PUT api.php?a=cv`). Si la réponse est OK **et** que la copie locale n'a pas changé pendant l'envoi, retire `DIRTY_KEY`. Une réponse 401 redirige vers `login.html`. Hors ligne, `DIRTY_KEY` reste posée.
- `api(méthode, action, corps)` : petit `fetch` vers `api.php?a=action` ; renvoie le JSON, ou `null` en cas d'erreur (401 : redirection vers `login.html`).
- `load()` : lit la copie locale, `null` en cas d'absence ou d'erreur.
- `refresh()` : `save(render())`. Utilisé pour les actions ponctuelles (ajout, suppression, photo).
- Événement `pagehide` : si `DIRTY_KEY` est posée, envoie immédiatement l'état avec `keepalive` (fermeture de l'onglet avant la fin du délai).

### Listes répétables

- `renumber(name)` : renomme les `<summary>` (« Expérience 1 », « Expérience 2 »…).
- `addEntry(name, open)` : clone le modèle, l'insère avant le bouton « Ajouter » et renumérote.
- `ensureCount(name, n)` : ajoute ou retire des entrées pour en avoir exactement `n`.

### Restauration

- `applyState(state)` : remplit le formulaire depuis un état sauvegardé. Vérifie les types (chaînes uniquement), crée les entrées de liste nécessaires (au moins une) et n'accepte la photo que si elle commence par `data:image/`.

### Photo

- `handlePhoto(file)` : si le fichier n'est pas une image, supprime la photo. Sinon lit le fichier (`FileReader`), le redimensionne sur un `<canvas>` (côté max `PHOTO_MAX`, jamais agrandi) et l'enregistre en JPEG qualité 0,85.

### Statut affiché / masqué dans le PDF

Chaque champ peut être exclu du PDF sans perdre sa valeur. Les boutons sont **injectés par le JS** au chargement (avant la capture des modèles de listes), le HTML n'a donc pas à les contenir.

- `REQUIRED = ['nom', 'telephone', 'specialite', 'email']` : champs obligatoires, sans bouton, toujours présents dans le PDF.
- `makeVis(classe, avecTexte)` : crée un `<button data-action="vis">` avec une icône œil (`fa-eye` / `fa-eye-slash`).
- `setVis(btn, hidden)` : pose `dataset.status` (`'view'` ou `'hidden'`), `aria-pressed`, l'icône et le libellé (« Affiché / Masqué dans le PDF »). L'état est porté par le bouton lui-même, y compris dans les entrées clonées.
- Un bouton `.vis` avec `data-key="clé"` est ajouté à côté du libellé de chaque champ simple non obligatoire (photo, présentation, ville, LinkedIn, GitHub, portfolio, catégories de compétences, pied de page). Un bouton `.vis-entry` est ajouté avant « Supprimer » dans chaque `.entry`.
- `markOff(state)` : appelée par `render()` ; pose la classe `.is-off` sur les éléments masqués de l'aperçu (pour un champ simple : le `li` ou la `.card` ou le pied de page qui le contient, sinon l'élément lui-même ; pour une liste : l'entrée d'aperçu correspondante). Les clés sont validées par `/^[\w-]+$/` avant d'entrer dans un sélecteur.
- `markEmpty()` ignore les éléments situés dans un `.is-off` : si tout le contenu d'une section est masqué, son titre disparaît aussi.
- CSS (`style.css`, fin de fichier) : `#cv .is-off` est estompé et en niveaux de gris à l'écran (`@media screen`), et `display: none` à l'impression (`@media print`).

### Événements

| Événement | Comportement |
|---|---|
| `input` sur le formulaire | `save(render())` (champ fichier ignoré). |
| `change` sur le formulaire | Si champ fichier : `handlePhoto`. |
| `submit` sur le formulaire | `preventDefault()`. |
| `click` sur le document | Délégation : traite `data-action` = `add`, `remove`, `vis`, `toggle-all`, `theme`, `pdf`, `print`, `reset`, `logout`. |
| `beforeprint` / `afterprint` sur `window` | Ouvre puis restaure les `details.more`. |

Les clics sont écoutés au niveau du document (délégation), donc les entrées créées dynamiquement fonctionnent sans ré-attacher d'écouteurs.

### Thème

- Initialisation : un script inline dans le `<head>` de `index.html` pose `document.documentElement.dataset.theme` (attribut `data-theme` de `<html>`) avant l'affichage, pour éviter un flash. Ordre de priorité : `localStorage['cv-theme']`, puis `prefers-color-scheme`, puis `light`.
- Bascule : le clic sur `data-action="theme"` inverse `dataset.theme` et l'enregistre avec `localStorage.setItem('cv-theme', …)`. Le CSS réagit via les sélecteurs `[data-theme="dark"]`.

### Détails dépliables et timeline

- `toggle-all` : si au moins un `details.more` de la section est fermé, tous s'ouvrent ; sinon tous se ferment. Le libellé du bouton devient « Tout replier » / « Tout déplier ».
- `beforeprint` / `afterprint` : les `details.more` fermés sont ouverts avant l'impression puis refermés ensuite (un `<details>` fermé masquerait son contenu).
- `markEmpty()` : ajoute `.is-empty` aux blocs de l'aperçu sans valeur saisie (contacts, cartes, sections, pied de page, méta, etc.) ; appelée par `render()`.
- La timeline est du HTML + CSS (voir §5) ; le JS ne fait que cloner les entrées via `renderLists`.

### Compétences : filtres et barres de niveau

- Au chargement, une barre `.filters` est générée avant `#competences .grid` : un bouton « Tout » plus un bouton par catégorie (titre `h3` de chaque carte). `aria-pressed` indique le filtre actif ; les autres cartes reçoivent `hidden`.
- Un `IntersectionObserver` (seuil 0,3) ajoute la classe `.seen` à la carte quand elle devient visible, ce qui anime les barres (`--lvl`). La classe est posée sur la carte (nœud stable) pour que l'animation ne se rejoue pas à chaque frappe. Sans `IntersectionObserver`, `.seen` est ajoutée directement.

### Initialisation

```js
applyState(load());   // affichage instantané depuis la copie locale
render();
api('GET', 'cv').then(function (s) {
  if (DIRTY_KEY posée) push(readState());   // modifications locales non envoyées : elles priment
  else if (s) { applyState(s); /* copie locale mise à jour */ }
});
```

Règle de synchronisation : le serveur fait foi, sauf si des modifications locales n'ont pas encore été envoyées. Si deux appareils modifient le même CV hors ligne, le dernier à se synchroniser écrase l'autre (pas de fusion).

## 4. Format de sauvegarde

Le même objet JSON sert de copie locale (`localStorage`, clé `cv-interactif-v1`) et de contenu de la colonne `cv.data` en base (voir §8). Le thème est stocké à part, dans `cv-theme` (`"light"` ou `"dark"`), uniquement dans le navigateur.

```json
{
  "fields": { "nom": "…", "email": "…", "langages": "HTML, CSS" },
  "lists": {
    "experiences": [ { "poste": "…", "entreprise": "…", "periode": "…",
                       "lieu": "…", "description": "…", "realisations": "…" } ],
    "formations":  [ { "diplome": "…", "etablissement": "…", "ville-formation": "…",
                       "annees": "…", "description": "…" } ],
    "projets":     [ { "titre": "…", "description": "…", "lien": "…" } ]
  },
  "photo": "data:image/jpeg;base64,…",
  "status": { "github": "hidden", "bases": "hidden" }
}
```

Le champ `status` ne contient que les champs simples **masqués** (clé → `"hidden"`) ; l'absence de clé signifie « affiché ». Pour les listes, une entrée masquée porte `"status": "hidden"` dans son objet (ex. `{ "poste": "…", "status": "hidden" }`), ce qui garde le statut attaché à la bonne entrée quand on en supprime une autre. `nom`, `telephone`, `specialite` et `email` ne sont jamais masquables (ignorés aussi côté serveur).

Si le format change de façon incompatible, incrémenter le suffixe de la clé (`-v2`).

## 5. CSS ([style.css](style.css))

Le fichier est organisé en sections numérotées :

1. Variables (`:root`) : palette (violet, lavande, cyan), `--bg`, `--surface`, `--text`, `--radius`, ombres, police.
2. Base
3. Barre d'application et onglets mobiles
4. Layout : mobile = un volet à la fois ; à partir de `64em` formulaire et aperçu côte à côte
5. Formulaire
6. Boutons (`.btn--primary`, `--ghost`, `--add`, `--danger`)
7. CV : en-tête (`.hero`, `.avatar`, `.contact`)
8. CV : sections et cartes (`.section`, `.card`, `.grid`)
9. Badges
10. Timeline interactive : ligne (`border-left`), points (`::before`), détails dépliables `.more`, `:has(.more[open])`, filtres `.filters`, sommaire `.toc`
11. Pied de CV (thème sombre : sélecteurs `[data-theme="dark"]`)
12. Animations
13. Responsive (`40em`, `52em`, `64em`, `79em`)
14. Mouvement réduit (`prefers-reduced-motion`)
15. Impression A4 (`@media print`) : seul `#cv` est imprimé

Les couleurs et dimensions se personnalisent en modifiant les variables de `:root`.

## 6. Comment étendre le projet

**Ajouter un champ simple** (ex. « Site web ») :

1. Formulaire : `<input type="text" data-field="site">`
2. Aperçu : `<span data-out="site">[Votre site]</span>`

Aucun changement JavaScript n'est nécessaire.

**Ajouter une nouvelle liste répétable** (ex. « Langues détaillées ») :

1. Formulaire : `<fieldset data-list="nom">` avec au moins un `<details class="entry">` (contenant un `<summary>`, des `data-field` et un bouton `data-action="remove"`), puis un bouton `data-action="add" data-target="nom"`.
2. Aperçu : un conteneur `data-preview-list="nom"` dont le premier enfant sert de modèle, avec des `data-out` pour chaque clé.

## 7. Points d'attention connus

- **Script de thème dans le `<head>`** : le petit script inline (ligne 10) doit rester avant le rendu et sans `defer`, sinon la page clignote en thème clair. `script.js` est chargé une seule fois, en fin de `<body>` avec `defer`.
- Les boutons `reset` et `print` de la barre d'application sont déclarés `type="reset"` / `type="submit"` mais ne sont pas dans un `<form>` : seul `data-action` est utilisé.
- Les icônes dépendent du CDN Font Awesome ; hors connexion elles ne s'affichent pas.
- La photo est stockée en base64 dans le JSON (`localStorage` : limite d'environ 5 Mo selon le navigateur) ; le redimensionnement à 400 px limite ce risque.
- Pas de jeton CSRF : la protection repose sur le cookie de session `SameSite=Lax`. Pas de limitation des tentatives de connexion. À ajouter avant une mise en ligne.
- Le dossier `vendor/` (Composer) ne doit pas être commité : lancer `composer install`.

## 8. Backend PHP et base de données

Aucun framework : PHP natif, PDO et sessions. Les fichiers PHP sont à la racine du projet.

### Base PostgreSQL ([schema.sql](schema.sql))

| Table | Colonnes |
|---|---|
| `users` | `id` (serial, clé primaire), `email` (unique), `password_hash` |
| `cv` | `user_id` (clé primaire et clé étrangère vers `users`, `ON DELETE CASCADE`), `data` (`jsonb` : l'objet de §4), `updated_at` |

Un utilisateur a une seule ligne dans `cv` : l'écriture est un `INSERT … ON CONFLICT (user_id) DO UPDATE`.

### API ([api.php](api.php))

Configuration par variables d'environnement : `DB_DSN` (défaut `pgsql:host=localhost;dbname=cv`), `DB_USER` (défaut `postgres`), `DB_PASS`. L'action se choisit avec `?a=`. Les réponses sont en JSON, sauf le PDF.

| Action | Méthode | Rôle | Codes |
|---|---|---|---|
| `register` | POST `{email, password}` | Crée le compte (mot de passe ≥ 8 caractères, `password_hash`) et ouvre la session. | 200, 400, 409 (e-mail déjà utilisé) |
| `login` | POST `{email, password}` | Vérifie avec `password_verify`, régénère l'identifiant de session. | 200, 400, 401 |
| `logout` | POST | Détruit la session. | 200 |
| `cv` | GET | Renvoie le JSON du CV de l'utilisateur connecté (ou `null`). | 200, 401 |
| `cv` | PUT (corps JSON) | Enregistre le CV. | 200, 401 |
| `pdf` | GET | Renvoie le PDF en téléchargement, sous le nom `CV-Prenom-Nom.pdf` (`cv.pdf` si le nom est vide). | 200, 401 |

Sécurité : requêtes préparées (pas d'injection SQL) ; l'identifiant utilisateur vient toujours de `$_SESSION['uid']`, jamais du client ; cookie de session `httponly` et `SameSite=Lax` ; le même message d'erreur sert pour un e-mail inconnu et un mauvais mot de passe.

### Page de connexion ([login.html](login.html), [auth.css](auth.css))

Un seul formulaire avec deux onglets (Connexion / Créer un compte) : le mode choisit l'action envoyée à `api.php`. Contrôles côté navigateur (e-mail, 8 caractères), bouton œil pour afficher le mot de passe, message d'erreur en `role="alert"`, thème clair / sombre repris de l'application. En cas de succès, redirection vers `index.html`.

### Génération du PDF ([cv_pdf.php](cv_pdf.php))

`cv_pdf(array $cv)` construit un HTML autonome à partir du JSON et le convertit avec Dompdf (A4). Points clés :

- le statut `hidden` est respecté : `$off($k)` pour les champs simples (jamais pour `nom`, `telephone`, `specialite`, `email`), et les entrées de liste dont le `status` vaut `hidden` sont sautées ;
- métadonnées ajoutées avec `addInfo` : `Title` (« CV - Nom »), `Author`, `Subject` (spécialité) et `Creator` ;
- `cv_filename(array $cv)` produit un nom de fichier ASCII (accents retirés, caractères spéciaux remplacés par `-`, 60 caractères max) ;
- mise en page volontairement simple (tableaux et flottants), car Dompdf ne gère pas flex ni grid : le rendu diffère donc de l'aperçu ;
- tout le texte passe par `htmlspecialchars` ; les champs et entrées de liste vides sont omis (pas de textes `[Votre nom]`) ;
- `Nom:80` est affiché « Nom · 80 % » ;
- la photo n'est acceptée que si c'est une data URL `jpeg` ou `png` valide ; `isRemoteEnabled` est désactivé (aucun chargement d'URL externe) ;
- le bouton **PDF recrutement** appelle d'abord `push()` pour que le PDF contienne les dernières frappes.

### Deux sorties PDF, deux usages

| | Imprimer (design) | PDF recrutement |
|---|---|---|
| Moteur | Navigateur (`@media print`) | Dompdf (serveur) |
| Rendu | Identique à l'aperçu : couleurs, barres de niveau, timeline | Sobre, une colonne, texte sélectionnable (ATS) |
| Dépendance | Aucune (hors ligne possible) | Compte connecté et serveur |
| Champs masqués | Retirés (`.is-off`) | Omis (`cv_pdf.php`) |

Pistes non réalisées : modèles de PDF à choisir (classique / moderne) et lien de partage public.
