import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSubmissionArchiveFileName,
  buildSubmissionDownloadFileName,
  getSubmissionMediaSequenceNumber,
} from './submissionDownloadService.js'

test('continues media numbering across submissions for the same player and task', () => {
  const submissions = [
    { _id: 'first', mediaItems: [{}, {}, {}, {}] },
    { _id: 'second', mediaItems: [{}] },
  ]

  assert.equal(getSubmissionMediaSequenceNumber(submissions, 'first', 0), 1)
  assert.equal(getSubmissionMediaSequenceNumber(submissions, 'first', 3), 4)
  assert.equal(getSubmissionMediaSequenceNumber(submissions, 'second', 0), 5)
})

test('counts legacy single-file submissions in the sequence', () => {
  const submissions = [
    { _id: 'legacy', mediaItems: [], mediaUrl: '/uploads/photo.jpg', mediaType: 'image' },
    { _id: 'current', mediaItems: [{}, {}] },
  ]

  assert.equal(getSubmissionMediaSequenceNumber(submissions, 'current', 1), 3)
})

test('builds a safe descriptive filename and preserves the original extension', () => {
  assert.equal(
    buildSubmissionDownloadFileName({
      playerName: 'Katy',
      taskName: 'Needle Little Help',
      sequenceNumber: 5,
      originalName: 'IMG_1234.JPG',
      contentType: 'image/jpeg',
    }),
    'Katy_Needle_Little_Help_5.JPG',
  )
})

test('uses the media content type when the original filename has no extension', () => {
  assert.equal(
    buildSubmissionDownloadFileName({
      playerName: 'Will',
      taskName: 'Sun/believable?',
      sequenceNumber: 2,
      originalName: 'upload',
      contentType: 'video/mp4',
    }),
    'Will_Sunbelievable_2.mp4',
  )
})

test('builds a safe archive filename', () => {
  assert.equal(
    buildSubmissionArchiveFileName('Katy', 'All Submissions'),
    'Katy_All_Submissions.zip',
  )
})
