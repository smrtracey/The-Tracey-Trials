import { connectDatabase } from '../config/db.js'
import { Task } from '../models/Task.js'

const TASK_NUMBER = 16
const NEXT_DESCRIPTION =
  "You have 3 months to submit your task. In the following 3 months other players will try to complete the tasks you've made. Taskmaster will assign points based on how much he likes the task and how many other players completed them."

async function run() {
  await connectDatabase()

  const result = await Task.updateOne(
    { taskNumber: TASK_NUMBER },
    { $set: { description: NEXT_DESCRIPTION } },
  )

  const task = await Task.findOne({ taskNumber: TASK_NUMBER }).select('taskNumber title description')

  console.log(
    JSON.stringify(
      {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        task,
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
