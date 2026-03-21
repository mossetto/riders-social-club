require('dotenv').config()
const express = require('express')
const cors = require('cors')
const migrate = require('./src/db/migrate')

const authRoutes = require('./src/routes/auth')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

// Rutas
app.use('/api/auth', authRoutes)

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, async () => {
  console.log(`Backend corriendo en puerto ${PORT}`)
  await migrate()
})
