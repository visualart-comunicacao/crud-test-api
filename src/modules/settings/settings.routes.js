import { Router } from 'express'
import controller from './settings.controller.js'
import authMiddleware from '../../middlewares/auth.middleware.js'
import authorize from '../../middlewares/authorize.middleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', controller.getSettings)
router.put('/', authorize('ADMIN'), controller.updateSettings)
// router.post('/logo', authorize('ADMIN'), controller.uploadLogo)

export default router
