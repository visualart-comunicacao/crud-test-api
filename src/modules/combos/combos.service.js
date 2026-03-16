import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeCombo(combo) {
  return {
    id: combo.id,
    nome: combo.name,
    descricao: combo.description,
    preco: Number(combo.price),
    ativo: combo.isActive,
    itemIds: combo.items.map((item) => item.productId),
  }
}

async function list() {
  const combos = await prisma.combo.findMany({
    include: {
      items: true,
    },
    orderBy: [{ name: 'asc' }],
  })

  return combos.map(normalizeCombo)
}

async function create({ nome, descricao, preco, itemIds }) {
  if (!nome || preco === undefined || preco === null) {
    throw createError('Nome e preço do combo são obrigatórios')
  }

  const combo = await prisma.combo.create({
    data: {
      name: nome,
      description: descricao ?? null,
      price: preco,
      isActive: true,
      items: {
        create: (itemIds || []).map((productId) => ({
          productId,
        })),
      },
    },
    include: {
      items: true,
    },
  })

  return normalizeCombo(combo)
}

async function toggleStatus(id) {
  const combo = await prisma.combo.findUnique({
    where: { id },
    include: { items: true },
  })

  if (!combo) {
    throw createError('Combo não encontrado', 404)
  }

  const updated = await prisma.combo.update({
    where: { id },
    data: {
      isActive: !combo.isActive,
    },
    include: {
      items: true,
    },
  })

  return normalizeCombo(updated)
}

export default {
  list,
  create,
  toggleStatus,
}