import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function generateOrderCode() {
  return `CMD-${Date.now()}`
}

function toNumber(value) {
  return Number(value || 0)
}

function calculateOrderTotals(items, taxaServicoPercent = 0, couvert = 0) {
  const activeItems = items.filter((item) => item.status === 'ATIVO')

  const subtotal = activeItems.reduce((acc, item) => {
    return acc + Number(item.totalPrice || 0)
  }, 0)

  const serviceFee = subtotal * (Number(taxaServicoPercent || 0) / 100)
  const couvertTotal = Number(couvert || 0)
  const discountAmount = 0
  const total = subtotal + serviceFee + couvertTotal - discountAmount

  return {
    subtotal,
    serviceFee,
    couvertTotal,
    discountAmount,
    total,
  }
}

function normalizeOrder(order) {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    tableId: order.tableId,
    table: order.table
      ? {
          id: order.table.id,
          numero: order.table.number,
          nome: order.table.name,
          status: order.table.status,
        }
      : null,
    customerName: order.customerName,
    notes: order.notes,
    subtotal: Number(order.subtotal || 0),
    serviceFee: Number(order.serviceFee || 0),
    couvertTotal: Number(order.couvertTotal || 0),
    discountAmount: Number(order.discountAmount || 0),
    total: Number(order.total || 0),
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id,
          name: order.createdBy.name,
          username: order.createdBy.username,
        }
      : null,
    closedBy: order.closedBy
      ? {
          id: order.closedBy.id,
          name: order.closedBy.name,
          username: order.closedBy.username,
        }
      : null,
    canceledBy: order.canceledBy
      ? {
          id: order.canceledBy.id,
          name: order.canceledBy.name,
          username: order.canceledBy.username,
        }
      : null,
    openedAt: order.openedAt,
    closedAt: order.closedAt,
    canceledAt: order.canceledAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      notes: item.notes,
      status: item.status,
      addedBy: item.addedBy
        ? {
            id: item.addedBy.id,
            name: item.addedBy.name,
            username: item.addedBy.username,
          }
        : null,
      canceledBy: item.canceledBy
        ? {
            id: item.canceledBy.id,
            name: item.canceledBy.name,
            username: item.canceledBy.username,
          }
        : null,
      createdAt: item.createdAt,
      canceledAt: item.canceledAt,
    })),
  }
}

async function getSettings() {
  return prisma.setting.findFirst()
}

async function recalculateOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  const settings = await getSettings()

  const totals = calculateOrderTotals(
    order.items,
    settings?.taxaServico || 0,
    settings?.couvert || 0,
  )

  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      couvertTotal: totals.couvertTotal,
      discountAmount: totals.discountAmount,
      total: totals.total,
    },
  })
}

async function list(query) {
  const where = {}

  if (query?.status) {
    where.status = query.status
  }

  if (query?.tableId) {
    where.tableId = query.tableId
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      openedAt: 'desc',
    },
  })

  return orders.map(normalizeOrder)
}

async function getById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  return normalizeOrder(order)
}

async function create({ tableId, customerName, notes }, user) {
  if (!tableId) {
    throw createError('Mesa é obrigatória')
  }

  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
  })

  if (!table) {
    throw createError('Mesa não encontrada', 404)
  }

  if (!table.isActive) {
    throw createError('Mesa inativa')
  }

  const openOrder = await prisma.order.findFirst({
    where: {
      tableId,
      status: 'ABERTA',
    },
  })

  if (openOrder) {
    throw createError('Já existe uma comanda aberta para essa mesa')
  }

  const order = await prisma.order.create({
    data: {
      code: generateOrderCode(),
      status: 'ABERTA',
      tableId,
      customerName: customerName || null,
      notes: notes || null,
      createdById: user.id,
      subtotal: 0,
      serviceFee: 0,
      couvertTotal: 0,
      discountAmount: 0,
      total: 0,
    },
    include: {
      table: true,
      createdBy: true,
      closedBy: true,
      canceledBy: true,
      items: {
        include: {
          addedBy: true,
          canceledBy: true,
        },
      },
    },
  })

  await prisma.restaurantTable.update({
    where: { id: tableId },
    data: {
      status: 'OCUPADA',
    },
  })

  return normalizeOrder(order)
}

async function addItem(orderId, { productId, quantity, notes }, user) {
  if (!productId) {
    throw createError('Produto é obrigatório')
  }

  if (!quantity || Number(quantity) <= 0) {
    throw createError('Quantidade inválida')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível adicionar item em comanda aberta')
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product) {
    throw createError('Produto não encontrado', 404)
  }

  if (!product.isActive) {
    throw createError('Produto inativo')
  }

  const qty = Number(quantity)
  const unitPrice = Number(product.price)
  const totalPrice = unitPrice * qty

  await prisma.orderItem.create({
    data: {
      orderId,
      productId,
      productName: product.name,
      quantity: qty,
      unitPrice,
      totalPrice,
      notes: notes || null,
      status: 'ATIVO',
      addedById: user.id,
    },
  })

  await recalculateOrder(orderId)

  return getById(orderId)
}

async function cancelItem(orderId, itemId, body, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível cancelar item em comanda aberta')
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: itemId },
  })

  if (!item || item.orderId !== orderId) {
    throw createError('Item não encontrado', 404)
  }

  if (item.status === 'CANCELADO') {
    throw createError('Item já está cancelado')
  }

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      status: 'CANCELADO',
      canceledById: user.id,
      canceledAt: new Date(),
      notes: body?.notes ?? item.notes,
    },
  })

  await recalculateOrder(orderId)

  return getById(orderId)
}

async function close(orderId, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível fechar comandas abertas')
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'FECHADA',
      closedById: user.id,
      closedAt: new Date(),
    },
  })

  if (updated.tableId) {
    await prisma.restaurantTable.update({
      where: { id: updated.tableId },
      data: {
        status: 'LIVRE',
      },
    })
  }

  return getById(orderId)
}

async function cancel(orderId, body, user) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw createError('Comanda não encontrada', 404)
  }

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível cancelar comandas abertas')
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'CANCELADA',
      canceledById: user.id,
      canceledAt: new Date(),
      notes: body?.notes || order.notes,
    },
  })

  if (order.tableId) {
    await prisma.restaurantTable.update({
      where: { id: order.tableId },
      data: {
        status: 'LIVRE',
      },
    })
  }

  return getById(orderId)
}

export default {
  list,
  getById,
  create,
  addItem,
  cancelItem,
  close,
  cancel,
}