import cors from 'cors'
import express from 'express'
import path from 'path'
import { env } from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import judgeRoutes from './routes/judgeRoutes.js'
import pushRoutes from './routes/pushRoutes.js'
import submissionRoutes from './routes/submissionRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use('/uploads', express.static(path.resolve('server/uploads')))

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/judge', judgeRoutes)
  app.use('/api/push', pushRoutes)
  app.use('/api/submissions', submissionRoutes)
  app.use('/api/tasks', taskRoutes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
