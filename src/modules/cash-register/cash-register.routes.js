import { Router } from 'express'
import cashRegisterController from './cash-register.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/current', cashRegisterController.getCurrent)
router.post('/open', cashRegisterController.open)
router.post('/movement', cashRegisterController.addMovement)
router.post('/close', cashRegisterController.close)

router.get('/current/movements', cashRegisterController.listMovementsCurrent)

router.get('/history', cashRegisterController.listHistory)
router.get('/:id', cashRegisterController.getById)

/**
 * Próximo passo da integração com comandas:
 * registrar pagamento e fechar comanda.
 */
router.post('/order/:orderId/payment', cashRegisterController.registerOrderPayment)

export default router