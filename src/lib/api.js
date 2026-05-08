// Mark a submission as done/undone (judge only)
export async function markSubmissionDone(token, submissionId, done) {
  return request(`/api/judge/submissions/${submissionId}/done`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ done }),
  })
}
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('Could not reach the server. Make sure the app is running and try again.')
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null
  const text = isJson ? '' : await response.text()

  if (!response.ok) {
    throw new Error(
      data?.message ?? text?.trim() ?? `${response.status} ${response.statusText}`,
    )
  }

  return data
}

export async function loginUser(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
}

export async function changePassword({
  token,
  newPassword,
  confirmPassword,
  contactEmail,
}) {
  return request('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      newPassword,
      confirmPassword,
      contactEmail,
    }),
  })
}

export async function fetchCurrentUser(token) {
  return request('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchSubmissions(token) {
  return request('/api/submissions', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createSubmission({ token, files = [], taskNumber, textBody, caption = '' }) {
  const formData = new FormData()
  formData.append('taskNumber', String(taskNumber))
  formData.append('textBody', textBody)
  formData.append('caption', caption)

  for (const file of files) {
    formData.append('media', file)
  }

  return request('/api/submissions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
}

export async function fetchCompletedTasks(token) {
  return request('/api/tasks', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchTaskDetails(token, displayNumber) {
  return request(`/api/tasks/display/${displayNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function updateTaskCompletion(token, taskNumber, isCompleted) {
  return request(`/api/tasks/${taskNumber}/completion`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isCompleted }),
  })
}

export async function updateCompletedTasks(token, completedTaskNumbers) {
  return request('/api/tasks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ completedTaskNumbers }),
  })
}

export async function fetchLongGameStatus(token) {
  return request('/api/tasks/long-game/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function saveLongGameChoice(token, choice) {
  return request('/api/tasks/long-game/choice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ choice }),
  })
}

export async function fetchJudgeSubmissions(token) {
  return request('/api/judge/submissions', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchJudgeTasks(token) {
  return request('/api/judge/tasks', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchJudgeLongGameRounds(token) {
  return request('/api/judge/long-game/rounds', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchJudgeLeaderboard(token) {
  return request('/api/judge/leaderboard', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function fetchVapidPublicKey() {
  return request('/api/push/vapid-public-key')
}

export async function savePushSubscription(token, subscription) {
  return request('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  })
}

export async function deletePushSubscription(token, endpoint) {
  return request('/api/push/subscribe', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint }),
  })
}

// Now supports recipients array
export async function sendJudgePushNotification(token, { title, body, recipients }) {
  return request('/api/judge/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, body, recipients }),
  })
}

// Notification Schema API
export async function fetchNotificationSchemas(token) {
  return request('/api/judge/notification-schemas', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function saveNotificationSchema(token, { name, notifications }) {
  return request('/api/judge/notification-schemas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, notifications }),
  })
}

export async function deleteNotificationSchema(token, name) {
  return request(`/api/judge/notification-schemas/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
