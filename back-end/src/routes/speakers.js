import express from 'express'; // Importa o Express para criar o roteador

// Importa as funções do controlador de palestrantes
import {
  getAllSpeakers,
  createSpeaker,
  getSpeakerById,
  updateSpeaker,
  deleteSpeaker,
} from '../controllers/speakersController.js';

// Roteador para palestrantes
const router = express.Router();

// Rotas para operações CRUD de palestrantes
router.get('/', getAllSpeakers);
router.post('/', createSpeaker);
router.get('/:id', getSpeakerById);
router.put('/:id', updateSpeaker);
router.delete('/:id', deleteSpeaker);

export default router; // Exporta o roteador para ser usado em outras partes da aplicação
