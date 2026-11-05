# Générateur de CV interactif

Application web statique : l'utilisateur remplit un formulaire et voit son CV se construire en direct à côté. Le CV peut ensuite être imprimé ou exporté en PDF.

**Projet 5 – ING-A2-03** · Auteures : Kafsi Nour El Houda, Laouiti Malika

## Fonctionnalités

- Aperçu en temps réel pendant la saisie (aucun bouton « Valider »).
- Sections : profil (photo, nom, spécialité, présentation), coordonnées, compétences (6 catégories), expériences, formations, projets et certifications, pied de page.
- Listes répétables : ajout et suppression d'expériences, de formations et de projets.
- Photo de profil redimensionnée automatiquement (400 px max).
- Sauvegarde automatique dans le navigateur (`localStorage`) : les données sont restaurées à la réouverture.
- Impression / export PDF au format A4 : seul le CV est imprimé.
- Réinitialisation complète avec confirmation.
- Responsive : sur mobile, des onglets permettent de basculer entre formulaire et aperçu.
- Accessibilité : lien d'évitement, libellés ARIA, respect de `prefers-reduced-motion`.

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
2. Pour les compétences, séparer les éléments par des virgules (ex. `HTML, CSS, Python`).
3. Utiliser **Ajouter…** pour créer une expérience, une formation ou un projet, et **Supprimer** pour en retirer un.
4. Cliquer sur **Imprimer / PDF**, puis choisir « Enregistrer au format PDF » comme imprimante.
5. **Réinitialiser** efface toutes les données saisies, y compris la sauvegarde.

## Technologies

- HTML5 sémantique
- CSS3 (variables, Grid, Flexbox, media queries)
- JavaScript ES5 natif (IIFE, aucune dépendance)
- Font Awesome 6.5.2 (icônes, via CDN)

## Confidentialité

Toutes les données restent dans le navigateur de l'utilisateur (`localStorage`, clé `cv-interactif-v1`). Rien n'est envoyé à un serveur.

## Documentation

Le fonctionnement interne (conventions `data-*`, fonctions JavaScript, format de sauvegarde) est décrit dans [DOCUMENTATION.md](DOCUMENTATION.md).
