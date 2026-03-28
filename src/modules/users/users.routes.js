import { Router } from 'express'
import controller from './users.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'
import authorize from '../../middlewares/authorize.middleware.js'

const router = Router()

// router.use(authMiddleware)

router.get('/', authorize('ADMIN'), controller.listUsers)
router.post('/', controller.createUser)
router.put('/:id', authorize('ADMIN'), controller.updateUser)
router.patch('/:id/reset-password', authorize('ADMIN'), controller.resetPassword)
router.patch('/:id/status', authorize('ADMIN'), controller.toggleStatus)

export default router