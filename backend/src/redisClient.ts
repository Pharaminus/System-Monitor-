import Redis from 'ioredis'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.REDIS_URL || 'redis://localhost:6379'

const redis = new Redis(url, {
	lazyConnect: true,
	// allow ioredis to retry indefinitely
	maxRetriesPerRequest: null,
	// reconnectOnError can inspect the error and decide to reconnect
	reconnectOnError: (err) => {
		console.warn('[ioredis] reconnectOnError', err && (err as Error).message)
		return true
	}
})

redis.on('connect', () => console.log('[ioredis] connected to', url))
redis.on('ready', () => console.log('[ioredis] ready'))
redis.on('error', (err) => console.warn('[ioredis] error', err && (err as Error).message))
redis.on('close', () => console.log('[ioredis] connection closed'))

// attempt connect but don't let failures throw unhandled
redis.connect().catch((err) => {
	console.warn('[ioredis] initial connect failed:', err && err.message)
})

export default redis
