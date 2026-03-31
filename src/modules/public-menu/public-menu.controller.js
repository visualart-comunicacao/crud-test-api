import * as publicMenuService from './public-menu.service.js'

export async function getMenu(req, res, next) {
  try {
    const data = await publicMenuService.getDigitalMenu()
    return res.status(200).json(data)
  } catch (error) {
    next(error)
  }
}