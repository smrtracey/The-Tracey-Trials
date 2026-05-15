import { LongGameDecision } from '../models/LongGameDecision.js'

export function normalizeChoiceForScoring(choice) {
  return choice === 'no vote' ? 'cooperate' : choice
}

export function getLongGamePointsForChoices(choiceA, choiceB) {
  const normalizedChoiceA = normalizeChoiceForScoring(choiceA)
  const normalizedChoiceB = normalizeChoiceForScoring(choiceB)

  if (normalizedChoiceA === 'cooperate' && normalizedChoiceB === 'cooperate') {
    return {
      pointsA: 1,
      pointsB: 1,
    }
  }

  if (normalizedChoiceA === 'betray' && normalizedChoiceB === 'cooperate') {
    return {
      pointsA: 3,
      pointsB: 0,
    }
  }

  if (normalizedChoiceA === 'cooperate' && normalizedChoiceB === 'betray') {
    return {
      pointsA: 0,
      pointsB: 3,
    }
  }

  return {
    pointsA: 0,
    pointsB: 0,
  }
}

export async function resolveMatchupPoints(roundNumber, matchupKey) {
  const decisions = await LongGameDecision.find({ roundNumber, matchupKey })
    .select('_id username choice awardedPoints')
    .sort({ createdAt: 1 })

  if (decisions.length < 2) {
    return false
  }

  const [firstDecision, secondDecision] = decisions
  const { pointsA, pointsB } = getLongGamePointsForChoices(firstDecision.choice, secondDecision.choice)
  const resolvedAt = new Date()

  await LongGameDecision.bulkWrite([
    {
      updateOne: {
        filter: { _id: firstDecision._id },
        update: {
          $set: {
            awardedPoints: pointsA,
            resolvedAt,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: secondDecision._id },
        update: {
          $set: {
            awardedPoints: pointsB,
            resolvedAt,
          },
        },
      },
    },
  ])

  return true
}