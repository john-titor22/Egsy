# OeufAlHaouz - Gestion de Ferme Avicole

Application SaaS complète pour la gestion de fermes avicoles. Interface entièrement en français.

## Stack technique

- **Frontend**: React 18 + Vite + TailwindCSS + shadcn-style components
- **Backend**: Node.js + Express + Prisma ORM
- **Base de données**: PostgreSQL
- **Authentification**: JWT (access token 15min + refresh token 7j)

## Structure du projet

```
OeufAlHaouz/
├── frontend/          # Application React
├── backend/           # API Node.js/Express
└── README.md
```

## Fonctionnalités

- **Tableau de bord** — Vue d'ensemble avec statistiques clés et graphiques
- **Troupeaux** — Gestion des lots de volailles (chair / ponte)
- **Production** — Enregistrement quotidien : oeufs collectés, mortalité, aliment
- **Stock** — Gestion des stocks avec alertes de seuil bas
- **Ventes** — Suivi des ventes avec génération de factures
- **Dépenses** — Suivi des dépenses par catégorie avec graphique camembert
- **Multi-tenant** — Chaque ferme a ses propres données isolées

## Démarrage rapide

### Prérequis

- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurer DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET dans .env
npm run db:push
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api
npm run dev
```

L'application est disponible sur http://localhost:5173

## Variables d'environnement

### backend/.env

```env
DATABASE_URL="postgresql://user:password@localhost:5432/oeufalhaouz"
JWT_SECRET="votre-secret-jwt"
JWT_REFRESH_SECRET="votre-refresh-secret"
PORT=3001
```

### frontend/.env

```env
VITE_API_URL=http://localhost:3001/api
```

## Déploiement sur Railway

1. Créer un projet Railway
2. Ajouter un service PostgreSQL
3. Déployer le backend depuis le dossier `backend/`
4. Configurer les variables d'environnement avec la DATABASE_URL de Railway
5. Exécuter `npm run db:push` ou `npm run db:migrate`
6. Déployer le frontend sur Vercel/Netlify avec `VITE_API_URL` pointant vers le backend Railway

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| POST | /api/auth/refresh-token | Renouvellement token |
| GET | /api/dashboard | Statistiques tableau de bord |
| CRUD | /api/flocks | Gestion troupeaux |
| CRUD | /api/production | Enregistrements production |
| CRUD | /api/stock | Gestion stock |
| POST | /api/stock/:id/movement | Mouvement de stock |
| CRUD | /api/sales | Gestion ventes |
| POST | /api/sales/:id/invoice | Générer une facture |
| CRUD | /api/expenses | Gestion dépenses |
