import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 3000

// asas
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
})
