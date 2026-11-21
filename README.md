# Générateur de CV interactif

Application web statique : l'utilisateur remplit un formulaire et voit son CV se construire en direct à côté. Le CV peut ensuite être imprimé ou exporté en PDF.

**Projet 5 – ING-A2-03** · Auteures : Kafsi Nour El Houda, Laouiti Malika

**Dépôt GitHub :** [MalikaLaouiti/GenerateCV](https://github.com/MalikaLaouiti/GenerateCV)

## Fonctionnalités

- Aperçu en temps réel pendant la saisie (aucun bouton « Valider »).
- Sections : profil (photo, nom, spécialité, présentation), coordonnées, compétences (6 catégories), expériences, formations, projets et certifications, pied de page.
- Listes répétables : ajout et suppression d'expériences, de formations et de projets.
- Photo de profil redimensionnée automatiquement (400 px max).
- Sauvegarde automatique dans le navigateur (`localStorage`) : les données sont restaurées à la réouverture.
- Impression / export PDF au format A4 : seul le CV est imprimé.
- Réinitialisation complète avec confirmation.
- Thème clair / sombre : bouton dans la barre d'application ; le choix est mémorisé (`localStorage`, clé `cv-theme`), à défaut la préférence du système est utilisée.
- Compétences avec niveau : écrire `Python:80` affiche une barre de progression animée (au défilement). Filtres par catégorie au-dessus des compétences.
- Détails dépliables pour chaque expérience, formation et projet (`<details>`) ; bouton « Tout déplier / Tout replier » pour les expériences.
- Parcours professionnel sous forme de timeline interactive : le point s'illumine quand les détails sont ouverts.
- Navigation rapide dans l'aperçu (sommaire collant `.toc`).
- Les blocs laissés vides ne sont pas imprimés ; les détails sont automatiquement dépliés à l'impression.
- Responsive : sur mobile, des onglets permettent de basculer entre formulaire et aperçu.
- Accessibilité : `h1` unique, repère `<main>`, lien d'évitement, boutons nommés (ARIA), `aria-pressed` sur les filtres, respect de `prefers-reduced-motion`.

## Structure du projet

```
Code/
├── index.html   Structure : formulaire (gauche) + aperçu du CV (droite)
├── style.css    Mise en forme, responsive, styles d'impression
├── script.js    Logique (JavaScript natif, sans bibliothèque)
├── README.md    Ce fichier
└── DOCUMENTATION.md   Documentation technique détaillée du code
```

## Lancer le projet

Aucune installation ni compilation : ouvrir `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari).

Une connexion Internet est utile uniquement pour charger les icônes Font Awesome (CDN). Sans connexion, le CV fonctionne mais sans icônes.

## Utilisation

1. Remplir les champs du formulaire : l'aperçu se met à jour instantanément.
2. Pour les compétences, séparer les éléments par des virgules (ex. `HTML, CSS, Python`). Ajouter `:niveau` (0-100) pour afficher une barre de niveau (ex. `Python:80`).
3. Utiliser **Ajouter…** pour créer une expérience, une formation ou un projet, et **Supprimer** pour en retirer un.
4. Cliquer sur **Imprimer / PDF**, puis choisir « Enregistrer au format PDF » comme imprimante.
5. Le bouton lune / soleil change le thème ; **Tout déplier** ouvre les détails des expériences ; les boutons de la section Compétences filtrent par catégorie.
6. **Réinitialiser** efface toutes les données saisies, y compris la sauvegarde.

## Technologies

- HTML5 sémantique
- CSS3 (variables, Grid, Flexbox, media queries)
- JavaScript ES5 natif (IIFE, aucune dépendance) ; `IntersectionObserver`, `<details>`, `:has()` pour les interactions
- Font Awesome 6.5.2 (icônes, via CDN)

## Confidentialité

Toutes les données restent dans le navigateur de l'utilisateur (`localStorage`, clés `cv-interactif-v1` pour le CV et `cv-theme` pour le thème). Rien n'est envoyé à un serveur.

## Documentation

Le fonctionnement interne (conventions `data-*`, fonctions JavaScript, format de sauvegarde) est décrit dans [DOCUMENTATION.md](DOCUMENTATION.md).
