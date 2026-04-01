import pool from './pool.js'

const alterSQL = `
  ALTER TABLE citas 
  ADD COLUMN IF NOT EXISTS horario VARCHAR(10);
`

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('🚀 Agregando columna "horario" a la tabla citas...')
    await client.query(alterSQL)
    console.log('✅ Columna "horario" agregada/verificada correctamente.')
  } catch (err) {
    console.error('❌ Error al alterar la tabla citas:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
