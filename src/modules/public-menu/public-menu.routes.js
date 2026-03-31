import { Router } from 'express'
import { getMenu } from './public-menu.controller.js'

const router = Router()

router.get('/menu', getMenu)

export default router