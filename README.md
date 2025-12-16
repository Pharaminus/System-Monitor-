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

### 2.3 Modèle de Données

#### Tables PostgreSQL

**servers**
```sql
CREATE TABLE servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  os_type VARCHAR(50),
  os_version VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active'
);
```

**metrics_history**
```sql
CREATE TABLE metrics_history (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID REFERENCES servers(id),
  timestamp TIMESTAMP NOT NULL,
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  memory_total BIGINT,
  memory_used BIGINT,
  load_avg_1 DECIMAL(5,2),
  load_avg_5 DECIMAL(5,2),
  load_avg_15 DECIMAL(5,2),
  INDEX idx_server_timestamp (server_id, timestamp)
);
```

**process_snapshots**
```sql
CREATE TABLE process_snapshots (
  id BIGSERIAL PRIMARY KEY,
  server_id UUID REFERENCES servers(id),
  timestamp TIMESTAMP NOT NULL,
  pid INTEGER NOT NULL,
  name VARCHAR(255),
  user VARCHAR(100),
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  state VARCHAR(20),
  INDEX idx_server_timestamp (server_id, timestamp)
);
```

#### Structures Redis

```
# Données en temps réel
server:{server_id}:current_metrics -> Hash
server:{server_id}:processes -> Sorted Set (score = CPU usage)
server:{server_id}:alerts -> List

# Cache
api:cache:{endpoint}:{params} -> String (TTL: 30s)
```

---

## 3. SPÉCIFICATIONS FONCTIONNELLES DÉTAILLÉES

### 3.1 Module de Monitoring CPU

**US-001 : Visualisation CPU globale**
- **En tant qu'** administrateur système
- **Je veux** voir l'utilisation CPU en temps réel
- **Afin de** détecter rapidement les pics de charge

**Critères d'acceptation :**
- Affichage du pourcentage d'utilisation global
- Graphique en temps réel (historique 60 secondes)
- Rafraîchissement toutes les 2 secondes
- Code couleur selon charge (vert < 50%, jaune < 80%, rouge >= 80%)
- Affichage du nombre de cœurs physiques et logiques

**US-002 : Détail par cœur CPU**
- Visualisation individuelle de chaque cœur
- Identification des déséquilibres de charge

### 3.2 Module de Monitoring Mémoire

**US-003 : Surveillance RAM**
- Affichage mémoire totale, utilisée, disponible
- Distinction RAM / Swap
- Graphique d'évolution temporelle
- Alerte si > 90% d'utilisation

### 3.3 Module Gestion des Processus

**US-004 : Liste des processus**
- Tableau avec colonnes : PID, User, Process, CPU%, MEM%, Time, State
- Tri par colonne (cliquable)
- Filtrage par nom de processus
- Recherche en temps réel
- Pagination (50 processus par page)

**US-005 : Actions sur les processus**
- Détail d'un processus (modal)
- Kill process (avec confirmation)
- Nice/Renice (changement de priorité)
- Logs d'exécution

### 3.4 Module Alertes

**US-006 : Configuration des alertes**
- Définition de seuils personnalisés
- Notification en temps réel (toast)
- Historique des alertes
- Export des alertes critiques

### 3.5 Module Multi-serveurs

**US-007 : Gestion de flotte**
- Ajout/suppression de serveurs
- Vue d'ensemble (dashboard agrégé)
- Basculement rapide entre serveurs
- Comparaison de métriques

---

## 4. SPÉCIFICATIONS TECHNIQUES

### 4.1 API REST Endpoints

#### Serveurs
```
GET    /api/v1/servers              # Liste des serveurs
POST   /api/v1/servers              # Ajouter un serveur
GET    /api/v1/servers/:id          # Détails d'un serveur
PUT    /api/v1/servers/:id          # Modifier un serveur
DELETE /api/v1/servers/:id          # Supprimer un serveur
```

#### Métriques
```
GET    /api/v1/servers/:id/metrics/current    # Métriques actuelles
GET    /api/v1/servers/:id/metrics/history    # Historique
  Query params: ?from=timestamp&to=timestamp&interval=5m
```

