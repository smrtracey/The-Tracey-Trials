import { connectDatabase } from '../config/db.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'

const ALL = 'all'
const LEGACY_TASK_CATEGORIES = ['common', 'race', 'individual', 'timed', 'special']

const tasks = [
  {
    taskNumber: 1,
    title: 'Shared Secrets',
    goal: 'Work together to figure out the password.',
    description:
      "You've all been given private hints. You'll need to work together to figure the password. However, points will only be rewarded to the first 3 players to correctly enter the password.",
    players: ALL,
    mandatory: true,
    hasSubmission: false,
    category: 'race',
  },
  {
    taskNumber: 2,
    title: 'Rope Jam Showdown',
    goal: 'Improve your skipping the most',
    description: "You'll have 30 seconds on Finale day to improve on your day 1 score",
    players: ALL,
    taskTypes: ['physical'],
    hasSubmission: false,
  },
  {
    taskNumber: 3,
    title: 'Gotta go Fast!',
    goal: 'Be the first person to take a selfie with a celebrity',
    description:
      "The celebrity can't be just someone in the background like on a stage or whatever. Also must be someone the taskmaster knows. Bonus points for taskmaster shoutouts.",
    players: ALL,
    taskTypes: ['race', 'social'],
    category: 'race',
  },
  {
    taskNumber: 4,
    title: 'Crowd Control!',
    goal: 'Start the biggest group chant.',
    description:
      'Must include at least 10 people. The taskmaster will factor in the location of the chant. Chant at a concert - pretty easy. Chant at a funeral - pretty tough...',
    players: ALL,
    taskTypes: ['social'],
  },
  {
    taskNumber: 5,
    title: 'Laugh Track Record',
    goal: 'Get the best video of another player laughing.',
    description: 'The taskmaster wants to see people laughing so hard they cry!',
    players: ALL,
    taskTypes: ['social'],
  },
  {
    taskNumber: 6,
    title: 'Friendship Farming',
    goal: 'Make the most new friends!',
    description:
      "A friend is someone you've been out with after the first time you've met. That means for this task, you need to submit a photo/video of when you met and another photo with the same person at a later date. (No group photos allowed). You'll need to include your new friends names.",
    players: ALL,
    taskTypes: ['social'],
  },
  {
    taskNumber: 7,
    title: 'Side questing',
    goal: 'Complete the most tasks.',
    description: 'Top 3 players with most completed tasks get points here.',
    players: ALL,
    hasSubmission: false,
  },
  {
    taskNumber: 8,
    title: 'Pitch Imperfect',
    goal: 'Perform the best Karaoke.',
    description:
      'No points here for singing talent. Judging will be based on song choice, costume, and stage presence. You may team up with other players for this one!',
    players: ALL,
  },
  {
    taskNumber: 9,
    title: "Hat's Off",
    goal: 'Get the taskmaster the best hat.',
    description: 'The taskmaster likes hats. The Taskmaster will pick his favourite.',
    players: ALL,
    taskTypes: ['fetch quest'],
    hasSubmission: false,
  },
  {
    taskNumber: 10,
    title: "Sunbelievable",
    goal: 'Take the best sunrise and sunset photo on the same day.',
    description:
      "You'll need to either submit 2 timestamped photos for this one or get a timelapse from sunrise to sunset. Hope nobody steals your goPro during the timelapse...",
    players: ALL,
  },
  {
    taskNumber: 11,
    title: 'The Grim Beeper',
    goal: 'Keep a Tamagotchi alive the longest.',
    description:
      "You only get ONE submission. If you think it's gonna die tomorrow, submit today. Longest living tamagotchi wins.",
    players: ALL,
    taskTypes: ['autocomplete'],
  },
  {
    taskNumber: 12,
    title: 'Doc-YOU-mentary',
    goal: 'Make the best single day documentary.',
    description: 'This can be any style you like on any day you like. Interviews, narration, POV, up to you. Submissions must be a video.',
    players: ALL,
    taskTypes: ['goPro'],
  },
  {
    taskNumber: 13,
    title: 'GoPro or Go Home',
    goal: 'Get the best collection of GoPro videos over the next 6 months',
    description:
      "Videos can range from something as mundane as making a cup of tea to base jumping. Variety matters. Marika and Adriana can't just submit a bunch of motorbike vids...",
    players: ALL,
    taskTypes: ['goPro'],
  },
  {
    taskNumber: 14,
    title: 'No Half-Assed Glass Task',
    goal: 'Steal the best glass for the taskmaster.',
    description:
      "The taskmaster like glasses. You may steal only from a pub. Not from people's homes.(With the margins they have on drinks,you've more than covered the cost of the glass. Don't feel too guilty!) The taskmaster will decide which glass is his favourite. Need to upload photo/video evidence of the glass and present the glass on or before the finale.",
    players: ALL,
    taskTypes: ['fetch quest'],
  },
  {
    taskNumber: 15,
    title: 'Love is in the Air',
    goal: 'Take this beach ball on the most romantic date.',
    description:
      "This one is a little bit different so that I get to play a little prank on our Danny Boy. Everyone except for Dan gets a beach ball. Dan however gets a sex doll with the same task. If at any point during the competition Dan finds out that he's the only one with a sex doll, he'll get 5 points and everyone else gets 0. Should it come up in conversation, Dan should think everyone has a sex doll.",
    players: ['tau', 'marika', 'maria', 'adriana', 'will', 'cathal', 'pierce', 'katy'],
  },
  {
    taskNumber: 16,
    title: 'Task and you shall receive',
    goal: 'Create the best Task',
    description:
      "You have 3 months to submit your task. In the following 3 months other players will try to complete the tasks you've made. You get points for how much I like the tasks and bonus points if people complete them.",
    players: ALL,
    taskTypes: ['timed'],
    category: 'timed',
    deadlineLabel: 'September 15th',
    deadlineAt: '2026-09-15T23:59:59.000Z',
  },
  {
    taskNumber: 17,
    title: 'In their natural habitat',
    goal: 'Get the best collection of candid photos of other players.',
    description: 'These can be taken at any time and of anyone but must no other players can see the photos till finale day. (Max 10 photos)',
    players: ['tau', 'maria', 'marika', 'adriana', 'will', 'cathal', 'pierce', 'danny'],
    taskTypes: ['fetch quest'],
  },
  {
    taskNumber: 18,
    title: 'The Dutch Job',
    goal: 'Get the most candid photos with other players',
    description:
      "Katy-specific variant: get photos with any 3 other players where they don't realize you're there. Flight support and disguise budget can be coordinated with Mikaela.",
    players: ['katy'],
    taskTypes: ['just for you'],
  },
  {
    taskNumber: 19,
    title: "Let's get Quizical",
    goal: 'As a team, submit 20 questions for a table quiz.',
    description:
      'Quiz will likely be on finale day but date not finalized. Submit 20 quiz questions as a team of 3. On quiz day, everyone will compete individually using the questions submitted by the teams. Your questions should be fun, fair, and answerable. If one of your team’s questions is asked and nobody gets it right, you lose points.',
    players: ALL,
    mandatory: true,
    taskTypes: ['timed', 'team'],
    category: 'timed',
  },
  {
    taskNumber: 20,
    title: 'The Long Game',
    goal: 'Over the course of the competition, earn the most points by going head to head with other players.',
    description:
      "Recurring decision-based challenge. Every couple of weeks, players are paired and choose to cooperate or betray.",
    players: ALL,
    mandatory: true,
    taskTypes: ['recurring'],
    hasSubmission: false,
    category: 'special',
  },
  {
    taskNumber: 21,
    title: 'Eggscessive Engineering',
    goal: 'Create a Rube Goldberg Machine to crack an egg.',
    description:
      'Form a team of 3 players. Then you need to submit the following:\n1. 5 household items\n2. An order of numbers 1-5 (for example 3,2,1,5,4)\n3. A designated builder from your team.',
    players: ALL,
    taskTypes: ['team', 'timed'],
    category: 'timed',
    deadlineLabel: 'September 15th',
    deadlineAt: '2026-09-15T23:59:59.000Z',
  },
  {
    taskNumber: 22,
    title: 'Task and You Shall Receive (Part 2)',
    goal: 'Complete the task the other player submitted',
    description:
      "This task becomes available later in the competition. Once it unlocks, you'll be assigned a task submitted by another player and will need to complete it before the final judging.",
    players: ALL,
    taskTypes: ['upcoming'],
    hasSubmission: true,
  },
  {
    taskNumber: 24,
    title: 'TaskMasterChef',
    goal: 'Create the best homemade recipe and instructional video.',
    description:
      'You have 3 months to submit a home recipe in writing and an instructional video. Taskmaster will cook and rank submissions.',
    players: ALL,
    taskTypes: ['timed'],
    category: 'timed',
  },
  {
    taskNumber: 25,
    title: 'Love is in the Air',
    goal: 'Bring your sex doll on the most romantic date',
    description: 'I want to feel the love',
    players: ['danny'],
  },
]

