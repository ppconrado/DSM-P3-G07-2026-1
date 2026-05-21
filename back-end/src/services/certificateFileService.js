import multer from 'multer'; // Importa o multer para lidar com uploads de arquivos
import path from 'path'; // Importa o path para manipulação de caminhos de arquivos
import { fileURLToPath } from 'url'; // Importa fileURLToPath para converter URLs de arquivos em caminhos do sistema de arquivos

// Para uso de __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do multer para salvar arquivos em /back-end/uploads
const storage = multer.diskStorage({
  // Define o destino dos arquivos enviados
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  // Define o nome do arquivo salvo, garantindo que seja único
  filename: function (req, file, cb) {
    // Gera um nome de arquivo único usando timestamp e um número aleatório
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Configuração do multer para upload de arquivos
const upload = multer({ storage });

// Função para obter a instância do multer configurada
export function getUpload() {
  return upload;
}

// Função para gerar URL pública do arquivo
export function generateFileUrl(req, filename) {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}
