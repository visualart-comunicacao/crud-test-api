import service from './tables.service.js'

async function list(req, res, next) {
  try {
    const result = await service.list()
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const result = await service.create(req.body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function update(req, res, next) {
  try {
    const result = await service.update(req.params.id, req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function toggleStatus(req, res, next) {
  try {
    const result = await service.toggleStatus(req.params.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export default {
  list,
  create,
  update,
  toggleStatus,
}