import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'

export async function requireAuth(request, response, next) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return response.status(401).json({ message: 'Authentication is required.' })
  }

  try {
    const token = authorization.slice(7)
    const payload = jwt.verify(token, env.jwtSecret)
    const user = await User.findById(payload.sub)

    if (!user) {
      return response.status(401).json({ message: 'Session is no longer valid.' })
    }

    request.user = user
    return next()
  } catch {
    return response.status(401).json({ message: 'Invalid or expired token.' })
  }
}
