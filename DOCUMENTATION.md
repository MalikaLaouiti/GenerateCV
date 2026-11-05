# Documentation technique

## 1. Principe général

Le formulaire et l'aperçu sont reliés **uniquement par des attributs `data-*`**. Le JavaScript n'a aucune connaissance des champs en dur : ajouter un champ revient à ajouter deux balises (une dans le formulaire, une dans l'aperçu) avec la même clé.

```
 Formulaire (data-field)  ──readState()──▶  état (objet JS)  ──render()──▶  Aperçu (data-out…)
                                                   │
                                                   └──save()──▶ localStorage
```

À chaque frappe : `readState()` lit le formulaire, `render()` met l'aperçu à jour, puis `scheduleSave()` sauvegarde (avec un délai anti-rebond de 250 ms).

## 2. HTML : conventions d'attributs

### Côté formulaire

| Attribut | Où | Rôle |
|---|---|---|
| `data-field="clé"` | `<input>`, `<textarea>` | Champ lu par le script. La clé relie le champ à l'aperçu. |
| `data-list="nom"` | `<fieldset>` | Liste répétable (`experiences`, `formations`, `projets`). Contient des `<details class="entry">`. |
| `data-action="add"` + `data-target="nom"` | `<button>` | Ajoute une entrée à la liste `nom`. |
| `data-action="remove"` | `<button>` dans une `.entry` | Supprime l'entrée (ou la vide s'il n'en reste qu'une). |
| `data-action="print"` | `<button>` | Appelle `window.print()`. |
| `data-action="reset"` | `<button>` | Efface formulaire et sauvegarde (après confirmation). |

### Côté aperçu

| Attribut | Rôle |
|---|---|
| `data-out="clé"` | Le texte de l'élément est remplacé par la valeur du champ. Si le champ est vide, le texte d'origine (placeholder `[...]`) est restauré. |
| `data-out-href="clé"` | Met à jour le `href` du lien (voir `hrefFor`). Si la valeur est invalide ou vide, le `href` d'origine est conservé. |
| `data-out-badges="clé"` | Liste `<ul>` : la valeur est découpée sur les virgules, un `<li>` est créé par élément. |
| `data-out-photo` | Conteneur de la photo (avatar). |
| `data-preview-list="nom"` | Conteneur dont les enfants sont clonés/supprimés pour suivre le nombre d'entrées de la liste `nom`. Le premier enfant sert de modèle. |

### Clés de champs

- **Profil** : `photo`, `nom`, `specialite`, `presentation`
- **Coordonnées** : `email`, `telephone`, `ville`, `linkedin`, `github`, `portfolio`
- **Compétences** : `competences-techniques`, `langages`, `outils`, `bases`, `transversales`, `langues`
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
| `STORAGE_KEY` | `'cv-interactif-v1'`, clé `localStorage`. |
| `PHOTO_MAX` | `400` : taille maximale (px) du plus grand côté de la photo. |
| `form`, `sheet`, `avatar` | Éléments DOM principaux (`#cv-form`, `#cv`, `[data-out-photo]`). |
| `avatarDefault` | HTML initial de l'avatar (icône), restauré sans photo. |
| `photoData` | Photo courante, en data URL JPEG (chaîne vide si aucune). |
| `saveTimer` | Identifiant du timer de sauvegarde différée. |
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
- `renderPhoto()` : affiche l'image (avec `alt` personnalisé) ou restaure l'avatar par défaut avec ses attributs ARIA.
- `renderLists(state)` : ajuste le nombre d'enfants de chaque liste d'aperçu (clonage du modèle ou suppression) puis remplit chaque ligne.
- `render()` : enchaîne `fillScope`, `renderPhoto`, `renderLists` et renvoie l'état.

### Sauvegarde

- `save(state)` : écrit l'état en JSON dans `localStorage` (erreurs ignorées : stockage plein ou désactivé).
- `scheduleSave()` : sauvegarde différée de 250 ms (anti-rebond).
- `load()` : lit et analyse l'état sauvegardé, `null` en cas d'absence ou d'erreur.
- `refresh()` : `render()` puis `save()` immédiat. Utilisé pour les actions ponctuelles (ajout, suppression, photo).

### Listes répétables

- `renumber(name)` : renomme les `<summary>` (« Expérience 1 », « Expérience 2 »…).
- `addEntry(name, open)` : clone le modèle, l'insère avant le bouton « Ajouter » et renumérote.
- `ensureCount(name, n)` : ajoute ou retire des entrées pour en avoir exactement `n`.

### Restauration

- `applyState(state)` : remplit le formulaire depuis un état sauvegardé. Vérifie les types (chaînes uniquement), crée les entrées de liste nécessaires (au moins une) et n'accepte la photo que si elle commence par `data:image/`.

### Photo

- `handlePhoto(file)` : si le fichier n'est pas une image, supprime la photo. Sinon lit le fichier (`FileReader`), le redimensionne sur un `<canvas>` (côté max `PHOTO_MAX`, jamais agrandi) et l'enregistre en JPEG qualité 0,85.

### Événements

| Événement | Comportement |
|---|---|
| `input` sur le formulaire | `render()` + `scheduleSave()` (champ fichier ignoré). |
| `change` sur le formulaire | Si champ fichier : `handlePhoto`. |
| `submit` sur le formulaire | `preventDefault()`. |
| `click` sur le document | Délégation : traite `data-action` = `add`, `remove`, `print`, `reset`. |

Les clics sont écoutés au niveau du document (délégation), donc les entrées créées dynamiquement fonctionnent sans ré-attacher d'écouteurs.

### Initialisation

```js
applyState(load());
render();
```

## 4. Format de sauvegarde

Clé `localStorage` : `cv-interactif-v1`.

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
  "photo": "data:image/jpeg;base64,…"
}
```

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
10. Timeline (CSS uniquement)
11. Pied de CV
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

- **Double chargement du script** : [index.html](index.html) inclut `script.js` deux fois, à la ligne 10 (dans le `<head>`, sans `defer`) et à la ligne 287 (avec `defer`). Le premier chargement s'exécute avant que le DOM existe et provoque une erreur console (`form` est `null`) ; le second fonctionne normalement. Il suffit de supprimer la ligne 10 ou d'y ajouter `defer` et de supprimer la ligne 287.
- Les boutons `reset` et `print` de la barre d'application sont déclarés `type="reset"` / `type="submit"` mais ne sont pas dans un `<form>` : seul `data-action` est utilisé.
- Les icônes dépendent du CDN Font Awesome ; hors connexion elles ne s'affichent pas.
- La photo est stockée en base64 dans `localStorage` (limite d'environ 5 Mo selon le navigateur) ; le redimensionnement à 400 px limite ce risque.