function normalizeUsernames(inputPlayers) {
  if (inputPlayers === ALL) {
    return ALL
  }

  return inputPlayers.map((name) => name.trim().toLowerCase())
}

async function resolveAssignedUsers(players) {
  if (players === ALL) {
    return {
      audience: 'all',
      assignedUserIds: [],
      assignedUsernames: [],
    }
  }

  const usernames = normalizeUsernames(players)
  const users = await User.find({ username: { $in: usernames } })

  if (users.length !== usernames.length) {
    const found = new Set(users.map((user) => user.username))
    const missing = usernames.filter((username) => !found.has(username))
    throw new Error(`Task assignment failed. Missing users: ${missing.join(', ')}`)
  }

  return {
    audience: 'selected',
    assignedUserIds: users.map((user) => user._id),
    assignedUsernames: usernames,
  }
}

function getTaskTypes(task) {
  if (Array.isArray(task.taskTypes) && task.taskTypes.length > 0) {
    return task.taskTypes
  }

  return [task.category ?? (task.deadlineLabel || task.deadlineAt ? 'timed' : 'common')]
}

function getLegacyCategory(task) {
  if (task.category && LEGACY_TASK_CATEGORIES.includes(task.category)) {
    return task.category
  }

  return getTaskTypes(task).find((value) => LEGACY_TASK_CATEGORIES.includes(value)) ?? (task.deadlineLabel || task.deadlineAt ? 'timed' : 'common')
}

