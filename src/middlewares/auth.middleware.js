import { verifyToken } from '../utils/jwt.js'

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não informado',
    })
  }

  const [, token] = authHeader.split(' ')

  if (!token) {
    return res.status(401).json({
      message: 'Token não informado',
    })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({
      message: 'Token inválido',
    })
  }
}