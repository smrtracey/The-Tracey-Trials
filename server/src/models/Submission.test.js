import assert from 'node:assert/strict'
import test from 'node:test'
import { Submission } from './Submission.js'

function buildSubmission(mediaItems) {
  return {
    _id: {
      toString: () => 'submission-id',
    },
    taskNumber: 7,
    caption: '',
    textBody: '',
    mediaItems,
    mediaUrl: null,
    mediaType: mediaItems[0]?.type ?? null,
    originalName: mediaItems[0]?.originalName ?? null,
    createdAt: new Date('2026-07-30T12:00:00.000Z'),
    user: {
      username: 'contestant',
      displayName: 'Contestant',
      contestantNumber: 3,
    },
    done: false,
  }
}

test('serializes an R2 object key as a resolved URL without exposing the key', async () => {
  const submission = buildSubmission([
    {
      storageKey: 'submissions/user/task-7/file.png',
      url: '',
      type: 'image',
      originalName: 'evidence.png',
    },
  ])

  const clientSubmission = await Submission.toClient(submission, {
    resolveMediaUrl: async (mediaItem) => (
      `https://example.r2.cloudflarestorage.com/${mediaItem.storageKey}?X-Amz-Signature=test`
    ),
  })

  assert.equal(
    clientSubmission.mediaItems[0].url,
    'https://example.r2.cloudflarestorage.com/submissions/user/task-7/file.png?X-Amz-Signature=test',
  )
  assert.equal(clientSubmission.mediaItems[0].storageKey, undefined)
  assert.equal(clientSubmission.mediaUrl, clientSubmission.mediaItems[0].url)
})

test('preserves a legacy local media URL', async () => {
  const submission = buildSubmission([
    {
      storageKey: '',
      url: '/uploads/legacy.png',
      type: 'image',
      originalName: 'legacy.png',
    },
  ])

  const clientSubmission = await Submission.toClient(submission, {
    resolveMediaUrl: async (mediaItem) => mediaItem.url,
  })

  assert.equal(clientSubmission.mediaItems[0].url, '/uploads/legacy.png')
})
