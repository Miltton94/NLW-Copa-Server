import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

import { authRoutes } from './routes/auth'
import { guessRoutes } from './routes/guess'
import { poolRoutes } from './routes/pool'
import { gamesRoutes } from './routes/games'

const app = fastify({
  logger: true,
})

app.register(cors, {})

// Em produção, o JWT_SECRET deve ser uma variável de ambiente

app.register(jwt, {
  secret: 'nlwcopa',
})

app.register(authRoutes)
app.register(guessRoutes)
app.register(poolRoutes)
app.register(gamesRoutes)

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('Server is running on port 3333')
})
