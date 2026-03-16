import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function normalizeProduct(product) {
  return {
    id: product.id,
    nome: product.name,
    descricao: product.description,
    categoriaId: product.categoryId,
    categoriaNome: product.category?.name ?? '',
    preco: Number(product.price),
    tempoPreparo: product.prepTimeMinutes,
    ativo: product.isActive,
    disponivelSalao: product.availableInStore,
    disponivelDelivery: product.availableDelivery,
    disponivelBalcao: product.availableCounter,
    destaque: product.isFeatured,
    imagem: product.imageUrl,
    adicionalIds: product.additionals.map((item) => item.additionalId),
  }
}

async function list() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      additionals: true,
    },
    orderBy: [{ name: 'asc' }],
  })

  return products.map(normalizeProduct)
}

async function create(data) {
  if (!data.nome || !data.categoriaId || data.preco === undefined || data.preco === null) {
    throw createError('Nome, categoria e preço são obrigatórios')
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoriaId },
  })

  if (!category) {
    throw createError('Categoria não encontrada', 404)
  }

  const product = await prisma.product.create({
    data: {
      name: data.nome,
      description: data.descricao ?? null,
      categoryId: data.categoriaId,
      price: data.preco,
      prepTimeMinutes: data.tempoPreparo ?? 0,
      isActive: data.ativo ?? true,
      availableInStore: data.disponivelSalao ?? true,
      availableDelivery: data.disponivelDelivery ?? true,
      availableCounter: data.disponivelBalcao ?? true,
      isFeatured: data.destaque ?? false,
      imageUrl: data.imagem ?? null,
      additionals: {
        create: (data.adicionalIds || []).map((additionalId) => ({
          additionalId,
        })),
      },
    },
    include: {
      category: true,
      additionals: true,
    },
  })

  return normalizeProduct(product)
}

async function update(id, data) {
  const existing = await prisma.product.findUnique({
    where: { id },
  })

  if (!existing) {
    throw createError('Produto não encontrado', 404)
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: data.nome,
      description: data.descricao ?? null,
      categoryId: data.categoriaId,
      price: data.preco,
      prepTimeMinutes: data.tempoPreparo ?? 0,
      isActive: data.ativo ?? true,
      availableInStore: data.disponivelSalao ?? true,
      availableDelivery: data.disponivelDelivery ?? true,
      availableCounter: data.disponivelBalcao ?? true,
      isFeatured: data.destaque ?? false,
      imageUrl: data.imagem ?? null,
      additionals: {
        deleteMany: {},
        create: (data.adicionalIds || []).map((additionalId) => ({
          additionalId,
        })),
      },
    },
    include: {
      category: true,
      additionals: true,
    },
  })

  return normalizeProduct(product)
}

async function toggleStatus(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      additionals: true,
    },
  })

  if (!product) {
    throw createError('Produto não encontrado', 404)
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      isActive: !product.isActive,
    },
    include: {
      category: true,
      additionals: true,
    },
  })

  return normalizeProduct(updated)
}

export default {
  list,
  create,
  update,
  toggleStatus,
}