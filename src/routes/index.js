import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import usersRoutes from '../modules/users/users.routes.js'
import settingsRoutes from '../modules/settings/settings.routes.js'

const router = Router()

router.get('/v1/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/v1/auth', authRoutes)
router.use('/v1/users', usersRoutes)
router.use('/v1/settings', settingsRoutes)

export default router