import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'change_me'

export interface AuthRequest extends Request {
  user?: any
}

export function generateToken(payload: object, expiresIn = '1h') {
  // cast to any to accommodate differences in jsonwebtoken typings across versions
  return (jwt as any).sign(payload, JWT_SECRET, { expiresIn })
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ error: 'missing authorization header' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' })
  }
}
