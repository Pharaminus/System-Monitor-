import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { metricsCollector } from './metricsCollector';
import prisma from './prismaClient';
import redis from './redisClient';
import { authenticateJWT, generateToken } from './auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod'

function requireRole(role: 'admin' | 'operator' | 'viewer') {
  return (req: any, res: any, next: any) => {
    const user = req.user
    if (!user) return res.status(401).json({ error: 'unauthenticated' })
    if (user.role !== role && user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
    next()
  }
}

dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// basic rate limiter
app.use(rateLimit({ windowMs: 60_000, max: 200 }))

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Basic auth endpoints (demo only)
app.post('/api/v1/login', async (req, res) => {
  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username required' })
  // For demo: if user exists issue token, otherwise create a viewer user
  let user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    const hashed = await bcrypt.hash('changeme', 10)
    try {
      user = await prisma.user.create({ data: { username, password: hashed, role: 'viewer' } })
    } catch (e) {
      // handle race condition where another request created the user concurrently
      if ((e as any)?.code === 'P2002') {
        user = await prisma.user.findUnique({ where: { username } })
      } else {
        console.error('[login] user create failed', e)
        return res.status(500).json({ error: 'user_create_failed' })
      }
    }
  }
  if (!user) return res.status(500).json({ error: 'user_lookup_failed' })
  const token = generateToken({ username: user.username, role: user.role }, '8h')
  res.json({ token })
})

// Servers CRUD using Prisma
app.get('/api/v1/servers', authenticateJWT, async (req, res) => {
  const list = await prisma.server.findMany()
  res.json(list)
})

const serverSchema = z.object({ hostname: z.string().min(1), ipAddress: z.string().min(1), osType: z.string().optional(), osVersion: z.string().optional() })

app.post('/api/v1/servers', authenticateJWT, async (req, res) => {
  const parsed = serverSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', details: parsed.error.format() })
  const { hostname, ipAddress, osType, osVersion } = parsed.data
  const srv = await prisma.server.create({ data: { hostname, ipAddress, osType, osVersion } })
  res.status(201).json(srv)
})

// create user (admin only)
app.post('/api/v1/users', authenticateJWT, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })
  const hashed = await bcrypt.hash(password, 10)
  const u = await prisma.user.create({ data: { username, password: hashed, role: role || 'viewer' } })
  res.status(201).json({ id: u.id, username: u.username, role: u.role })
})

app.get('/api/v1/servers/:id/metrics/current', authenticateJWT, async (req, res) => {
  try {
    const cpu = await metricsCollector.collectCPUMetrics();
    const memory = await metricsCollector.collectMemoryMetrics();
    const gpu = await metricsCollector.collectGPUMetrics();
    // Persist a short metrics snapshot to the DB (non-blocking)
    const serverId = req.params.id
    prisma.metricsHistory.create({ data: {
      serverId: serverId,
      timestamp: new Date(),
      cpuUsage: cpu.usage as unknown as number,
      memoryUsage: (memory.used / memory.total) * 100
    }}).catch(() => {})
    res.json({ serverId, timestamp: new Date().toISOString(), cpu, memory, gpu })
  } catch (err) {
    res.status(500).json({ error: 'failed to collect metrics' })
  }
})

app.get('/api/v1/servers/:id/processes', authenticateJWT, async (req, res) => {
  try {
    const processes = await metricsCollector.collectProcesses(50);
    res.json({ serverId: req.params.id, processes });
  } catch (err) {
    res.status(500).json({ error: 'failed to list processes' });
  }
});

// Redis-based alerts: simple example
app.post('/api/v1/alerts', authenticateJWT, async (req, res) => {
  // list latest alerts from redis
  try {
    const key = `alerts:all`
    const list = await redis.lrange(key, 0, 99)
    const parsed = list.map((s: string) => JSON.parse(s))
    res.json(parsed)
  } catch (err) {
    console.warn('[alerts] read failed:', err && (err as Error).message)
    res.status(503).json({ ok: false, error: 'redis_unavailable' })
  }
})

// process actions
app.post('/api/v1/servers/:id/processes/:pid/kill', authenticateJWT, requireRole('operator'), async (req, res) => {
  const pid = parseInt(req.params.pid, 10)
  if (Number.isNaN(pid)) return res.status(400).json({ error: 'invalid pid' })
  try {
    process.kill(pid, 'SIGTERM')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

app.post('/api/v1/servers/:id/processes/:pid/renice', authenticateJWT, requireRole('operator'), async (req, res) => {
  const pid = parseInt(req.params.pid, 10)
  const { nice } = req.body
  if (Number.isNaN(pid) || typeof nice !== 'number') return res.status(400).json({ error: 'invalid request' })
  const { exec } = require('child_process')
  exec(`renice -n ${nice} -p ${pid}`, (err: any, stdout: string, stderr: string) => {
    if (err) return res.status(500).json({ ok: false, error: stderr || err.message })
    res.json({ ok: true, out: stdout })
  })
})

// WebSocket: authentication and subscriptions
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.toString().split(' ')[1]
  if (!token) return next()
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_me')
    ;(socket as any).user = decoded
    next()
  } catch (e) {
    next()
  }
})

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  let interval: ReturnType<typeof setInterval> | null = null;

  socket.on('subscribe', (payload) => {
    const serverId = payload?.serverId || 'local'
    if (interval) clearInterval(interval)
    interval = setInterval(async () => {
      try {
        const cpu = await metricsCollector.collectCPUMetrics();
        const memory = await metricsCollector.collectMemoryMetrics();
        const gpu = await metricsCollector.collectGPUMetrics();
        // collect top processes (best-effort) and include in the realtime payload
        let processes = [] as any[]
        try {
          processes = await metricsCollector.collectProcesses(50)
        } catch (pe) {
          // if processes collection fails, continue without it
          console.warn('[metrics] collectProcesses failed', (pe as Error).message)
        }
        socket.emit('metrics:update', { serverId, timestamp: new Date().toISOString(), cpu, memory, processes, gpu });
      } catch (e) {
        // ignore
      }
    }, 2000);
  });

  socket.on('unsubscribe', () => {
    if (interval) { clearInterval(interval); interval = null; }
  });

  socket.on('disconnect', () => {
    if (interval) clearInterval(interval);
    console.log('client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

