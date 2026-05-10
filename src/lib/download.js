function getFileExtension(fileName) {
  if (!fileName) {
    return ''
  }

  const extensionIndex = fileName.lastIndexOf('.')

  if (extensionIndex <= 0 || extensionIndex === fileName.length - 1) {
    return ''
  }

  return fileName.slice(extensionIndex)
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]/g, '-').trim()
}

export function buildDownloadFileName(fileName, requestedName) {
  const defaultName = fileName || 'download'

  const trimmedName = sanitizeFileName(requestedName)

  if (!trimmedName) {
    return defaultName
  }

  const originalExtension = getFileExtension(defaultName)
  const nextExtension = getFileExtension(trimmedName)

  if (originalExtension && !nextExtension) {
    return `${trimmedName}${originalExtension}`
  }

  return trimmedName
}

export async function downloadFile(url, fileName) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = fileName || 'download'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(objectUrl)
}