import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function hasKitchenSentFlag(notes) {
  return String(notes || '').includes('[KITCHEN_SENT]')
}

function hasKitchenPreparingFlag(notes) {
  return String(notes || '').includes('[KITCHEN_PREPARO]')
}

function hasKitchenReadyFlag(notes) {
  return String(notes || '').includes('[KITCHEN_READY]')
}

function getKitchenStatus(order) {
  if (order.status !== 'ABERTA') return null

  const activeItems = (order.items || []).filter((item) => item.status === 'ATIVO')
  const sentItems = activeItems.filter((item) => hasKitchenSentFlag(item.notes))

  if (!sentItems.length) return null

  const hasReady = sentItems.some((item) => hasKitchenReadyFlag(item.notes))
  const hasPreparing = sentItems.some((item) => hasKitchenPreparingFlag(item.notes))

  if (hasReady) return 'pronto'
  if (hasPreparing) return 'preparo'
  return 'novo'
}

function getKitchenStatusPriority(order) {
  const openedAt = new Date(order.openedAt).getTime()
  const now = Date.now()
  const minutes = Math.floor((now - openedAt) / 1000 / 60)

  return minutes >= 15 ? 'alta' : 'normal'
}

function getKitchenSector(order) {
  const items = order.items || []
  const names = items.map((item) => item.productName?.toLowerCase() || '')

  if (
    names.some(
      (name) =>
        name.includes('coca') ||
        name.includes('suco') ||
        name.includes('cerveja') ||
        name.includes('heineken') ||
        name.includes('refrigerante'),
    )
  ) {
    return 'bebidas'
  }

  if (
    names.some(
      (name) =>
        name.includes('espeto') ||
        name.includes('carne') ||
        name.includes('frango') ||
        name.includes('linguiça') ||
        name.includes('linguica') ||
        name.includes('medalhão') ||
        name.includes('medalhao'),
    )
  ) {
    return 'churrasqueira'
  }

  if (
    names.some(
      (name) =>
        name.includes('vinagrete') ||
        name.includes('farofa') ||
        name.includes('maionese') ||
        name.includes('pão') ||
        name.includes('pao'),
    )
  ) {
    return 'montagem'
  }

  return 'geral'
}

function removeKitchenFlags(notes) {
  if (!notes) return ''
  return notes
    .replace(/\[KITCHEN_SENT\]/g, '')
    .replace(/\[KITCHEN_PREPARO\]/g, '')
    .replace(/\[KITCHEN_READY\]/g, '')
    .replace(/\[KITCHEN_FINISHED\]/g, '')
    .trim()
}

function addKitchenFlag(notes, flag) {
  const clean = removeKitchenFlags(notes)
  const base = clean ? `${clean} ` : ''
  return `${base}[KITCHEN_SENT] ${flag}`.trim()
}

async function getOpenOrders() {
  return prisma.order.findMany({
    where: {
      status: 'ABERTA',
    },
    include: {
      table: true,
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      openedAt: 'asc',
    },
  })
}

async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      table: true,
      items: true,
    },
  })

  if (!order) {
    throw createError('Pedido não encontrado', 404)
  }

  return order
}

async function updateAllSentItemsNotes(orderId, updater) {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
      status: 'ATIVO',
    },
  })

  const sentItems = items.filter((item) => hasKitchenSentFlag(item.notes))

  await Promise.all(
    sentItems.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          notes: updater(item.notes || ''),
        },
      }),
    ),
  )
}

function normalizeKitchenOrder(order) {
  const status = getKitchenStatus(order)
  const activeItems = (order.items || []).filter(
    (item) => item.status === 'ATIVO' && hasKitchenSentFlag(item.notes),
  )
  const openedAt = new Date(order.openedAt).getTime()
  const now = Date.now()
  const tempoMin = Math.max(0, Math.floor((now - openedAt) / 1000 / 60))

  return {
    id: order.id,
    code: order.code,
    cliente: order.customerName || 'Mesa sem identificação',
    mesa: order.table?.name || `Mesa ${String(order.table?.number || '').padStart(2, '0')}`,
    origem: 'Salão',
    status,
    prioridade: getKitchenStatusPriority(order),
    setor: getKitchenSector(order),
    tempoMin,
    total: Number(order.total || 0),
    itens: activeItems.map((item) => ({
      id: item.id,
      nome: item.productName,
      qtd: item.quantity,
      observacao: removeKitchenFlags(item.notes || ''),
    })),
  }
}

