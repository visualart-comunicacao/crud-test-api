import { Router } from 'express'
import controller from './kitchen.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.list)
router.get('/summary', controller.summary)
router.patch('/:id/start', controller.start)
router.patch('/:id/ready', controller.ready)
router.patch('/:id/back', controller.back)
router.patch('/:id/finish', controller.finish)
router.post('/:id/call-waiter', controller.callWaiter)

export default router