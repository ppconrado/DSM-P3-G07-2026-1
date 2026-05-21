import express from 'express';
import { getUpload } from '../services/certificateFileService.js'; // Importa a função para obter a instância do multer configurada

// Importa as funções do controlador de certificados
import {
  getAllCertificates,
  createCertificate,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
  uploadCertificatePdf,
} from '../controllers/certificatesController.js';

// Obtém a instância do multer configurada
const upload = getUpload();

// Roteador para certificados
const router = express.Router();

// Rotas para operações CRUD de certificados
router.get('/', getAllCertificates);
router.post('/', createCertificate);
router.get('/:id', getCertificateById);
router.put('/:id', updateCertificate);
router.delete('/:id', deleteCertificate);

// Rota para upload de certificado PDF
router.post('/upload', upload.single('pdf'), uploadCertificatePdf);

export default router; // Exporta o roteador para ser usado em outras partes da aplicação
