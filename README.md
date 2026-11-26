# Générateur de CV interactif

Application web (PHP + PostgreSQL, sans framework) : l'utilisateur crée un compte, remplit un formulaire et voit son CV se construire en direct à côté. Le CV est enregistré en base de données pour chaque utilisateur, puis peut être imprimé ou téléchargé en PDF (généré côté serveur).

**Projet 5 – ING-A2-03** · Auteures : Kafsi Nour El Houda, Laouiti Malika

**Dépôt GitHub :** [MalikaLaouiti/GenerateCV](https://github.com/MalikaLaouiti/GenerateCV)

## Fonctionnalités

- Aperçu en temps réel pendant la saisie (aucun bouton « Valider »).
- Sections : profil (photo, nom, spécialité, présentation), coordonnées, compétences (6 catégories), expériences, formations, projets et certifications, pied de page.
- Listes répétables : ajout et suppression d'expériences, de formations et de projets.
- Photo de profil redimensionnée automatiquement (400 px max).
- Comptes utilisateurs : inscription, connexion et déconnexion (mots de passe hachés, session PHP). Chaque utilisateur retrouve son propre CV.
- Sauvegarde synchronisée : chaque frappe est écrite immédiatement dans le navigateur (`localStorage`), puis envoyée au serveur (PostgreSQL) 1 seconde après la dernière frappe. Si le serveur est injoignable, les modifications sont renvoyées à la prochaine ouverture.
- Deux sorties PDF aux rôles différents :
  - **PDF recrutement** (serveur, Dompdf) : PDF A4 sobre, une colonne, texte sélectionnable, lisible par les logiciels de recrutement (ATS), identique sur tous les appareils. Nom de fichier personnalisé (`CV-Prenom-Nom.pdf`) et métadonnées (titre, auteur, sujet).
  - **Imprimer (design)** (navigateur) : reproduit l'aperçu à l'identique (couleurs, barres de niveau, timeline), instantané et utilisable hors ligne ; seul le CV est imprimé.
- Personnalisation par poste visé : chaque champ (sauf nom, téléphone, titre et e-mail, obligatoires) et chaque expérience, formation ou projet peut être **masqué** ou **affiché** dans le PDF grâce à une icône œil. Les données restent toutes enregistrées ; seul leur statut change. Un élément masqué apparaît estompé dans l'aperçu et n'est ni imprimé ni présent dans le PDF.
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
Project/
├── index.html   Structure : formulaire (gauche) + aperçu du CV (droite)
├── style.css    Mise en forme, responsive, styles d'impression
├── script.js    Logique front (JavaScript natif, sans bibliothèque)
├── login.html   Page de connexion / création de compte
├── auth.css     Style de la page de connexion
├── api.php      API JSON (PHP + PDO) : inscription, connexion, CV, PDF
├── cv_pdf.php   Génération du PDF avec Dompdf
├── schema.sql   Schéma PostgreSQL (tables users et cv)
├── composer.json / composer.lock   Dépendance Dompdf
├── README.md    Ce fichier
└── DOCUMENTATION.md   Documentation technique détaillée du code
```

## Lancer le projet

Prérequis : PHP 8+ avec les extensions `pdo_pgsql`, `mbstring` et `dom`, PostgreSQL et Composer.

```powershell
composer install                       # installe Dompdf (dossier vendor/)
createdb -U postgres cv
psql -U postgres -d cv -f schema.sql   # crée les tables users et cv
$env:DB_USER = "postgres"
$env:DB_PASS = "mot_de_passe"          # DB_DSN facultatif (défaut : pgsql:host=localhost;dbname=cv)
php -S localhost:8000
```

Ouvrir ensuite `http://localhost:8000/login.html`, créer un compte, puis remplir le CV.

Une connexion Internet est utile uniquement pour charger les icônes Font Awesome (CDN). Sans connexion, le CV fonctionne mais sans icônes.

## Utilisation

1. Créer un compte (onglet **Créer un compte**, mot de passe de 8 caractères minimum) ou se connecter, puis remplir les champs du formulaire : l'aperçu se met à jour instantanément.
2. Pour les compétences, séparer les éléments par des virgules (ex. `HTML, CSS, Python`). Ajouter `:niveau` (0-100) pour afficher une barre de niveau (ex. `Python:80`).
3. Utiliser **Ajouter…** pour créer une expérience, une formation ou un projet, et **Supprimer** pour en retirer un.
4. Cliquer sur **PDF recrutement** pour télécharger le PDF du serveur, ou sur **Imprimer (design)** puis choisir « Enregistrer au format PDF » comme imprimante.
5. Pour adapter le CV à un poste, cliquer sur l'icône œil à côté d'un champ, ou sur **Affiché dans le PDF** dans une entrée de liste : l'élément passe en **Masqué dans le PDF** (et inversement). Rien n'est supprimé.
6. Le bouton lune / soleil change le thème ; **Tout déplier** ouvre les détails des expériences ; les boutons de la section Compétences filtrent par catégorie.
7. **Réinitialiser** efface toutes les données saisies, les statuts masqués et la sauvegarde en base.
8. **Déconnexion** ferme la session et efface la copie locale du CV.

## Technologies

- HTML5 sémantique
- CSS3 (variables, Grid, Flexbox, media queries)
- PHP 8 natif (PDO, sessions, `password_hash`), sans framework
- PostgreSQL (colonne `jsonb` pour le CV)
- Dompdf (génération du PDF, via Composer)
- JavaScript ES5 natif (IIFE, aucune dépendance) ; `IntersectionObserver`, `<details>`, `:has()` pour les interactions
- Font Awesome 6.5.2 (icônes, via CDN)

## Confidentialité

Le CV de chaque utilisateur est stocké sur le serveur, dans PostgreSQL ; un utilisateur ne peut lire ou modifier que son propre CV (l'identité vient de la session, jamais du navigateur). Les mots de passe sont hachés (`password_hash`), jamais stockés en clair.

Une copie est aussi conservée dans le navigateur (`localStorage`, clé `cv-interactif-v1`) pour un affichage instantané et le travail hors ligne ; elle est effacée à la déconnexion. Le thème est mémorisé à part (`cv-theme`).

## Documentation

Le fonctionnement interne (conventions `data-*`, fonctions JavaScript, format de sauvegarde) est décrit dans [DOCUMENTATION.md](DOCUMENTATION.md).
