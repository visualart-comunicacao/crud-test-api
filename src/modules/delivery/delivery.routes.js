import { Router } from 'express'
import controller from './delivery.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/orders', controller.listOrders)
router.get('/dashboard', controller.dashboard)
router.post('/orders', controller.createOrder)
router.patch('/orders/:id/status', controller.updateStatus)
router.patch('/orders/:id/dispatch', controller.dispatchOrder)
router.patch('/orders/:id/deliver', controller.markDelivered)

export default router