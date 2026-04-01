import pool from '../db/pool.js'
import { generarIdUnico } from '../utils/generarId.js'

// Horarios disponibles de la clínica
const HORARIOS_DISPONIBLES = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30'
]

export const getCitas = async (req, res) => {
  try {
    const query = `
      SELECT * FROM citas 
      WHERE deleted_at IS NULL 
      ORDER BY fecha ASC, horario ASC
    `
    const { rows } = await pool.query(query)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener citas', detalle: error.message })
  }
}

// Devuelve los horarios OCUPADOS para una fecha específica
export const getHorariosOcupados = async (req, res) => {
  try {
    const { fecha } = req.query
    if (!fecha) {
      return res.status(400).json({ error: 'Se requiere una fecha para consultar horarios.' })
    }
    const query = `
      SELECT horario FROM citas
      WHERE fecha = $1 AND deleted_at IS NULL AND horario IS NOT NULL
    `
    const { rows } = await pool.query(query, [fecha])
    const ocupados = rows.map(r => r.horario)
    res.json({ fecha, ocupados })
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar horarios', detalle: error.message })
  }
}

export const createCita = async (req, res) => {
  try {
    const { 
      cliente_nombre, cliente_telefono, fecha, horario,
      atencion_previa, peso, estatura 
    } = req.body

    // Validar campos obligatorios
    if (!cliente_nombre || !cliente_telefono || !fecha || !horario) {
      return res.status(400).json({ 
        error: 'Todos los campos obligatorios deben estar completos (nombre, teléfono, fecha y horario).' 
      })
    }

    // Verificar si el horario ya está ocupado para esa fecha
    const conflictoQuery = `
      SELECT id FROM citas
      WHERE fecha = $1 AND horario = $2 AND deleted_at IS NULL
    `
    const conflicto = await pool.query(conflictoQuery, [fecha, horario])

    if (conflicto.rows.length > 0) {
      return res.status(409).json({
        error: `Lo sentimos, el horario ${horario} del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} ya está reservado. Por favor, elige otra fecha u horario e intenta de nuevo.`,
        codigo: 'HORARIO_OCUPADO'
      })
    }

    const newId = await generarIdUnico('citas')

    const query = `
      INSERT INTO citas (
        id, cliente_nombre, cliente_telefono, fecha, horario,
        atencion_previa, peso, estatura
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const values = [
      newId, cliente_nombre, cliente_telefono, fecha, horario,
      atencion_previa || 'no', 
      peso ? parseFloat(peso) : null, 
      estatura ? parseFloat(estatura) : null
    ]

    const { rows } = await pool.query(query, values)
    res.status(201).json(rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al solicitar cita', detalle: error.message })
  }
}

export const updateCita = async (req, res) => {
  try {
    const { id } = req.params
    const { 
      cliente_nombre, cliente_telefono, fecha, horario,
      atencion_previa, peso, estatura 
    } = req.body

    // Verificar conflicto (excluyendo la cita actual)
    if (fecha && horario) {
      const conflictoQuery = `
        SELECT id FROM citas
        WHERE fecha = $1 AND horario = $2 AND deleted_at IS NULL AND id != $3
      `
      const conflicto = await pool.query(conflictoQuery, [fecha, horario, id])
      if (conflicto.rows.length > 0) {
        return res.status(409).json({
          error: `El horario ${horario} del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} ya está reservado.`,
          codigo: 'HORARIO_OCUPADO'
        })
      }
    }

    const query = `
      UPDATE citas 
      SET cliente_nombre = $1, 
          cliente_telefono = $2, 
          fecha = $3,
          horario = $4,
          atencion_previa = $5, 
          peso = $6, 
          estatura = $7, 
          updated_at = NOW() 
      WHERE id = $8 AND deleted_at IS NULL 
      RETURNING *
    `
    const values = [
      cliente_nombre, cliente_telefono, fecha, horario,
      atencion_previa || 'no', 
      peso ? parseFloat(peso) : null, 
      estatura ? parseFloat(estatura) : null,
      id
    ]

    const { rows } = await pool.query(query, values)
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' })
    }

    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la cita', detalle: error.message })
  }
}

export const deleteCita = async (req, res) => {
  try {
    const { id } = req.params
    const query = `
      UPDATE citas 
      SET deleted_at = NOW() 
      WHERE id = $1 AND deleted_at IS NULL 
      RETURNING id
    `
    const { rows } = await pool.query(query, [id])
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada o ya eliminada' })
    }

    res.json({ message: 'Cita eliminada correctamente' })
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cita', detalle: error.message })
  }
}
