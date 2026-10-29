# 🧠 PsyDécode — Plateforme Web & Studio d'Administration

> Plateforme web officielle et studio d'administration pour la marque **PsyDécode** (Psychologie comportementale, décodage, séduction et charisme).

---

## ⚡ Caractéristiques Principales

- **Boutique & Produits Numériques** : Vente d'e-books et formations avec déblocage instantané de clé d'accès et téléchargement sécurisé.
- **Paiements Hybrides & Géolocalisation Intelligente** :
  - **Carte Bancaire (Visa, Mastercard, CB)** : Détection automatique des visiteurs internationaux (France, Belgique, Suisse, Canada, Europe) avec affichage 100% carte en Euros (€), sans forcer de numéro ou de Mobile Money.
  - **Mobile Money (MTN, Moov, Wave, Celtiis, Orange)** : Détection des pays d'Afrique (Bénin, Côte d'Ivoire, Sénégal, Togo, Cameroun, Burkina Faso) avec conversion CFA et validation simplifiée.
  - **Marque Blanche 100% PsyDécode** : Aucune mention extérieure visible pour l'acheteur.
- **Suivi des Commandes en Temps Réel** :
  - **Côté Client** (`/commande-validee`) : Validation bancaire avec polling automatique 3D-Secure.
  - **Côté Studio Administrateur** (`/admin`) : Tableau de bord des transactions avec statut en direct (`Payé` / `En attente`), bouton de vérification instantanée et indicateurs clés.
- **Base de Données SQLite 3 (WAL)** :
  - Moteur relationnel rapide et autonome via `better-sqlite3`.
  - Tables : `articles`, `products`, `subscribers`, `orders`, `contacts`, `settings`.
- **Studio d'Administration Complet** :
  - Gestion des articles de blog et publication.
  - Gestion des guides et e-books.
  - Médiathèque et téléversement de fichiers (PDF, audio, vidéo, images).
  - Suivi des abonnés à la newsletter privée.
  - Paramètres du site et configuration de la passerelle de paiement.

---

## 🚀 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement du serveur
```bash
npm start
```
Ou en mode développement :
```bash
npm run dev
```

Le serveur sera accessible sur :
- **Site public :** [http://localhost:3000](http://localhost:3000)
- **Boutique :** [http://localhost:3000/boutique](http://localhost:3000/boutique)
- **Studio Admin :** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📁 Architecture du Projet

```text
psydecode-site/
├── server.js              # Serveur HTTP natif Node.js & API RESTful
├── db.js                  # Couche d'accès aux données SQLite 3 (better-sqlite3)
├── payment.js             # Service de paiement bancaire et Mobile Money
├── package.json           # Métadonnées et dépendances Node.js
├── data/                  # Fichiers de données et initialisation
│   ├── articles.json      # Données initiales articles
│   ├── products.json      # Données initiales boutique
│   ├── settings.json      # Configuration par défaut
│   └── subscribers.json   # Abonnés initiaux
├── public/                # Fichiers statiques et pages web
│   ├── index.html         # Page d'accueil officielle
│   ├── boutique.html      # Catalogue des e-books et guides
│   ├── articles.html      # Liste des articles et analyses
│   ├── article.html       # Lecteur d'article dynamique
│   ├── admin.html         # Studio d'administration complet
│   ├── commande-validee.html # Page de confirmation & suivi de commande
│   ├── cgv.html           # Conditions Générales de Vente & Mentions Légales
│   ├── contact.html       # Page de contact et support client
│   ├── css/style.css      # Thème sombre luxe et design system
│   ├── js/main.js         # Logique frontend, détection pays & modal d'achat
│   └── images/            # Visuels et illustrations
└── uploads/               # Stockage des fichiers téléversés
```

---

## 🛡️ Sécurité & Confidentialité

- La base de données locale SQLite contenant les clés de paiement et les commandes réelles est exclue du dépôt via `.gitignore`.
- Les communications avec l'API bancaire sont chiffrées en HTTPS avec clés d'authentification côté serveur uniquement.

---

© 2026 PsyDécode. Tous droits réservés.
