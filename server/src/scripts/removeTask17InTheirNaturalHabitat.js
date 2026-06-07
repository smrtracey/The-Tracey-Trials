import { connectDatabase } from '../config/db.js'
import { Task } from '../models/Task.js'
import { Submission } from '../models/Submission.js'
import { User } from '../models/User.js'

const TASK_NUMBER = 17

async function run() {
  await connectDatabase()

  const [taskDeleteResult, submissionDeleteResult, userUpdateResult] = await Promise.all([
    Task.deleteMany({ taskNumber: TASK_NUMBER }),
    Submission.deleteMany({ taskNumber: TASK_NUMBER }),
    User.updateMany(
      {
        $or: [
          { completedTaskNumbers: TASK_NUMBER },
          { pinnedTaskNumbers: TASK_NUMBER },
        ],
      },
      {
        $pull: {
          completedTaskNumbers: TASK_NUMBER,
          pinnedTaskNumbers: TASK_NUMBER,
        },
      },
    ),
  ])

  const validation = {
    remainingTasks: await Task.countDocuments({ taskNumber: TASK_NUMBER }),
    remainingSubmissions: await Submission.countDocuments({ taskNumber: TASK_NUMBER }),
    usersStillReferencingTask: await User.countDocuments({
      $or: [{ completedTaskNumbers: TASK_NUMBER }, { pinnedTaskNumbers: TASK_NUMBER }],
    }),
  }

  console.log(
    JSON.stringify(
      {
        taskDeleted: taskDeleteResult.deletedCount,
        submissionsDeleted: submissionDeleteResult.deletedCount,
        usersUpdated: userUpdateResult.modifiedCount,
        validation,
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
