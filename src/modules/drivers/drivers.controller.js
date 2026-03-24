import driversService from './drivers.service.js'

async function list(req, res, next) {
  try {
    const data = await driversService.list()
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const data = await driversService.create(req.body)
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
}

export default {
  list,
  create,
}