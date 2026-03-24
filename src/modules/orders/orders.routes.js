import { Router } from 'express'
import controller from './orders.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.list)
router.get('/:id', controller.getById)
router.post('/', controller.create)
router.post('/:id/items', controller.addItem)
router.put('/:id/items/:itemId', controller.updateItem)
router.patch('/:id/items/:itemId/cancel', controller.cancelItem)
router.patch('/:id/send-to-kitchen', controller.sendToKitchen)
router.patch('/:id/transfer-table', controller.transferTable)
router.patch('/:id/close', controller.close)
router.patch('/:id/cancel', controller.cancel)
router.get('/:id/receipt', controller.receipt)
router.post('/quick-sale', controller.createQuickSale)

export default router