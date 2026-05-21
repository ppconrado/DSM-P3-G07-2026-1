import express from 'express'; // Importa o Express para criar o roteador

// Importa as funções do controlador de registros
import {
  getAllRegistrations,
  createRegistration,
  getRegistrationById,
  updateRegistration,
  deleteRegistration,
} from '../controllers/registrationsController.js';

// Roteador para registros
const router = express.Router();

// Rotas para operações CRUD de registros
router.get('/', getAllRegistrations);
router.post('/', createRegistration);
router.get('/:id', getRegistrationById);
router.put('/:id', updateRegistration);
router.delete('/:id', deleteRegistration);

export default router; // Exporta o roteador para ser usado em outras partes da aplicação
