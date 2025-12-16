# API — Minimal reference

## Authentication

POST /api/v1/login
- Body: { "username": "..." }
- Returns: { token }

## Servers

GET /api/v1/servers — list servers (requires Authorization)
POST /api/v1/servers — create server (requires Authorization)

## Metrics

GET /api/v1/servers/:id/metrics/current — current metrics

## Processes

GET /api/v1/servers/:id/processes — list processes
POST /api/v1/servers/:id/processes/:pid/kill — kill process (operator+)
POST /api/v1/servers/:id/processes/:pid/renice — renice process (operator+)

## Alerts

GET /api/v1/alerts — list alerts (reads from Redis)
POST /api/v1/alerts — push alert (writes to Redis)
