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

function getResponseFileName(response) {
  const contentDisposition = response.headers.get('content-disposition') ?? ''
  const encodedFileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)

  if (encodedFileNameMatch) {
    try {
      return sanitizeFileName(decodeURIComponent(encodedFileNameMatch[1]))
    } catch {
      // Fall through to the basic filename value.
    }
  }

  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"|filename=([^;]+)/i)
  return sanitizeFileName(fileNameMatch?.[1] ?? fileNameMatch?.[2] ?? '')
}

export async function downloadFile(url, fileName = '', token = '') {
  const response = await fetch(url, {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : undefined,
  })

  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const errorBody = isJson ? await response.json() : null
    throw new Error(errorBody?.message || `Download failed with status ${response.status}`)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const responseFileName = getResponseFileName(response)

  anchor.href = objectUrl
  anchor.download = fileName || responseFileName || 'download'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(objectUrl)
}
