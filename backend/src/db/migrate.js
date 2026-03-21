const fs = require('fs')
const path = require('path')
const pool = require('./pool')

async function migrate() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    await pool.query(schema)
    console.log('✅ Base de datos inicializada')
  } catch (err) {
    console.error('❌ Error al inicializar la DB:', err.message)
  }
}

module.exports = migrate
