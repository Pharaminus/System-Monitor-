# Projet : Plateforme Web de Monitoring Système en Temps Réel

## 1. PRÉSENTATION DU PROJET

### 1.1 Contexte et Problématique

Dans un environnement professionnel où la surveillance des infrastructures informatiques est cruciale, les administrateurs système nécessitent des outils accessibles, performants et intuitifs pour monitorer l'état des serveurs et des applications. Les solutions traditionnelles comme `htop` ou `top` sont puissantes mais limitées à l'interface en ligne de commande, nécessitant un accès direct au serveur.

### 1.2 Objectifs du Projet

Développer une application web moderne permettant la surveillance en temps réel des ressources système avec les objectifs suivants :

- **Accessibilité universelle** : Interface web accessible depuis tout navigateur
- **Visualisation intuitive** : Représentation graphique des métriques système
- **Temps réel** : Rafraîchissement automatique des données
- **Expérience utilisateur optimale** : Design moderne et responsive
- **Scalabilité** : Architecture permettant de monitorer plusieurs serveurs

### 1.3 Périmètre Fonctionnel

**Fonctionnalités principales :**
- Monitoring CPU (utilisation globale et par cœur)
- Surveillance mémoire (RAM, swap)
- Liste des processus actifs avec détails
- Historique des métriques avec graphiques
- Tri et filtrage des processus
- Alertes sur seuils critiques

**Fonctionnalités secondaires :**
- Monitoring réseau (bande passante, connexions)
- Surveillance disque (I/O, espace)
- Gestion multi-serveurs
- Historisation des données
- Export de rapports

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Stack Technologique

#### Frontend
- **Framework** : React 18+ avec TypeScript
- **Styling** : Tailwind CSS 3+
- **Graphiques** : D3.js ou Recharts
- **État global** : Redux Toolkit ou Zustand
- **Communication temps réel** : WebSocket (Socket.io)
- **Requêtes HTTP** : Axios ou React Query
- **Icônes** : Lucide React
- **Build** : Vite ou Next.js

#### Backend
- **Runtime** : Node.js 20+ (LTS)
- **Framework** : Express.js ou Fastify
- **Langage** : TypeScript
- **WebSocket** : Socket.io
- **Collecte métriques** : 
  - `systeminformation` (npm package)
  - `node-os-utils`
  - `pidusage`
- **Base de données** : 
  - PostgreSQL (données historiques)
  - Redis (cache et données temps réel)
- **ORM** : Prisma ou TypeORM

#### Infrastructure
- **Conteneurisation** : Docker + Docker Compose
- **Reverse Proxy** : Nginx
- **CI/CD** : GitHub Actions ou GitLab CI
- **Monitoring applicatif** : PM2
- **Tests** : Jest, React Testing Library, Supertest

### 2.2 Architecture Système

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ React UI     │  │ State Mgmt   │  │ WebSocket │ │
│  │ Components   │  │ (Redux)      │  │ Client    │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS/WSS
┌────────────────────────┴────────────────────────────┐
│                  NGINX (Reverse Proxy)               │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────┐
│                 APPLICATION SERVER                   │
│  ┌──────────────────────────────────────────────┐  │
│  │           API REST (Express/Fastify)         │  │
│  ├──────────────────────────────────────────────┤  │
│  │        WebSocket Server (Socket.io)          │  │
│  ├──────────────────────────────────────────────┤  │
│  │         Services Layer                       │  │
│  │  ┌────────────┐  ┌────────────────────────┐ │  │
│  │  │ Metrics    │  │ Process Manager        │ │  │
│  │  │ Collector  │  │ Service                │ │  │
│  │  └────────────┘  └────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │ Redis   │    │PostgreSQL│    │ System  │
    │ Cache   │    │ Database│    │ Kernel  │
    └─────────┘    └─────────┘    └─────────┘
```

