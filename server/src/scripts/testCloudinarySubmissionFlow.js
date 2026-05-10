import dotenv from 'dotenv'

dotenv.config()

const apiBaseUrl = `http://127.0.0.1:${process.env.PORT ?? 4000}`
const starterPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TraceyTrials2026!'
const username = 'tau'

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9p8mN8kAAAAASUVORK5CYII='

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.message ?? `${response.status} ${response.statusText}`)
  }

  return data
}

async function main() {
  const loginResult = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password: starterPassword,
    }),
  })

  const authToken = loginResult.token
  const needsPasswordChange = Boolean(loginResult.user?.mustChangePassword)

  if (needsPasswordChange) {
    await requestJson('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        newPassword: 'CloudinaryTest123!',
        confirmPassword: 'CloudinaryTest123!',
        contactEmail: `tau+cloudinary-${Date.now()}@example.com`,
      }),
    })
  }

  const taskResult = await requestJson('/api/tasks', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  const taskNumber = taskResult.tasks?.[0]?.taskNumber

  if (!taskNumber) {
    throw new Error('No task number was available for the submission test.')
  }

  const formData = new FormData()
  formData.append('taskNumber', String(taskNumber))
  formData.append('textBody', 'Cloudinary upload smoke test.')
  formData.append(
    'media',
    new Blob([Buffer.from(tinyPngBase64, 'base64')], { type: 'image/png' }),
    'cloudinary-smoke-test.png',
  )

  const submissionResponse = await fetch(`${apiBaseUrl}/api/submissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  })

  const submissionData = await submissionResponse.json()

  if (!submissionResponse.ok) {
    throw new Error(submissionData?.message ?? `${submissionResponse.status} ${submissionResponse.statusText}`)
  }

  const mediaUrl = submissionData.submission?.mediaItems?.[0]?.url ?? submissionData.submission?.mediaUrl

  if (!mediaUrl) {
    throw new Error('Submission succeeded but no media URL was returned.')
  }

  if (!mediaUrl.startsWith('https://res.cloudinary.com/')) {
    throw new Error(`Expected a Cloudinary media URL, received: ${mediaUrl}`)
  }

  const submissionsResult = await requestJson('/api/submissions', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  const matchingSubmission = submissionsResult.submissions?.find(
    (submission) => submission.id === submissionData.submission?.id,
  )

  if (!matchingSubmission) {
    throw new Error('Uploaded submission was not found in the follow-up submissions fetch.')
  }

  console.log(`taskNumber=${taskNumber}`)
  console.log(`submissionId=${matchingSubmission.id}`)
  console.log(`mediaUrl=${mediaUrl}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})