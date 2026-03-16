import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function list() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

async function create({ nome, ordem }) {
  if (!nome) {
    throw createError('Nome da categoria é obrigatório')
  }

  return prisma.category.create({
    data: {
      name: nome,
      sortOrder: ordem ?? 0,
      isActive: true,
    },
  })
}

async function toggleStatus(id) {
  const category = await prisma.category.findUnique({ where: { id } })

  if (!category) {
    throw createError('Categoria não encontrada', 404)
  }

  return prisma.category.update({
    where: { id },
    data: {
      isActive: !category.isActive,
    },
  })
}

export default {
  list,
  create,
  toggleStatus,
}