import { prisma } from '../database/client.js'; // Importa a instância do Prisma Client para interagir com o banco de dados
import { generateFileUrl } from '../services/certificateFileService.js'; // Função para gerar a URL pública do arquivo PDF do certificado
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';

// Upload de certificado PDF
export async function uploadCertificatePdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    // Monta a URL pública do arquivo usando o serviço
    const pdfUrl = generateFileUrl(req, req.file.filename);
    res.status(201).json(normalizeMongoResponse({ pdfUrl }));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload do PDF.' });
  }
}

// Listar todos os certificados
export async function getAllCertificates(req, res) {
  try {
    const certificates = await prisma.$runCommandRaw({
      aggregate: 'Certificate',
      pipeline: [{ $match: {} }],
      cursor: {},
    });
    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(certificates)));
  } catch (error) {
    console.error('getAllCertificates error:', error);
    res.status(500).json({ error: 'Erro ao buscar certificados.' });
  }
}

// Criar um novo certificado
// Função para gerar código de verificação aleatório
function generateVerificationCode(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseOptionalDate(fieldName, value) {
  if (value === undefined || value === null) {
    return value;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    const error = new Error(`Data inválida em ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsedDate;
}

// Criar um novo certificado
export async function createCertificate(req, res) {
  try {
    // Verifica se registration existe
    const registration = await prisma.registration.findUnique({
      where: { id: req.body.registrationId },
      select: {
        attendancePercent: true,
        approvedForCertificate: true,
        eventId: true,
      },
    });
    if (!registration)
      return res.status(404).json({ error: 'Inscrição não encontrada.' });

    // Verifica se já existe certificado para o registrationId
    const existing = await prisma.certificate.findUnique({
      where: { registrationId: req.body.registrationId },
    });
    if (existing)
      return res.status(400).json({
        error: 'Já existe certificado para esta inscrição.',
      });

    // Campos obrigatórios no schema: pdfUrl e issuedByAdminId
    if (!req.body.pdfUrl)
      return res.status(400).json({ error: 'URL do PDF é obrigatória.' });
    if (!req.body.issuedByAdminId)
      return res
        .status(400)
        .json({ error: 'ID do administrador é obrigatório.' });

    // Verifica se o emissor é ADMIN
    const issuer = await prisma.user.findUnique({
      where: { id: req.body.issuedByAdminId },
      select: { role: true },
    });
    if (!issuer || issuer.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ error: 'Apenas ADMIN pode emitir certificados.' });
    }

    // Verifica regra de presença mínima do evento (75% por padrão)
    const event = await prisma.event.findUnique({
      where: { id: registration.eventId },
      select: { certificateRequiredPercent: true },
    });
    const requiredPercent = event?.certificateRequiredPercent ?? 75;
    const attendancePercent =
      typeof registration.attendancePercent === 'number'
        ? registration.attendancePercent
        : 0;
    if (
      !registration.approvedForCertificate &&
      attendancePercent < requiredPercent
    ) {
      return res.status(400).json({
        error: `Inscrição não atingiu o percentual mínimo de presença (${requiredPercent}%).`,
      });
    }

    const data = {
      registrationId: req.body.registrationId,
      verificationCode: generateVerificationCode(),
      issueDate: req.body?.issueDate
        ? parseOptionalDate('issueDate', req.body.issueDate)
        : new Date(),
      pdfUrl: req.body.pdfUrl,
      issuedByAdminId: req.body.issuedByAdminId,
      attendancePercentAtIssue:
        typeof registration.attendancePercent === 'number'
          ? registration.attendancePercent
          : 0,
      expiresAt: parseOptionalDate('expiresAt', req.body.expiresAt),
    };

    const certificate = await prisma.certificate.create({ data });
    res.status(201).json(normalizeMongoResponse(certificate));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao criar certificado.',
    });
  }
}

// Buscar um certificado por ID
export async function getCertificateById(req, res) {
  try {
    const certificate = await prisma.certificate.findUnique({
      where: { id: req.params.id },
    });
    if (!certificate)
      return res.status(404).json({ error: 'Certificado não encontrado.' });
    res.json(normalizeMongoResponse(certificate));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar certificado.' });
  }
}

// Atualizar um certificado
export async function updateCertificate(req, res) {
  try {
    const data = { ...req.body };

    if (Object.prototype.hasOwnProperty.call(data, 'issueDate')) {
      data.issueDate = parseOptionalDate('issueDate', data.issueDate);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'expiresAt')) {
      data.expiresAt = parseOptionalDate('expiresAt', data.expiresAt);
    }

    const certificate = await prisma.certificate.update({
      where: { id: req.params.id },
      data,
    });
    res.json(normalizeMongoResponse(certificate));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar certificado.',
    });
  }
}

// Deletar um certificado
export async function deleteCertificate(req, res) {
  try {
    await prisma.certificate.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: 'Erro ao deletar certificado.' });
  }
}
