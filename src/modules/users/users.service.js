import prisma from '../../lib/prisma.js'
import { hashPassword } from '../../utils/hash.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

async function createUser({ name, username, password, role }) {
  if (!name || !username || !password) {
    throw createError('Nome, usuário e senha são obrigatórios')
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  })

  if (existingUser) {
    throw createError('Usuário já existe')
  }

  const hashedPassword = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name,
      username,
      password: hashedPassword,
      role,
    },
  })

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  }
}

async function updateUser(id, data) {
  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      role: data.role,
    },
  })

  return user
}

async function resetPassword(id) {
  const hashedPassword = await hashPassword('123456')

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
    },
  })

  return {
    message: 'Senha resetada para 123456',
  }
}

async function toggleStatus(id) {
  const user = await prisma.user.findUnique({
    where: { id },
  })

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: !user.isActive,
    },
  })

  return updated
}

export default {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  toggleStatus,
}