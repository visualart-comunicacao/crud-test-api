import service from './settings.service.js'

async function getSettings(req, res, next) {
  try {
    const result = await service.getSettings()
    res.json(result)
  } catch (error) {
    next(error)
  }
}

async function updateSettings(req, res, next) {
  try {
    const result = await service.updateSettings(req.body)
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export default {
  getSettings,
  updateSettings,
}