async function seedTasks() {
  await connectDatabase()

  for (const task of tasks) {
    const assignment = await resolveAssignedUsers(task.players)

    await Task.findOneAndUpdate(
      { taskNumber: task.taskNumber },
      {
        taskNumber: task.taskNumber,
        title: task.title,
        goal: task.goal,
        description: task.description,
        ...assignment,
        taskTypes: getTaskTypes(task),
        hasSubmission: task.hasSubmission !== false,
        hasTimeConstraint: Boolean(task.deadlineLabel || task.deadlineAt),
        mandatory: Boolean(task.mandatory),
        category: getLegacyCategory(task),
        deadlineLabel: task.deadlineLabel ?? '',
        deadlineAt: task.deadlineAt ? new Date(task.deadlineAt) : null,
        isActive: true,
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    )
  }

  await Task.deleteMany({ taskNumber: { $nin: tasks.map((task) => task.taskNumber) } })

  console.table(
    tasks.map((task) => ({
      taskNumber: task.taskNumber,
      title: task.title,
      audience: task.players === ALL ? 'all' : 'selected',
      mandatory: Boolean(task.mandatory),
      category: getLegacyCategory(task),
      taskTypes: getTaskTypes(task).join(', '),
      hasSubmission: task.hasSubmission !== false,
      hasTimeConstraint: Boolean(task.deadlineLabel || task.deadlineAt),
      deadlineLabel: task.deadlineLabel ?? '',
    })),
  )

  process.exit(0)
}

seedTasks().catch((error) => {
  console.error('Failed to seed tasks', error)
  process.exit(1)
})
