import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { authenticate } from '../plugins/authenticate'

export const gamesRoutes = async (app: FastifyInstance) => {
  app.get(
    '/pools/:id/games',
    { onRequest: [authenticate] },
    async (request) => {
      const getPoolParams = z.object({
        id: z.string(),
      })

      const { id } = getPoolParams.parse(request.params)

      const games = await prisma.game.findMany({
        orderBy: {
          date: 'desc',
        },
        include: {
          guesses: {
            where: {
              participant: {
                poolId: id,
                userId: request.user.sub,
              },
            },
          },
        },
      })

      return {
        games: games.map((game) => {
          return {
            ...game,
            guess: game.guesses.length > 0 ? game.guesses[0] : null,
            guesses: undefined,
          }
        }),
      }
    },
  )
}
