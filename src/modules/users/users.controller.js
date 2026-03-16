import service from './users.service.js'

async function listUsers(req, res, next) {
  try {
    const result = await service.listUsers()
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function createUser(req, res, next) {
  try {
    const result = await service.createUser(req.body)
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

async function updateUser(req, res, next) {
  try {
    const result = await service.updateUser(req.params.id, req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await service.resetPassword(req.params.id)
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
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  toggleStatus,
}