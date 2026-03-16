export default function errorMiddleware(error, req, res, next) {
  console.error(error)

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    })
  }

  return res.status(500).json({
    message: 'Erro interno do servidor',
  })
}