import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function mapOrigem(origem) {
  const value = String(origem || '').toUpperCase()

  if (value === 'DELIVERY') return 'DELIVERY'
  if (value === 'RETIRADA') return 'RETIRADA'
  if (value === 'LOCAL') return 'LOCAL'

  throw createError('Origem inválida')
}

function mapStatus(status) {
  const value = String(status || '').toUpperCase()

  if (['RECEBIDO', 'PREPARANDO', 'ROTA', 'ENTREGUE', 'CANCELADO'].includes(value)) {
    return value
  }

  throw createError('Status inválido')
}

function mapPaymentMethod(method) {
  const value = String(method || '').trim().toUpperCase()

  if (value === 'PIX') return 'PIX'
  if (value === 'DINHEIRO') return 'DINHEIRO'
  if (value === 'DEBITO' || value === 'DÉBITO' || value === 'CARTÃO DE DÉBITO' || value === 'CARTAO DE DEBITO') {
    return 'DEBITO'
  }
  if (value === 'CREDITO' || value === 'CRÉDITO' || value === 'CARTÃO DE CRÉDITO' || value === 'CARTAO DE CREDITO') {
    return 'CREDITO'
  }

  return 'OUTRO'
}

function paymentMethodLabel(method) {
  const value = String(method || '').toUpperCase()

  if (value === 'PIX') return 'PIX'
  if (value === 'DINHEIRO') return 'Dinheiro'
  if (value === 'DEBITO') return 'Cartão de débito'
  if (value === 'CREDITO') return 'Cartão de crédito'
  return value
}

function gerarCodigoPedido() {
  const agora = new Date()
  const y = agora.getFullYear()
  const m = String(agora.getMonth() + 1).padStart(2, '0')
  const d = String(agora.getDate()).padStart(2, '0')
  const h = String(agora.getHours()).padStart(2, '0')
  const min = String(agora.getMinutes()).padStart(2, '0')
  const s = String(agora.getSeconds()).padStart(2, '0')
  const aleatorio = Math.floor(Math.random() * 9000 + 1000)

  return `PED-${y}${m}${d}-${h}${min}${s}-${aleatorio}`
}

function normalizeOrder(order) {
  return {
    id: order.id,
    codigo: order.code,
    clienteId: order.customerId,
    cliente: order.customerName || order.customer?.name || '',
    telefone: order.customerPhone || order.customer?.phone || '',
    endereco: order.deliveryAddress || '',
    bairro: order.deliveryNeighborhood || '',
    referencia: order.deliveryReference || '',
    origem: String(order.origin || 'LOCAL').toLowerCase(),
    status: String(order.deliveryStatus || 'RECEBIDO').toLowerCase(),
    prioridade: order.priority || 'normal',
    pagamento: paymentMethodLabel(order.payments?.[0]?.method || ''),
    valorTotal: Number(order.total || 0),
    trocoPara: Number(order.changeFor || 0),
    entregador: order.driver?.name || '',
    entregadorId: order.driverId || null,
    canal: order.deliveryChannel || '',
    horarioCriacao: order.createdAt,
    previsaoEntrega: order.estimatedMinutes || 0,
    tempoMin: Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000),
    observacao: order.notes || '',
    itens: (order.items || []).map((item) => ({
      id: item.id,
      produtoId: item.productId,
      nome: item.productName || item.product?.name || '',
      qtd: item.quantity,
      valor: Number(item.unitPrice || 0),
    })),
  }
}