#### Processus
```
GET    /api/v1/servers/:id/processes          # Liste des processus
GET    /api/v1/servers/:id/processes/:pid     # Détail d'un processus
POST   /api/v1/servers/:id/processes/:pid/kill
POST   /api/v1/servers/:id/processes/:pid/renice
```

#### Alertes
```
GET    /api/v1/alerts                  # Liste des alertes
POST   /api/v1/alerts                  # Créer une alerte
PUT    /api/v1/alerts/:id              # Modifier une alerte
DELETE /api/v1/alerts/:id              # Supprimer une alerte
```

### 4.2 WebSocket Events

#### Client → Server
```javascript
// Connexion et authentification
connect({ token: "jwt_token" })

// Abonnement à un serveur
subscribe({ serverId: "uuid" })
unsubscribe({ serverId: "uuid" })

// Actions sur processus
killProcess({ serverId: "uuid", pid: 1234 })
```

#### Server → Client
```javascript
// Métriques en temps réel
metrics:update {
  serverId: "uuid",
  timestamp: "ISO8601",
  cpu: { usage: 45.2, cores: [...] },
  memory: { total: 16384, used: 8192, ... },
  loadAvg: [1.5, 1.2, 0.9]
}

// Processus mis à jour
processes:update {
  serverId: "uuid",
  processes: [...]
}

// Alertes
alert:triggered {
  serverId: "uuid",
  type: "cpu_high",
  severity: "warning",
  message: "CPU usage > 80%"
}
```

### 4.3 Collecte des Métriques Système

**Implémentation Node.js**
```typescript
import si from 'systeminformation';
import pidusage from 'pidusage';

class MetricsCollector {
  async collectCPUMetrics() {
    const cpuData = await si.currentLoad();
    return {
      usage: cpuData.currentLoad,
      cores: cpuData.cpus.map(cpu => ({
        usage: cpu.load,
        speed: cpu.speed
      }))
    };
  }

  async collectMemoryMetrics() {
    const mem = await si.mem();
    return {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    };
  }

  async collectProcesses() {
    const processes = await si.processes();
    const enrichedProcesses = await Promise.all(
      processes.list.map(async (proc) => {
        const usage = await pidusage(proc.pid);
        return {
          pid: proc.pid,
          name: proc.name,
          user: proc.user,
          cpu: usage.cpu,
          memory: usage.memory,
          state: proc.state
        };
      })
    );
    return enrichedProcesses;
  }
}
```

### 4.4 Optimisations Performance

**Frontend**
- React.memo pour composants lourds
- Virtualisation de liste (react-window)
- Debouncing des recherches et filtres
- Lazy loading des modules
- Code splitting par route

**Backend**
- Cache Redis avec TTL adaptatif
- Rate limiting (100 req/min par IP)
- Compression gzip/brotli
- Connection pooling PostgreSQL
- Clustering Node.js (pm2)

**WebSocket**
- Throttling des émissions (max 1 update/sec par client)
- Compression des messages (permessage-deflate)
- Heartbeat pour détection de déconnexion
- Reconnexion automatique côté client

---

## 5. SÉCURITÉ

### 5.1 Authentification & Autorisation

**JWT Authentication**
```typescript
interface JWTPayload {
  userId: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  exp: number;
}
```

**Niveaux d'accès**
- **Admin** : Toutes les opérations
- **Operator** : Lecture + actions non-destructives
- **Viewer** : Lecture seule

### 5.2 Mesures de Sécurité

