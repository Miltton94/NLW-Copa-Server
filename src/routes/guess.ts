import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../plugins/authenticate'
import { z } from 'zod'

export const guessRoutes = async (app: FastifyInstance) => {
  app.get('/guesses/count', async () => {
    const count = await prisma.guess.count()
    return { count }
  })

  app.post(
    '/pools/:poolId/games/:gameId/guesses',
    { onRequest: [authenticate] },
    async (request, reply) => {
      const createGuessParams = z.object({
        poolId: z.string(),
        gameId: z.string(),
      })

      const createGuessBody = z.object({
        firstTeamPoints: z.number(),
        secondTeamPoints: z.number(),
      })

      const { poolId, gameId } = createGuessParams.parse(request.params)
      const { firstTeamPoints, secondTeamPoints } = createGuessBody.parse(
        request.body,
      )

      const participant = await prisma.participant.findUnique({
        where: {
          userId_poolId: {
            poolId,
            userId: request.user.sub,
          },
        },
      })

      if (!participant) {
        reply.status(404).send({
          error: 'Participant not found',
        })
        return
      }

      const guess = await prisma.guess.findUnique({
        where: {
          participantId_gameId: {
            gameId,
            participantId: participant.id,
          },
        },
      })

      if (guess) {
        reply.status(400).send({
          message: 'Guess already exists',
        })

        return
      }

      const game = await prisma.game.findUnique({
        where: {
          id: gameId,
        },
      })

      if (!game) {
        reply.status(400).send({
          error: 'Game not found',
        })
        return
      }

      // if (game.date < new Date()) {
      //   reply.status(400).send({
      //     error: 'Game already started',
      //   })
      //   return
      // }

      if (firstTeamPoints < 0 || secondTeamPoints < 0) {
        reply.status(400).send({
          error: 'Invalid points',
        })
        return
      }

      await prisma.guess.create({
        data: {
          gameId,
          participantId: participant.id,
          firstTeamPoints,
          secondTeamPoints,
        },
      })
      return reply.status(201).send()
    },
  )
}
