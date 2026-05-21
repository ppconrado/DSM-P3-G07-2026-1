import { prisma } from '../database/client.js';
import { Prisma } from '@prisma/client';
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';
// Listar todas as inscrições
export async function getAllRegistrations(req, res) {
  try {
    const registrations = await prisma.$runCommandRaw({
      aggregate: 'Registration',
      pipeline: [{ $match: {} }],
      cursor: {},
    });
    res.json(
      normalizeMongoResponse(unwrapMongoAggregationBatch(registrations)),
    );
  } catch (error) {
    console.error('getAllRegistrations error:', error);
    res.status(500).json({ error: 'Erro ao buscar inscrições.' });
  }
}
// Criar uma nova inscrição
export async function createRegistration(req, res) {
  try {
    const { participantId, eventId } = req.body;

    const existingRegistration = await prisma.registration.findFirst({
      where: { participantId, eventId },
      select: { id: true },
    });
    if (existingRegistration) {
      return res.status(409).json({
        error:
          'Inscrição duplicada: este participante já está inscrito neste evento.',
      });
    }

    // Verifica se o evento existe e está ATIVA
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, capacity: true },
    });
    if (!event)
      return res.status(404).json({ error: 'Evento não encontrado.' });
    if (event.status !== 'ATIVA')
      return res
        .status(400)
        .json({ error: 'Inscrição só permitida em eventos com status ATIVA.' });
    // Verifica capacidade
    const registrationsCount = await prisma.registration.count({
      where: { eventId },
    });
    if (
      typeof event.capacity === 'number' &&
      registrationsCount >= event.capacity
    )
      return res.status(400).json({ error: 'Capacidade do evento atingida.' });

    // Ensure totalSessionsCount is set (derived from EventSession if client didn't provide)
    const sessionsCount = await prisma.eventSession.count({
      where: { eventId },
    });
    const createData = {
      ...req.body,
      totalSessionsCount:
        typeof req.body.totalSessionsCount === 'number'
          ? req.body.totalSessionsCount
          : sessionsCount,
    };
    const registration = await prisma.registration.create({ data: createData });
    res.status(201).json(normalizeMongoResponse(registration));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        error:
          'Inscrição duplicada: este participante já está inscrito neste evento.',
      });
    }
    res.status(400).json({ error: 'Erro ao criar inscrição.' });
  }
}
// Buscar uma inscrição por ID
export async function getRegistrationById(req, res) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
    });
    if (!registration)
      return res.status(404).json({ error: 'Inscrição não encontrada.' });
    res.json(normalizeMongoResponse(registration));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar inscrição.' });
  }
}
// Atualizar uma inscrição
export async function updateRegistration(req, res) {
  try {
    const registration = await prisma.registration.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(normalizeMongoResponse(registration));
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(409).json({
        error:
          'Conflito de dados: ja existe inscricao deste participante para este evento.',
      });
    }
    res.status(400).json({ error: 'Erro ao atualizar inscrição.' });
  }
}
// Deletar uma inscrição
export async function deleteRegistration(req, res) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.id },
    });
    if (!registration) {
      return res.status(404).json({ error: 'Inscrição não encontrada.' });
    }

    await prisma.registration.delete({
      where: { id: req.params.id },
    });
    res.status(200).json({ message: 'Inscrição deletada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar inscrição.' });
  }
}
