import express from 'express'; //

// Importa as funções do controlador de eventos
import {
  getAllEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/eventsController.js';

// Roteador para eventos
const router = express.Router();

// Rotas para operações CRUD de eventos
router.get('/', getAllEvents);
router.post('/', createEvent);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router; // Exporta o roteador para ser usado em outras partes da aplicação
