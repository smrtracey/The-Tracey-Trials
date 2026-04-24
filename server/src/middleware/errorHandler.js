export function notFoundHandler(_request, response) {
  response.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(error, _request, response, _next) {
  void _next
  console.error(error)

  if (response.headersSent) {
    return
  }

  response.status(error.statusCode ?? 500).json({
    message: error.message ?? 'Unexpected server error.',
  })
}
