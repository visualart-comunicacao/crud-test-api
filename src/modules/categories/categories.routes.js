import { Router } from 'express'
import controller from './categories.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'
import authorize from '../../middlewares/authorize.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.list)
router.post('/', authorize('ADMIN'), controller.create)
router.patch('/:id/status', authorize('ADMIN'), controller.toggleStatus)

export default router