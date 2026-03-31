import { Router } from 'express'
import authRoutes from '../modules/auth/auth.routes.js'
import usersRoutes from '../modules/users/users.routes.js'
import settingsRoutes from '../modules/settings/settings.routes.js'
import categoriesRoutes from '../modules/categories/categories.routes.js'
import productsRoutes from '../modules/products/products.routes.js'
import additionalsRoutes from '../modules/additionals/additionals.routes.js'
import combosRoutes from '../modules/combos/combos.routes.js'
import tablesRoutes from '../modules/tables/tables.routes.js'
import ordersRoutes from '../modules/orders/orders.routes.js'
import kitchenRoutes from '../modules/kitchen/kitchen.routes.js'
import cashRegisterRoutes from '../modules/cash-register/cash-register.routes.js'
import customersRoutes from '../modules/customers/customers.routes.js'
import driversRoutes from '../modules/drivers/drivers.routes.js'
import deliveryRoutes from '../modules/delivery/delivery.routes.js'
import publicMenuRoutes from '../modules/public-menu/public-menu.routes.js'

const router = Router()

router.get('/v1/health', (req, res) => {
  res.json({ status: 'ok' })
})

router.use('/v1/public', publicMenuRoutes)

router.use('/v1/auth', authRoutes)
router.use('/v1/users', usersRoutes)
router.use('/v1/settings', settingsRoutes)
router.use('/v1/categories', categoriesRoutes)
router.use('/v1/products', productsRoutes)
router.use('/v1/additionals', additionalsRoutes)
router.use('/v1/combos', combosRoutes)
router.use('/v1/tables', tablesRoutes)
router.use('/v1/orders', ordersRoutes)
router.use('/v1/kitchen', kitchenRoutes)
router.use('/v1/cash-register', cashRegisterRoutes)
router.use('/v1/customers', customersRoutes)
router.use('/v1/drivers', driversRoutes)
router.use('/v1/delivery', deliveryRoutes)

export default router