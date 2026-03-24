import { Router } from 'express'
import controller from './drivers.controller.js'

import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.list)
router.post('/', controller.create)

export default router