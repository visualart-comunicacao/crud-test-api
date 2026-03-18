import prisma from '../../lib/prisma.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function toNumber(value) {
  if (value === null || value === undefined) return 0
  return Number(value)
}

function formatDateTime(value) {
  if (!value) return null

  const date = new Date(value)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function normalizeMovement(movement) {
  return {
    id: movement.id,
    dataHora: formatDateTime(movement.createdAt),
    tipo: movement.type,
    categoria: movement.category,
    descricao: movement.description,
    formaPagamento: movement.paymentMethod,
    valor: toNumber(movement.amount),
    usuario: movement.createdBy?.name || '-',
    orderId: movement.orderId || null,
    createdAt: movement.createdAt,
  }
}

function normalizeCashRegister(cashRegister, extra = {}) {
  return {
    id: cashRegister.id,
    status: cashRegister.status,
    operador: cashRegister.openedBy?.name || '-',
    operadorId: cashRegister.openedById,
    dataAbertura: formatDateTime(cashRegister.openedAt),
    dataFechamento: formatDateTime(cashRegister.closedAt),
    fundoInicial: toNumber(cashRegister.openingAmount),
    entradas: toNumber(extra.entradas),
    saidas: toNumber(extra.saidas),
    totalVendas: toNumber(extra.totalVendas),
    saldoEsperado: toNumber(cashRegister.expectedAmount),
    saldoInformado: cashRegister.informedAmount != null ? toNumber(cashRegister.informedAmount) : 0,
    diferenca: cashRegister.differenceAmount != null ? toNumber(cashRegister.differenceAmount) : 0,
    observacaoAbertura: cashRegister.openingNotes || '',
    observacaoFechamento: cashRegister.closingNotes || '',
    resumoFormas: extra.resumoFormas || {
      DINHEIRO: 0,
      PIX: 0,
      DEBITO: 0,
      CREDITO: 0,
      OUTRO: 0,
    },
    createdAt: cashRegister.createdAt,
    updatedAt: cashRegister.updatedAt,
  }
}

async function getOpenCashRegisterOrNull() {
  return prisma.cashRegister.findFirst({
    where: { status: 'ABERTO' },
    include: {
      openedBy: true,
      closedBy: true,
    },
    orderBy: { openedAt: 'desc' },
  })
}

async function getOpenCashRegisterOrThrow() {
  const cashRegister = await getOpenCashRegisterOrNull()

  if (!cashRegister) {
    throw createError('Não existe caixa aberto no momento', 404)
  }

  return cashRegister
}

async function calculateCashRegisterSummary(cashRegisterId) {
  const [movements, payments] = await Promise.all([
    prisma.cashMovement.findMany({
      where: { cashRegisterId },
    }),
    prisma.payment.findMany({
      where: {
        cashRegisterId,
        status: 'PAGO',
      },
    }),
  ])

  let entradas = 0
  let saidas = 0

  for (const movement of movements) {
    const amount = toNumber(movement.amount)

    if (['SUPRIMENTO', 'ENTRADA'].includes(movement.type)) {
      entradas += amount
    } else if (['DESPESA', 'SANGRIA'].includes(movement.type)) {
      saidas += amount
    } else if (movement.type === 'AJUSTE') {
      if (amount >= 0) entradas += amount
      else saidas += Math.abs(amount)
    }
  }

  const resumoFormas = {
    DINHEIRO: 0,
    PIX: 0,
    DEBITO: 0,
    CREDITO: 0,
    OUTRO: 0,
  }

  let totalVendas = 0
  let vendasDinheiro = 0

  for (const payment of payments) {
    const amount = toNumber(payment.amount)
    totalVendas += amount

    if (resumoFormas[payment.method] !== undefined) {
      resumoFormas[payment.method] += amount
    }

    if (payment.method === 'DINHEIRO') {
      vendasDinheiro += amount
    }
  }

  return {
    entradas,
    saidas,
    totalVendas,
    resumoFormas,
    saldoEsperadoCalculado: entradas - saidas + vendasDinheiro,
  }
}

async function recalculateExpectedAmount(tx, cashRegisterId) {
  const cashRegister = await tx.cashRegister.findUnique({
    where: { id: cashRegisterId },
  })

  if (!cashRegister) {
    throw createError('Caixa não encontrado', 404)
  }

  const movements = await tx.cashMovement.findMany({
    where: { cashRegisterId },
  })

  const payments = await tx.payment.findMany({
    where: {
      cashRegisterId,
      status: 'PAGO',
    },
  })

  let entradas = 0
  let saidas = 0
  let vendasDinheiro = 0

  for (const movement of movements) {
    const amount = toNumber(movement.amount)

    if (['SUPRIMENTO', 'ENTRADA'].includes(movement.type)) {
      entradas += amount
    } else if (['DESPESA', 'SANGRIA'].includes(movement.type)) {
      saidas += amount
    } else if (movement.type === 'AJUSTE') {
      if (amount >= 0) entradas += amount
      else saidas += Math.abs(amount)
    }
  }

  for (const payment of payments) {
    if (payment.method === 'DINHEIRO') {
      vendasDinheiro += toNumber(payment.amount)
    }
  }

  const expectedAmount =
    toNumber(cashRegister.openingAmount) + entradas + vendasDinheiro - saidas

  const updated = await tx.cashRegister.update({
    where: { id: cashRegisterId },
    data: {
      expectedAmount,
    },
    include: {
      openedBy: true,
      closedBy: true,
    },
  })

  return updated
}

async function getCurrent() {
  const cashRegister = await getOpenCashRegisterOrNull()

  if (!cashRegister) {
    return null
  }

  const summary = await calculateCashRegisterSummary(cashRegister.id)

  const [movements, payments] = await Promise.all([
    prisma.cashMovement.findMany({
      where: { cashRegisterId: cashRegister.id },
      include: {
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        cashRegisterId: cashRegister.id,
        status: 'PAGO',
      },
      include: {
        registeredBy: true,
        order: {
          select: {
            id: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    caixa: normalizeCashRegister(cashRegister, summary),
    movimentacoes: movements.map(normalizeMovement),
    pagamentos: payments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      orderCode: payment.order?.code || null,
      metodo: payment.method,
      status: payment.status,
      valor: toNumber(payment.amount),
      pagoEm: formatDateTime(payment.paidAt),
      usuario: payment.registeredBy?.name || '-',
      observacao: payment.notes || '',
    })),
  }
}

async function open({ openingAmount, openingNotes }, userId) {
  if (!userId) {
    throw createError('Usuário não autenticado para abrir o caixa', 401)
  }

  const alreadyOpen = await getOpenCashRegisterOrNull()

  if (alreadyOpen) {
    throw createError('Já existe um caixa aberto', 409)
  }

  if (openingAmount === undefined || openingAmount === null || Number(openingAmount) < 0) {
    throw createError('Valor de abertura inválido')
  }

  const cashRegister = await prisma.cashRegister.create({
    data: {
      status: 'ABERTO',
      openedById: userId,
      openingAmount: Number(openingAmount),
      expectedAmount: Number(openingAmount),
      openingNotes: openingNotes || null,
    },
    include: {
      openedBy: true,
      closedBy: true,
    },
  })

  const summary = await calculateCashRegisterSummary(cashRegister.id)

  return normalizeCashRegister(cashRegister, summary)
}

async function addMovement(
  { type, paymentMethod, category, description, amount, orderId },
  userId,
) {
  if (!userId) {
    throw createError('Usuário não autenticado para lançar movimentação', 401)
  }

  const cashRegister = await getOpenCashRegisterOrThrow()

  const allowedTypes = ['DESPESA', 'SANGRIA', 'SUPRIMENTO', 'ENTRADA', 'AJUSTE']
  if (!allowedTypes.includes(type)) {
    throw createError('Tipo de movimentação inválido')
  }

  if (amount === undefined || amount === null || Number(amount) <= 0) {
    throw createError('Valor da movimentação inválido')
  }

  const result = await prisma.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({
      data: {
        cashRegisterId: cashRegister.id,
        type,
        paymentMethod: paymentMethod || null,
        category: category || null,
        description: description || null,
        amount: Number(amount),
        orderId: orderId || null,
        createdById: userId,
      },
      include: {
        createdBy: true,
      },
    })

    const updatedCashRegister = await recalculateExpectedAmount(tx, cashRegister.id)
    return { movement, updatedCashRegister }
  })

  const summary = await calculateCashRegisterSummary(result.updatedCashRegister.id)

  return {
    caixa: normalizeCashRegister(result.updatedCashRegister, summary),
    movimentacao: normalizeMovement(result.movement),
  }
}
async function close({ informedAmount, closingNotes }, userId) {
  if (!userId) {
    throw createError('Usuário não autenticado para fechar o caixa', 401)
  }

  const cashRegister = await getOpenCashRegisterOrThrow()
  const result = await prisma.$transaction(async (tx) => {
    const recalculated = await recalculateExpectedAmount(tx, cashRegister.id)
    const differenceAmount =
      Number(informedAmount) - toNumber(recalculated.expectedAmount)

    const closed = await tx.cashRegister.update({
      where: { id: cashRegister.id },
      data: {
        status: 'FECHADO',
        closedById: userId,
        informedAmount: Number(informedAmount),
        differenceAmount,
        closingNotes: closingNotes || null,
        closedAt: new Date(),
      },
      include: {
        openedBy: true,
        closedBy: true,
      },
    })

    return closed
  })

  const summary = await calculateCashRegisterSummary(result.id)

  return normalizeCashRegister(result, summary)
}

async function listMovementsCurrent() {
  const cashRegister = await getOpenCashRegisterOrThrow()

  const movements = await prisma.cashMovement.findMany({
    where: { cashRegisterId: cashRegister.id },
    include: {
      createdBy: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return movements.map(normalizeMovement)
}

async function listHistory({ startDate, endDate } = {}) {
  const where = {}

  if (startDate || endDate) {
    where.openedAt = {}

    if (startDate) {
      where.openedAt.gte = new Date(startDate)
    }

    if (endDate) {
      where.openedAt.lte = new Date(endDate)
    }
  }

  const list = await prisma.cashRegister.findMany({
    where,
    include: {
      openedBy: true,
      closedBy: true,
      payments: true,
      movements: true,
    },
    orderBy: { openedAt: 'desc' },
  })

  return Promise.all(
    list.map(async (cashRegister) => {
      const summary = await calculateCashRegisterSummary(cashRegister.id)
      return normalizeCashRegister(cashRegister, summary)
    }),
  )
}

async function getById(id) {
  const cashRegister = await prisma.cashRegister.findUnique({
    where: { id },
    include: {
      openedBy: true,
      closedBy: true,
    },
  })

  if (!cashRegister) {
    throw createError('Caixa não encontrado', 404)
  }

  const summary = await calculateCashRegisterSummary(cashRegister.id)

  const movements = await prisma.cashMovement.findMany({
    where: { cashRegisterId: cashRegister.id },
    include: {
      createdBy: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const payments = await prisma.payment.findMany({
    where: { cashRegisterId: cashRegister.id },
    include: {
      registeredBy: true,
      order: {
        select: {
          id: true,
          code: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    caixa: normalizeCashRegister(cashRegister, summary),
    movimentacoes: movements.map(normalizeMovement),
    pagamentos: payments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      orderCode: payment.order?.code || null,
      metodo: payment.method,
      status: payment.status,
      valor: toNumber(payment.amount),
      pagoEm: formatDateTime(payment.paidAt),
      usuario: payment.registeredBy?.name || '-',
      observacao: payment.notes || '',
    })),
  }
}

async function registerOrderPayment(orderId, { payments, notes }, userId) {
  if (!userId) {
    throw createError('Usuário não autenticado para registrar pagamento', 401)
  }

  if (!Array.isArray(payments) || payments.length === 0) {
    throw createError('Informe ao menos um pagamento')
  }

  const cashRegister = await getOpenCashRegisterOrThrow()

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        table: true,
      },
    })

    if (!order) {
      throw createError('Comanda não encontrada', 404)
    }

    if (order.status !== 'ABERTA') {
      throw createError('Somente comandas abertas podem ser pagas')
    }

    const existingPaid = order.payments
      .filter((item) => item.status === 'PAGO')
      .reduce((acc, item) => acc + toNumber(item.amount), 0)

    if (existingPaid > 0) {
      throw createError('Esta comanda já possui pagamento registrado')
    }

    const totalPayments = payments.reduce((acc, item) => {
      return acc + Number(item.amount || 0)
    }, 0)

    const orderTotal = toNumber(order.total)

    if (Number(totalPayments.toFixed(2)) !== Number(orderTotal.toFixed(2))) {
      throw createError(
        `A soma dos pagamentos (${totalPayments.toFixed(2)}) deve ser igual ao total da comanda (${orderTotal.toFixed(2)})`,
      )
    }

    for (const item of payments) {
      if (!item.method) {
        throw createError('Forma de pagamento obrigatória')
      }

      if (Number(item.amount || 0) <= 0) {
        throw createError('Valor de pagamento inválido')
      }
    }

    for (const item of payments) {
      const createdPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: item.method,
          status: 'PAGO',
          amount: Number(item.amount),
          paidAt: new Date(),
          cashRegisterId: cashRegister.id,
          registeredById: userId,
          notes: item.notes || notes || null,
        },
      })

      await tx.cashMovement.create({
        data: {
          cashRegisterId: cashRegister.id,
          type: 'VENDA',
          paymentMethod: item.method,
          category: order.table ? `Mesa ${String(order.table.number).padStart(2, '0')}` : 'Comanda',
          description: `Pagamento da comanda ${order.code}`,
          amount: Number(item.amount),
          orderId: order.id,
          createdById: userId,
        },
      })

      void createdPayment
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'FECHADA',
        closedById: userId,
        closedAt: new Date(),
      },
    })

    if (order.tableId) {
      const openOrdersOnTable = await tx.order.count({
        where: {
          tableId: order.tableId,
          status: 'ABERTA',
          id: { not: order.id },
        },
      })

      if (openOrdersOnTable === 0) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'LIVRE' },
        })
      }
    }

    const updatedCashRegister = await recalculateExpectedAmount(tx, cashRegister.id)

    const summary = await calculateCashRegisterSummary(updatedCashRegister.id)

    return {
      caixa: normalizeCashRegister(updatedCashRegister, summary),
      order: {
        id: order.id,
        code: order.code,
        status: 'FECHADA',
        total: orderTotal,
      },
    }
  })
}

export default {
  getCurrent,
  open,
  addMovement,
  close,
  listMovementsCurrent,
  listHistory,
  getById,
  getOpenCashRegisterOrNull,
  getOpenCashRegisterOrThrow,
}