async function list(query) {
  const orders = await getOpenOrders()

  let result = orders.map(normalizeKitchenOrder).filter((item) => item.status)

  const busca = String(query?.busca || '').trim().toLowerCase()
  const prioridade = query?.prioridade
  const setor = query?.setor
  const atrasados = query?.atrasados === 'true' || query?.atrasados === true

  if (busca) {
    result = result.filter((item) => {
      return (
        String(item.id).toLowerCase().includes(busca) ||
        String(item.code || '').toLowerCase().includes(busca) ||
        String(item.cliente || '').toLowerCase().includes(busca) ||
        String(item.mesa || '').toLowerCase().includes(busca) ||
        item.itens.some((produto) => String(produto.nome || '').toLowerCase().includes(busca))
      )
    })
  }

  if (prioridade && prioridade !== 'todas') {
    result = result.filter((item) => item.prioridade === prioridade)
  }

  if (setor && setor !== 'todos') {
    result = result.filter((item) => item.setor === setor)
  }

  if (atrasados) {
    result = result.filter((item) => item.tempoMin >= 15)
  }

  return result
}

async function summary() {
  const orders = await getOpenOrders()
  const normalized = orders.map(normalizeKitchenOrder).filter((item) => item.status)

  return {
    total: normalized.length,
    novos: normalized.filter((item) => item.status === 'novo').length,
    preparo: normalized.filter((item) => item.status === 'preparo').length,
    prontos: normalized.filter((item) => item.status === 'pronto').length,
    atrasados: normalized.filter((item) => item.tempoMin >= 15).length,
  }
}

async function start(id) {
  const order = await getOrderById(id)

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível iniciar pedidos abertos')
  }

  if (!getKitchenStatus(order)) {
    throw createError('Esse pedido ainda não foi enviado para a cozinha')
  }

  await updateAllSentItemsNotes(id, (notes) => addKitchenFlag(notes, '[KITCHEN_PREPARO]'))

  return normalizeKitchenOrder(await getOrderById(id))
}

async function ready(id) {
  const order = await getOrderById(id)

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível marcar pedidos abertos')
  }

  if (!getKitchenStatus(order)) {
    throw createError('Esse pedido ainda não foi enviado para a cozinha')
  }

  await updateAllSentItemsNotes(id, (notes) => addKitchenFlag(notes, '[KITCHEN_READY]'))

  return normalizeKitchenOrder(await getOrderById(id))
}

async function back(id) {
  const order = await getOrderById(id)

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível voltar etapa em pedidos abertos')
  }

  const current = getKitchenStatus(order)

  if (!current) {
    throw createError('Esse pedido ainda não foi enviado para a cozinha')
  }

  if (current === 'pronto') {
    await updateAllSentItemsNotes(id, (notes) => addKitchenFlag(notes, '[KITCHEN_PREPARO]'))
  } else if (current === 'preparo') {
    await updateAllSentItemsNotes(id, (notes) => {
      const clean = removeKitchenFlags(notes)
      return clean ? `${clean} [KITCHEN_SENT]`.trim() : '[KITCHEN_SENT]'
    })
  } else {
    throw createError('Pedido já está na primeira etapa')
  }

  return normalizeKitchenOrder(await getOrderById(id))
}

async function finish(id) {
  const order = await getOrderById(id)

  if (order.status !== 'ABERTA') {
    throw createError('Só é possível finalizar pedidos abertos')
  }

  if (!getKitchenStatus(order)) {
    throw createError('Esse pedido ainda não foi enviado para a cozinha')
  }

  await updateAllSentItemsNotes(id, (notes) => {
    const clean = removeKitchenFlags(notes)
    return clean ? `${clean} [KITCHEN_FINISHED]`.trim() : '[KITCHEN_FINISHED]'
  })

  return {
    message: 'Pedido finalizado na cozinha',
  }
}

async function callWaiter(id) {
  await getOrderById(id)

  return {
    message: 'Garçom chamado com sucesso',
  }
}

export default {
  list,
  summary,
  start,
  ready,
  back,
  finish,
  callWaiter,
}