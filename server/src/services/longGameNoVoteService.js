import { longGameSchedule } from '../data/longGameSchedule.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { User } from '../models/User.js'
import { resolveMatchupPoints } from './longGameScoringService.js'

const LONG_GAME_NO_VOTE_INTERVAL_MS = 30 * 1000

function getMatchupKey(roundNumber, usernameA, usernameB) {
  const [firstPlayer, secondPlayer] = [usernameA, usernameB]
    .map((value) => value.trim().toLowerCase())
    .sort()

  return `${roundNumber}:${firstPlayer}:${secondPlayer}`
}

function getRoundCloseTime(round) {
  return new Date(`${round.endDate}T23:59:59Z`)
}

async function fillMissingVotesForRound(round, usersByUsername) {
  const decisions = await LongGameDecision.find({ roundNumber: round.roundNumber }).lean()
  const decided = new Set(decisions.map((decision) => `${decision.username}:${decision.opponentUsername}`))
  const affectedMatchupKeys = new Set()
  const operations = []
  const resolutionTime = getRoundCloseTime(round)

  for (const [playerA, playerB] of round.matchups) {
    const matchupKey = getMatchupKey(round.roundNumber, playerA, playerB)

    for (const [username, opponentUsername] of [[playerA, playerB], [playerB, playerA]]) {
      const decisionKey = `${username}:${opponentUsername}`

      if (decided.has(decisionKey)) {
        continue
      }

      const user = usersByUsername.get(username)
      if (!user) {
        continue
      }

      operations.push({
        insertOne: {
          document: {
            user: user._id,
            roundNumber: round.roundNumber,
            username,
            opponentUsername,
            matchupKey,
            choice: 'no vote',
            autoCooperate: true,
            awardedPoints: null,
            resolvedAt: null,
            createdAt: resolutionTime,
            updatedAt: resolutionTime,
          },
        },
      })
      affectedMatchupKeys.add(matchupKey)
    }
  }

  if (operations.length === 0) {
    return 0
  }

  await LongGameDecision.bulkWrite(operations)

  for (const matchupKey of affectedMatchupKeys) {
    await resolveMatchupPoints(round.roundNumber, matchupKey)
  }

  return operations.length
}

export async function fillMissingVotesForCompletedRounds() {
  const now = new Date()
  const completedRounds = longGameSchedule.filter((round) => now >= getRoundCloseTime(round))

  if (completedRounds.length === 0) {
    return 0
  }

  const users = await User.find({ role: 'contestant' }).select('_id username').lean()
  const usersByUsername = new Map(users.map((user) => [user.username.trim().toLowerCase(), user]))
  let insertedCount = 0

  for (const round of completedRounds) {
    insertedCount += await fillMissingVotesForRound(round, usersByUsername)
  }

  return insertedCount
}

export function startLongGameNoVoteProcessor() {
  async function runCycle() {
    try {
      const insertedCount = await fillMissingVotesForCompletedRounds()
      if (insertedCount > 0) {
        console.log(`Filled ${insertedCount} missing long-game votes as no vote.`)
      }
    } catch (error) {
      console.error('Failed to fill missing long-game votes', error)
    }
  }

  void runCycle()
  return setInterval(runCycle, LONG_GAME_NO_VOTE_INTERVAL_MS)
}