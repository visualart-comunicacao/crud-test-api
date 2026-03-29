import cashRegisterService from './cash-register.service.js'

function getUserId(req) {
  return req.user?.id || null
}

async function getCurrent(req, res, next) {
  try {
    const result = await cashRegisterService.getCurrent()
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function open(req, res, next) {
  try {
    const userId = getUserId(req)

    const result = await cashRegisterService.open(
      {
        openingAmount: req.body.fundoInicial,
        // openingNotes: req.body.observacao,
      },
      userId,
    )

    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function addMovement(req, res, next) {
  try {
    const userId = getUserId(req)

    const result = await cashRegisterService.addMovement(
      {
        type: req.body.tipo,
        paymentMethod: req.body.formaPagamento,
        category: req.body.categoria,
        description: req.body.descricao,
        amount: req.body.valor,
        orderId: req.body.orderId || null,
      },
      userId,
    )

    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function close(req, res, next) {
  try {
    const userId = getUserId(req)

    const result = await cashRegisterService.close(
      {
        informedAmount: req.body.saldoInformado,
        closingNotes: req.body.observacao,
      },
      userId,
    )

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function listMovementsCurrent(req, res, next) {
  try {
    const result = await cashRegisterService.listMovementsCurrent()
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function listHistory(req, res, next) {
  try {
    const result = await cashRegisterService.listHistory({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function getById(req, res, next) {
  try {
    const result = await cashRegisterService.getById(req.params.id)
    return res.json(result)
  } catch (error) {
    next(error)
  }
}

async function registerOrderPayment(req, res, next) {
  try {
    const userId = getUserId(req)

    const result = await cashRegisterService.registerOrderPayment(
      req.params.orderId,
      {
        payments: req.body.payments,
        notes: req.body.notes,
      },
      userId,
    )

    return res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export default {
  getCurrent,
  open,
  addMovement,
  close,
  listMovementsCurrent,
  listHistory,
  getById,
  registerOrderPayment,
}