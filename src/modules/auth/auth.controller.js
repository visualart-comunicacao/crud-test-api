import service from './auth.service.js'

async function login(req, res, next) {
  try {
    const result = await service.login(req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function me(req, res, next) {
  try {
    const result = await service.me(req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await service.changePassword(req.user.id, req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export default {
  login,
  me,
  changePassword,
}