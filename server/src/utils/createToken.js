import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      username: user.username,
      contestantNumber: user.contestantNumber,
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: '12h' },
  )
}
