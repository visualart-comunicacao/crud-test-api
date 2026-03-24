import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeDriver(driver) {
  return {
    id: driver.id,
    nome: driver.name,
    telefone: driver.phone,
    status: String(driver.status || 'DISPONIVEL').toLowerCase(),
    ativo: driver.isActive,
    createdAt: driver.createdAt,
    updatedAt: driver.updatedAt,
  }
}

async function list() {
  const drivers = await prisma.driver.findMany({
    where: { isActive: true },
    orderBy: [{ name: 'asc' }],
  })

  return drivers.map(normalizeDriver)
}

async function create({ nome, telefone }) {
  if (!nome?.trim()) throw createError('Nome é obrigatório')
  if (!telefone?.trim()) throw createError('Telefone é obrigatório')

  const driver = await prisma.driver.create({
    data: {
      name: nome.trim(),
      phone: telefone.trim(),
      status: 'DISPONIVEL',
      isActive: true,
    },
  })

  return normalizeDriver(driver)
}

export default {
  list,
  create,
}