import { connectDatabase } from '../config/db.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'

const ALL = 'all'

const tasks = [
  {
    taskNumber: 1,
    title: 'Shared Secrets',
    goal: 'Work together to figure out the password.',
    description:
      "You've all been given private hints. You'll need to work together to figure the password. However, points will only be rewarded to the first 3 players to correctly enter the password.",
    players: ALL,
    mandatory: true,
    category: 'race',
  },
  {
    taskNumber: 2,
    title: 'Rope Jam Showdown',
    goal: 'Improve your skipping the most',
    description: "You'll have 30 seconds on Finale day to improve on your day 1 score",
    players: ALL,
  },
  {
    taskNumber: 3,
    title: 'Gotta go Fast!',
    goal: 'Be the first person to take a selfie with a celebrity',
    description:
      "The celebrity can't be just someone in the background like on a stage or whatever. Also must be someone the taskmaster knows. Bonus points for taskmaster shoutouts.",
    players: ALL,
    category: 'race',
  },
  {
    taskNumber: 4,
    title: 'Crowd Control!',
    goal: 'Start the biggest group chant.',
    description:
      'Must include at least 10 people. The taskmaster will factor in the location of the chant. Chant at a concert - pretty easy. Chant at a funeral - pretty tough...',
    players: ALL,
  },
  {
    taskNumber: 5,
    title: 'Laugh Track Record',
    goal: 'Get the best video of another player laughing.',
    description:
      'This will go to a group vote. I want to see people laughing so hard they cry!',
    players: ALL,
  },
  {
    taskNumber: 6,
    title: 'Friendship Farming',
    goal: 'Make the most new friends!',
    description:
      "A friend is someone you've been out with after the first time you've met. That means for this task, you need to submit a photo/video of when you met and another photo with the same person at a later date. (No group photos allowed). You'll need to include your new friends names.",
    players: ALL,
  },
  {
    taskNumber: 7,
    title: 'Side questing',
    goal: 'Complete the most tasks.',
    description: 'Top 3 players with most completed tasks get points here.',
    players: ALL,
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
    description:
      'I like hats. I will pick my favourite. You have 20 euro to spend on the hat of your choice.',
    players: ALL,
  },
  {
    taskNumber: 10,
    title: "I don't care about your sleep schedule.",
    goal: 'Take the best sunrise and sunset photo on the same day.',
    description:
      "You'll need to either submit 2 timestamped photos for this one or get a timelapse from sunrise to sunset. Hope nobody steals your goPro during the timelapse...",
    players: ALL,
  },
  {
    taskNumber: 11,
    title: 'Digital Child Neglect Challenge',
    goal: 'Keep a Tamagotchi alive the longest.',
    description:
      "You only get ONE submission. If you think it's gonna die tomorrow, submit today. Longest living tamagotchi wins.",
    players: ALL,
  },
  {
    taskNumber: 12,
    title: 'For One Day Only!',
    goal: 'Make the best single day documentary.',
    description:
      'This can be any style you like on any day you like. Interviews, narration, POV, anything you want. Submissions must be a video.',
    players: ALL,
  },
  {
    taskNumber: 13,
    title: 'The Highlight Reel',
    goal: 'Get the most GoPro worthy videos over the next 6 months.',
    description:
      "Get the most cool action shots. They can be of anything. Even mundane daily stuff. If I see an amazing tea making video that's better than a deep sea diving video, it's getting points. Variety matters here. Adri and Marika only get one kickass bike video/climbing video each. But submit lots for fun.",
    players: ALL,
  },
  {
    taskNumber: 14,
    title: "It's a tradition - they expect it",
    goal: 'Steal the Best Glass.',
    description:
      "I like glasses. You may steal only from a pub. Not from people's homes. I'll decide which glass is my favourite. Need to upload photo/video evidence of the glass and present the glass on or before the finale.",
    players: ALL,
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
    title: 'This taskmaster thing is harder than it looks.',
    goal: 'Create the best Task',
    description:
      "You have 3 months to submit your task. In the following 3 months other players will try to complete the tasks you've made. You get points for how much I like the tasks and bonus points if people complete them.",
    players: ['tau', 'adriana', 'maria', 'pierce'],
    category: 'timed',
    deadlineLabel: 'September 15th',
    deadlineAt: '2026-09-15T23:59:59.000Z',
  },
  {
    taskNumber: 17,
    title: 'In their natural habitat',
    goal: 'Get the best collection of candid photos of other players.',
    description:
      "These can be taken at any time and of everyone but must be taken without the other players realizing. This task is capped at 20 photo submissions per player.",
    players: ['tau', 'maria', 'marika', 'adriana', 'will', 'cathal', 'pierce', 'danny'],
  },
  {
    taskNumber: 18,
    title: 'The Dutch Job',
    goal: 'Get the most candid photos with other players',
    description:
      "Katy-specific variant: get photos with any 3 other players where they don't realize you're there. Flight support and disguise budget can be coordinated with Mikaela.",
    players: ['katy'],
  },
  {
    taskNumber: 19,
    title: "Let's get Quizical",
    goal: 'As a team, submit 20 questions for a table quiz.',
    description:
      'Quiz played in person at the finale. If nobody from other teams can answer your team\'s question, your team loses a point.',
    players: ALL,
    mandatory: true,
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
    category: 'special',
  },
  {
    taskNumber: 21,
    title: 'Eggscessive Engineering',
    goal: 'Create a Rube Goldberg Machine to crack an egg.',
    description:
      'Done as teams of 3 with role constraints. First submission decides the order constraints.',
    players: ALL,
    deadlineLabel: 'September 15th',
    deadlineAt: '2026-09-15T23:59:59.000Z',
  },
  {
    taskNumber: 22,
    title: "Taskmaster's Day Off",
    goal: 'Complete the task the other player submitted',
    description: 'Details to follow.',
    players: ['marika', 'will', 'cathal', 'katy'],
    category: 'timed',
  },
  {
    taskNumber: 23,
    title: "Listen, all y'all, it's a sabotage!!",
    goal: 'Choose the right player for the tasks',
    description:
      "Assign create-tasks to players most likely to complete them. You may change ONE word in ONE task; bonus points for improving it.",
    players: ['danny'],
  },
  {
    taskNumber: 24,
    title: 'TaskMasterChef',
    goal: 'Create the best homemade recipe and instructional video.',
    description:
      'You have 3 months to submit a home recipe in writing and an instructional video. Taskmaster will cook and rank submissions.',
    players: ALL,
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
        hasTimeConstraint: Boolean(task.deadlineLabel || task.deadlineAt),
        mandatory: Boolean(task.mandatory),
        category:
          task.category ??
          (task.deadlineLabel || task.deadlineAt ? 'timed' : 'common'),
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
      category:
        task.category ??
        (task.deadlineLabel || task.deadlineAt ? 'timed' : 'common'),
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
