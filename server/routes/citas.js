import express from 'express'
import { verificarToken } from '../middleware/authMiddleware.js'
import {
  getCitas,
  createCita,
  updateCita,
  deleteCita,
  getHorariosOcupados
} from '../controllers/citasController.js'

const router = express.Router()

// Rutas públicas (sin auth)
router.post('/', createCita)
router.get('/horarios-ocupados', getHorariosOcupados)

// Rutas protegidas (Admin)
router.get('/', verificarToken, getCitas)
router.put('/:id', verificarToken, updateCita)
router.delete('/:id', verificarToken, deleteCita)

export default router
