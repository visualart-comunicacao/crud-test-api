import { Router } from 'express'
import controller from './orders.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.list)
router.get('/:id', controller.getById)
router.post('/', controller.create)
router.post('/:isd/items', controller.addItem)
router.patch('/:id/items/:itemId/cancel', controller.cancelItem)
router.patch('/:id/close', controller.close)
router.patch('/:id/cancel', controller.cancel)

export default router