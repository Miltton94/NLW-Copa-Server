import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import ShortUniqueId from 'short-unique-id'
import { authenticate } from '../plugins/authenticate'

export const poolRoutes = async (app: FastifyInstance) => {
  app.get('/pools/count', async () => {
    const count = await prisma.pool.count()
    return { count }
  })

  app.post('/pools', async (request, reply) => {
    const createPoolSchema = z.object({
      title: z.string().min(1).max(255),
    })

    const { title } = createPoolSchema.parse(request.body)

    const generate = new ShortUniqueId({ length: 6 })
    const code = String(generate()).toUpperCase()

    try {
      await request.jwtVerify()

      await prisma.pool.create({
        data: {
          title,
          code,
          ownerId: request.user.sub,

          participants: {
            create: {
              userId: request.user.sub,
            },
          },
        },
      })
    } catch (error) {
      await prisma.pool.create({
        data: {
          title,
          code,
        },
      })
    }

    return reply.code(201).send({ code })
  })

  app.post(
    '/pools/join',
    { onRequest: [authenticate] },
    async (request, reply) => {
      const joinPoolBody = z.object({
        code: z.string().length(6),
      })

      const { code } = joinPoolBody.parse(request.body)

      const pool = await prisma.pool.findUnique({
        where: {
          code,
        },
        include: {
          participants: {
            where: {
              userId: request.user.sub,
            },
          },
        },
      })

      if (!pool) {
        return reply.status(400).send({ message: 'Pool not found' })
      }

      if (pool.participants.length > 0) {
        return reply.status(400).send({ message: 'User already joined pool' })
      }

      if (!pool.ownerId) {
        await prisma.pool.update({
          where: {
            id: pool.id,
          },
          data: {
            ownerId: request.user.sub,
          },
        })
      }

      await prisma.participant.create({
        data: {
          userId: request.user.sub,
          poolId: pool.id,
        },
      })

      return reply.code(201).send({ message: 'User joined pool' })
    },
  )

  app.get('/pools', { onRequest: [authenticate] }, async (request) => {
    const pools = await prisma.pool.findMany({
      where: {
        participants: {
          some: {
            userId: request.user.sub,
          },
        },
      },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          select: {
            id: true,

            user: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return { pools }
  })

  app.get(
    '/pools/:id',
    { onRequest: [authenticate] },
    async (request, reply) => {
      const getPoolParams = z.object({
        id: z.string(),
      })

      const { id } = getPoolParams.parse(request.params)

      const pool = await prisma.pool.findUnique({
        where: {
          id,
        },
        include: {
          _count: {
            select: {
              participants: true,
            },
          },
          participants: {
            select: {
              id: true,

              user: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      if (!pool) {
        return reply.status(404).send({ message: 'Pool not found' })
      }

      return { pool }
    },
  )
}
