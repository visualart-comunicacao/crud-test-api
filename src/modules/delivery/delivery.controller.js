import deliveryService from './delivery.service.js'

async function createOrder(req, res, next) {
  try {
    const createdById =
      req.user?.id ||
      req.auth?.id ||
      req.auth?.sub

    const data = await deliveryService.createOrder({
      ...req.body,
      createdById,
    })

    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
}

async function listOrders(req, res, next) {
  try {
    const data = await deliveryService.listOrders()
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function dashboard(req, res, next) {
  try {
    const data = await deliveryService.getDashboard()
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function updateStatus(req, res, next) {
  try {
    const data = await deliveryService.updateStatus(req.params.id, req.body.status)
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function dispatchOrder(req, res, next) {
  try {
    const data = await deliveryService.dispatchOrder(req.params.id, req.body.driverId)
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function markDelivered(req, res, next) {
  try {
    const data = await deliveryService.markDelivered(req.params.id)
    res.json(data)
  } catch (error) {
    next(error)
  }
}

export default {
  createOrder,
  listOrders,
  dashboard,
  updateStatus,
  dispatchOrder,
  markDelivered,
}