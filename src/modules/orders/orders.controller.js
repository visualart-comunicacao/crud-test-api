import service from './orders.service.js'

async function list(req, res, next) {
  try {
    const result = await service.list(req.query)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function getById(req, res, next) {
  try {
    const result = await service.getById(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const result = await service.create(req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function addItem(req, res, next) {
  try {
    const result = await service.addItem(req.params.id, req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function updateItem(req, res, next) {
  try {
    const result = await service.updateItem(
      req.params.id,
      req.params.itemId,
      req.body,
      req.user,
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function cancelItem(req, res, next) {
  try {
    const result = await service.cancelItem(
      req.params.id,
      req.params.itemId,
      req.body,
      req.user,
    )
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function transferTable(req, res, next) {
  try {
    const result = await service.transferTable(req.params.id, req.body, req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function close(req, res, next) {
  try {
    const result = await service.close(req.params.id, req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function cancel(req, res, next) {
  try {
    const result = await service.cancel(req.params.id, req.body, req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function sendToKitchen(req, res, next) {
  try {
    const result = await service.sendToKitchen(req.params.id, req.user)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function receipt(req, res, next) {
  try {
    const result = await service.generateReceiptPdf(req.params.id)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comanda-${req.params.id}.pdf"`,
    )
    result.pipe(res)
  } catch (error) {
    next(error)
  }
}

export default {
  list,
  getById,
  create,
  addItem,
  updateItem,
  cancelItem,
  transferTable,
  close,
  cancel,
  sendToKitchen,
  receipt
}