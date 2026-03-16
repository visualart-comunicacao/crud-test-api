import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeTable(table) {
  return {
    id: table.id,
    numero: table.number,
    nome: table.name,
    status: table.status,
    ativo: table.isActive,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  }
}

async function list() {
  const tables = await prisma.restaurantTable.findMany({
    orderBy: [{ number: 'asc' }],
  })

  return tables.map(normalizeTable)
}

async function create({ numero, nome }) {
  if (!numero) {
    throw createError('Número da mesa é obrigatório')
  }

  const existing = await prisma.restaurantTable.findUnique({
    where: { number: Number(numero) },
  })

  if (existing) {
    throw createError('Já existe uma mesa com esse número')
  }

  const table = await prisma.restaurantTable.create({
    data: {
      number: Number(numero),
      name: nome || null,
      status: 'LIVRE',
      isActive: true,
    },
  })

  return normalizeTable(table)
}

async function update(id, { numero, nome, status }) {
  const existing = await prisma.restaurantTable.findUnique({
    where: { id },
  })

  if (!existing) {
    throw createError('Mesa não encontrada', 404)
  }

  if (numero && Number(numero) !== existing.number) {
    const numberInUse = await prisma.restaurantTable.findUnique({
      where: { number: Number(numero) },
    })

    if (numberInUse) {
      throw createError('Já existe uma mesa com esse número')
    }
  }

  const updated = await prisma.restaurantTable.update({
    where: { id },
    data: {
      number: numero ? Number(numero) : existing.number,
      name: nome !== undefined ? nome : existing.name,
      status: status || existing.status,
    },
  })

  return normalizeTable(updated)
}

async function toggleStatus(id) {
  const existing = await prisma.restaurantTable.findUnique({
    where: { id },
  })

  if (!existing) {
    throw createError('Mesa não encontrada', 404)
  }

  const updated = await prisma.restaurantTable.update({
    where: { id },
    data: {
      isActive: !existing.isActive,
      status: !existing.isActive ? 'LIVRE' : existing.status,
    },
  })

  return normalizeTable(updated)
}

export default {
  list,
  create,
  update,
  toggleStatus,
}