- **HTTPS obligatoire** en production
- **CSP headers** (Content Security Policy)
- **CORS** configuré strictement
- **Rate limiting** sur toutes les routes
- **Validation des inputs** (Zod/Joi)
- **Sanitization** des données utilisateur
- **Audit logs** des actions critiques
- **Secrets management** (variables d'environnement)
- **Principe du moindre privilège** pour les accès système

### 5.3 Protection des Données

- Chiffrement au repos (PostgreSQL)
- Chiffrement en transit (TLS 1.3)
- Masquage des données sensibles dans les logs
- Rétention limitée des données (30 jours par défaut)
- RGPD compliance (droit à l'oubli)

---

## 6. TESTS ET QUALITÉ

### 6.1 Stratégie de Tests

**Tests Unitaires (Couverture cible : 80%)**
```typescript
// Exemple test service
describe('MetricsCollector', () => {
  it('should collect CPU metrics correctly', async () => {
    const collector = new MetricsCollector();
    const metrics = await collector.collectCPUMetrics();
    
    expect(metrics.usage).toBeGreaterThanOrEqual(0);
    expect(metrics.usage).toBeLessThanOrEqual(100);
    expect(metrics.cores).toBeInstanceOf(Array);
  });
});
```

**Tests d'Intégration**
- API endpoints (Supertest)
- WebSocket communication
- Base de données (transactions)
- Services externes

**Tests E2E (Playwright/Cypress)**
- Parcours utilisateur complets
- Tests cross-browser
- Tests responsive
- Tests de performance

**Tests de Charge (k6/Artillery)**
- 1000 utilisateurs simultanés
- 100 req/sec soutenues
- Temps de réponse < 200ms (p95)

### 6.2 Qualité du Code

**Outils**
- ESLint + Prettier (formatage)
- TypeScript strict mode
- Husky (pre-commit hooks)
- SonarQube (analyse statique)
- Commitlint (conventional commits)

**Métriques**
- Code coverage > 80%
- Complexité cyclomatique < 10
- Pas de code dupliqué > 3%
- Technical debt < 5%

---

## 7. DÉPLOIEMENT

### 7.1 Configuration Docker

**docker-compose.yml**
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/monitoring
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=monitoring
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### 7.2 Pipeline CI/CD

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: monitoring-app:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          ssh user@server "docker-compose pull && docker-compose up -d"
```

### 7.3 Monitoring Applicatif

**Outils**
- Prometheus + Grafana (métriques)
- ELK Stack (logs)
- Sentry (error tracking)
- UptimeRobot (availability)

**Métriques clés**
- Uptime > 99.9%
- Response time < 200ms (p95)
- Error rate < 0.1%
- CPU/Memory usage < 70%

---

## 8. DOCUMENTATION

### 8.1 Documentation Technique

- **README.md** : Guide de démarrage rapide
- **CONTRIBUTING.md** : Guide de contribution
- **API.md** : Documentation API complète (OpenAPI/Swagger)
- **ARCHITECTURE.md** : Schémas et explications
- **DEPLOYMENT.md** : Guide de déploiement

### 8.2 Documentation Utilisateur

- Guide d'installation
- Manuel utilisateur
- FAQ
- Tutoriels vidéo
- Changelog

---

## 9. PLANNING ET RESSOURCES

### 9.1 Phases du Projet

**Phase 1 : POC (3 semaines)**
- Architecture de base
- Collecte métriques CPU/Memory
- Interface basique
- WebSocket temps réel

**Phase 2 : MVP (6 semaines)**
- Toutes les fonctionnalités core
- Base de données
- Authentification
- Tests unitaires
- Documentation

**Phase 3 : Production (4 semaines)**
- Multi-serveurs
- Alertes avancées
- Optimisations performance
- Tests E2E
- Déploiement

**Phase 4 : Amélioration Continue**
- Feedback utilisateurs
- Nouvelles fonctionnalités
- Optimisations

### 9.2 Équipe Recommandée

- **1 Tech Lead / Architecte** (30% temps)
- **2 Développeurs Full-Stack** (100% temps)
- **1 DevOps Engineer** (50% temps)
- **1 QA Engineer** (50% temps)
- **1 UX/UI Designer** (30% temps)

### 9.3 Budget Estimatif

**Développement**
- Ressources humaines : 150-200 j/h
- Infrastructure dev : 500€/mois
- Outils/Licences : 200€/mois

