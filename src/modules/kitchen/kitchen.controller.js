import service from './kitchen.service.js'

async function list(req, res, next) {
  try {
    const result = await service.list(req.query)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function summary(req, res, next) {
  try {
    const result = await service.summary()
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function start(req, res, next) {
  try {
    const result = await service.start(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function ready(req, res, next) {
  try {
    const result = await service.ready(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function back(req, res, next) {
  try {
    const result = await service.back(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function finish(req, res, next) {
  try {
    const result = await service.finish(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function callWaiter(req, res, next) {
  try {
    const result = await service.callWaiter(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
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