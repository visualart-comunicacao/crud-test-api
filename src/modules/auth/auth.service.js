import prisma from '../../lib/prisma.js'
import { comparePassword, hashPassword } from '../../utils/hash.js'
import { signToken } from '../../utils/jwt.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function login({ username, password }) {
  if (!username || !password) {
    throw createError('Usuário e senha são obrigatórios')
  }

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user) {
    throw createError('Usuário ou senha inválidos', 401)
  }

  if (!user.isActive) {
    throw createError('Usuário inativo', 403)
  }

  const passwordMatch = await comparePassword(password, user.password)

  if (!passwordMatch) {
    throw createError('Usuário ou senha inválidos', 401)
  }

  const token = signToken({
    id: user.id,
    username: user.username,
    role: user.role,
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  }
}

async function me(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw createError('Usuário não encontrado', 404)
  }

  return user
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw createError('Senha atual e nova senha são obrigatórias')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw createError('Usuário não encontrado', 404)
  }

  const passwordMatch = await comparePassword(currentPassword, user.password)

  if (!passwordMatch) {
    throw createError('Senha atual inválida', 400)
  }

  const newHashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: newHashedPassword,
      mustChangePassword: false,
    },
  })

  return {
    message: 'Senha alterada com sucesso',
  }
}

export default {
  login,
  me,
  changePassword,
}