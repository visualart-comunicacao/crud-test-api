import customersService from './customers.service.js'

async function list(req, res, next) {
  try {
    const data = await customersService.list()
    res.json(data)
  } catch (error) {
    next(error)
  }
}

async function create(req, res, next) {
  try {
    const data = await customersService.create(req.body)
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
}

export default {
  list,
  create,
}