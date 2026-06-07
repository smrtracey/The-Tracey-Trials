import { connectDatabase } from '../config/db.js'
import { Task } from '../models/Task.js'

const TASK_NUMBER = 2
const PREVIOUS_TITLE = 'Rope Jam Showdown'
const NEXT_TITLE = 'Jumping to Conclusions'

async function run() {
  try {
    await connectDatabase()

    const result = await Task.updateOne(
      { taskNumber: TASK_NUMBER, title: PREVIOUS_TITLE },
      { $set: { title: NEXT_TITLE } },
    )

    const task = await Task.findOne({ taskNumber: TASK_NUMBER }).select('taskNumber title')

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
  } finally {
    process.exit(0)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
