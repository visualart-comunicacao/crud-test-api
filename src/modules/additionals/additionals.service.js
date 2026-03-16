import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function list() {
  return prisma.additional.findMany({
    orderBy: [{ name: 'asc' }],
  })
}

async function create({ nome, preco }) {
  if (!nome) {
    throw createError('Nome do adicional é obrigatório')
  }

  return prisma.additional.create({
    data: {
      name: nome,
      price: preco ?? 0,
      isActive: true,
    },
  })
}

async function toggleStatus(id) {
  const additional = await prisma.additional.findUnique({ where: { id } })

  if (!additional) {
    throw createError('Adicional não encontrado', 404)
  }

  return prisma.additional.update({
    where: { id },
    data: {
      isActive: !additional.isActive,
    },
  })
}

export default {
  list,
  create,
  toggleStatus,
}