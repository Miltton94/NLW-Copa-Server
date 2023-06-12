import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { authenticate } from '../plugins/authenticate'

export const authRoutes = async (app: FastifyInstance) => {
  app.get(
    '/me',
    {
      onRequest: [authenticate],
    },
    async (request) => {
      return { user: request.user }
    },
  )

  app.post('/users', async (request) => {
    const createUserBody = z.object({
      access_token: z.string(),
    })

    const { access_token } = createUserBody.parse(request.body)

    const userResponse = await fetch(
      'https://www.googleapis.com/userinfo/v2/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    )

    const userData = await userResponse.json()

    const userInfoSchema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      picture: z.string().url(),
    })

    const userInfo = userInfoSchema.parse(userData)

    let user = await prisma.user.findUnique({
      where: {
        googleId: userInfo.id,
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.picture,
        },
      })
    }

    const token = app.jwt.sign(
      { name: user.name, avatarUrl: user.avatarUrl },
      { sub: user.id, expiresIn: '7 days' },
    )

    return { token }
  })

  app.get('/users/count', async () => {
    const count = await prisma.user.count()
    return { count }
  })
}