async function listOrders() {
  const orders = await prisma.order.findMany({
    where: {
      origin: {
        in: ['DELIVERY', 'RETIRADA'],
      },
    },
    include: {
      customer: true,
      driver: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  return orders.map(normalizeOrder)
}

async function getDashboard() {
  const orders = await prisma.order.findMany({
    where: {
      origin: {
        in: ['DELIVERY', 'RETIRADA'],
      },
    },
    select: {
      origin: true,
      deliveryStatus: true,
      createdAt: true,
    },
  })

  const now = Date.now()

  return {
    total: orders.length,
    recebidos: orders.filter((item) => item.deliveryStatus === 'RECEBIDO').length,
    preparando: orders.filter((item) => item.deliveryStatus === 'PREPARANDO').length,
    rota: orders.filter((item) => item.deliveryStatus === 'ROTA').length,
    entregues: orders.filter((item) => item.deliveryStatus === 'ENTREGUE').length,
    atrasados: orders.filter(
      (item) => (now - new Date(item.createdAt).getTime()) / 60000 >= 25
    ).length,
    delivery: orders.filter((item) => item.origin === 'DELIVERY').length,
    retirada: orders.filter((item) => item.origin === 'RETIRADA').length,
  }
}

async function createOrder(data) {
  const {
    createdById,
    customerId,
    cliente,
    telefone,
    endereco,
    bairro,
    referencia,
    origem,
    prioridade,
    pagamento,
    trocoPara,
    canal,
    observacao,
    previsaoEntregaMinutos,
    itens,
  } = data

  if (!createdById) {
    throw createError('Usuário criador é obrigatório')
  }

  if (!cliente?.trim()) {
    throw createError('Cliente é obrigatório')
  }

  if (!telefone?.trim()) {
    throw createError('Telefone é obrigatório')
  }

  if (!Array.isArray(itens) || !itens.length) {
    throw createError('Adicione ao menos um item')
  }

  const origemMapeada = mapOrigem(origem)
  const metodoPagamento = mapPaymentMethod(pagamento)

  if (origemMapeada === 'DELIVERY') {
    if (!endereco?.trim()) throw createError('Endereço é obrigatório')
    if (!bairro?.trim()) throw createError('Bairro é obrigatório')
  }

  const usuario = await prisma.user.findUnique({
    where: { id: createdById },
    select: { id: true, isActive: true },
  })

  if (!usuario || !usuario.isActive) {
    throw createError('Usuário criador inválido', 400)
  }

  const productIds = itens.map((item) => item.produtoId)

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      availableDelivery: true,
      availableCounter: true,
      availableInStore: true,
    },
  })

  if (products.length !== productIds.length) {
    throw createError('Um ou mais produtos não foram encontrados')
  }

  const productMap = new Map(products.map((item) => [item.id, item]))

  for (const item of itens) {
    const product = productMap.get(item.produtoId)

    if (!product) {
      throw createError('Produto inválido no pedido')
    }

    if (origemMapeada === 'DELIVERY' && !product.availableDelivery) {
      throw createError(`Produto "${product.name}" não está disponível para delivery`)
    }

    if (origemMapeada === 'RETIRADA' && !product.availableCounter) {
      throw createError(`Produto "${product.name}" não está disponível para retirada`)
    }

    if (!item.qtd || Number(item.qtd) <= 0) {
      throw createError('Quantidade inválida em um dos itens')
    }
  }

  const subtotal = itens.reduce((acc, item) => {
    const product = productMap.get(item.produtoId)
    return acc + Number(item.qtd) * Number(product.price || 0)
  }, 0)

  const code = gerarCodigoPedido()

  const created = await prisma.order.create({
    data: {
      code,
      status: 'ABERTA',
      origin: origemMapeada,
      deliveryStatus: 'RECEBIDO',
      customerId: customerId || null,
      customerName: cliente.trim(),
      customerPhone: telefone.trim(),
      deliveryAddress: origemMapeada === 'RETIRADA' ? 'Retirada no balcão' : endereco?.trim(),
      deliveryNeighborhood: origemMapeada === 'RETIRADA' ? '-' : bairro?.trim(),
      deliveryReference:
        origemMapeada === 'RETIRADA' ? null : referencia?.trim() || null,
      deliveryChannel: canal?.trim() || null,
      priority: prioridade || 'normal',
      changeFor: metodoPagamento === 'DINHEIRO' ? Number(trocoPara || 0) : 0,
      estimatedMinutes: Number(previsaoEntregaMinutos || 0),
      notes: observacao?.trim() || null,

      subtotal,
      serviceFee: 0,
      couvertTotal: 0,
      discountAmount: 0,
      total: subtotal,

      createdById,

      items: {
        create: itens.map((item) => {
          const product = productMap.get(item.produtoId)
          const quantity = Number(item.qtd)
          const unitPrice = Number(product.price || 0)
          const totalPrice = quantity * unitPrice

          return {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            totalPrice,
            status: 'ATIVO',
            addedById: createdById,
            notes: null,
          }
        }),
      },

      payments: {
        create: {
          method: metodoPagamento,
          amount: subtotal,
          status: 'PENDENTE',
          registeredById: createdById,
          notes: null,
        },
      },
    },
    include: {
      customer: true,
      driver: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
  })

  return normalizeOrder(created)
}

async function updateStatus(id, status) {
  const existing = await prisma.order.findUnique({
    where: { id },
  })

  if (!existing) {
    throw createError('Pedido não encontrado', 404)
  }

  const mappedStatus = mapStatus(status)

  const updated = await prisma.order.update({
    where: { id },
    data: {
      deliveryStatus: mappedStatus,
      ...(mappedStatus === 'ENTREGUE'
        ? {
            status: 'FECHADA',
            deliveredAt: new Date(),
            closedAt: new Date(),
          }
        : {}),
      ...(mappedStatus === 'ROTA'
        ? {
            dispatchedAt: new Date(),
          }
        : {}),
      ...(mappedStatus === 'CANCELADO'
        ? {
            status: 'CANCELADA',
            canceledAt: new Date(),
          }
        : {}),
    },
    include: {
      customer: true,
      driver: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
  })

  return normalizeOrder(updated)
}

async function dispatchOrder(id, driverId) {
  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    throw createError('Pedido não encontrado', 404)
  }

  if (order.origin === 'DELIVERY') {
    if (!driverId) {
      throw createError('Entregador é obrigatório')
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      throw createError('Entregador não encontrado', 404)
    }

    if (!driver.isActive) {
      throw createError('Entregador inativo')
    }

    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'EM_ROTA' },
    })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      driverId: driverId || null,
      deliveryStatus: 'ROTA',
      dispatchedAt: new Date(),
    },
    include: {
      customer: true,
      driver: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
  })

  return normalizeOrder(updated)
}

async function markDelivered(id) {
  const order = await prisma.order.findUnique({
    where: { id },
  })

  if (!order) {
    throw createError('Pedido não encontrado', 404)
  }

  if (order.driverId) {
    await prisma.driver.update({
      where: { id: order.driverId },
      data: { status: 'DISPONIVEL' },
    })
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      deliveryStatus: 'ENTREGUE',
      status: 'FECHADA',
      deliveredAt: new Date(),
      closedAt: new Date(),
    },
    include: {
      customer: true,
      driver: true,
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
  })

  return normalizeOrder(updated)
}

export default {
  listOrders,
  getDashboard,
  createOrder,
  updateStatus,
  dispatchOrder,
  markDelivered,
}