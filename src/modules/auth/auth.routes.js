import { Router } from 'express'
import controller from './auth.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'

const router = Router()

router.post('/login', controller.login)
router.get('/me', authMiddleware, controller.me)
router.post('/change-password', authMiddleware, controller.changePassword)

export default router