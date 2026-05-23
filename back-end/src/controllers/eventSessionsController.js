import { prisma } from '../database/client.js';
import { recalculateRegistrationsForEvent } from '../services/attendanceProgressService.js';
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';

function parseRequiredDate(fieldName, value) {
  // Accept either YYYY-MM-DD (interpret as UTC midnight) or full ISO datetime
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    if (Number.isNaN(parsedDate.getTime())) {
      const error = new Error(`Data inválida em ${fieldName}.`);
      error.statusCode = 400;
      throw error;
    }
    return parsedDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Data inválida em ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

function toUtcDateOnlyTimestamp(value) {
  const date = new Date(value);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function validateSessionDateRange(eventId, sessionDate) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startDate: true, endDate: true },
  });

  if (!event) {
    const error = new Error('Evento não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const sessionKey = toUtcDateOnlyTimestamp(sessionDate);
  const startKey = toUtcDateOnlyTimestamp(event.startDate);
  const endKey = toUtcDateOnlyTimestamp(event.endDate);

  if (sessionKey < startKey || sessionKey > endKey) {
    const error = new Error(
      'Data da sessão deve estar dentro do período do evento.',
    );
    error.statusCode = 400;
    throw error;
  }
}

export async function getAllEventSessions(req, res) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const sessions = await prisma.$runCommandRaw({
      aggregate: 'EventSession',
      pipeline: [{ $match: { eventId: { $oid: req.params.eventId } } }],
      cursor: {},
    });

    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(sessions)));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sessões.' });
  }
}

export async function createEventSession(req, res) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const sessionDate = parseRequiredDate('sessionDate', req.body.sessionDate);
    await validateSessionDateRange(req.params.eventId, req.body.sessionDate);

    const session = await prisma.eventSession.create({
      data: {
        ...req.body,
        sessionDate,
        eventId: req.params.eventId,
      },
    });

    await recalculateRegistrationsForEvent(req.params.eventId);

    res.status(201).json(normalizeMongoResponse(session));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao criar sessão.',
    });
  }
}

export async function getEventSessionById(req, res) {
  try {
    const session = await prisma.eventSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session || session.eventId !== req.params.eventId) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    res.json(normalizeMongoResponse(session));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sessão.' });
  }
}

export async function updateEventSession(req, res) {
  try {
    const existingSession = await prisma.eventSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existingSession || existingSession.eventId !== req.params.eventId) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    const data = { ...req.body };
    delete data.eventId;

    if (Object.prototype.hasOwnProperty.call(data, 'sessionDate')) {
      data.sessionDate = parseRequiredDate('sessionDate', data.sessionDate);
      await validateSessionDateRange(req.params.eventId, req.body.sessionDate);
    }

    const session = await prisma.eventSession.update({
      where: { id: req.params.id },
      data,
    });

    await recalculateRegistrationsForEvent(req.params.eventId);

    res.json(normalizeMongoResponse(session));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar sessão.',
    });
  }
}

export async function deleteEventSession(req, res) {
  try {
    const existingSession = await prisma.eventSession.findUnique({
      where: { id: req.params.id },
    });

    if (!existingSession || existingSession.eventId !== req.params.eventId) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    await prisma.eventSession.delete({ where: { id: req.params.id } });
    await recalculateRegistrationsForEvent(req.params.eventId);

    res.status(200).json({ message: 'Sessão deletada com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar sessão.' });
  }
}

export async function getAttendancesBySession(req, res) {
  try {
    const session = await prisma.eventSession.findUnique({
      where: { id: req.params.sessionId },
      select: { eventId: true },
    });

    if (!session || session.eventId !== req.params.eventId) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    const attendances = await prisma.$runCommandRaw({
      aggregate: 'Attendance',
      pipeline: [
        { $match: { eventSessionId: { $oid: req.params.sessionId } } },
      ],
      cursor: {},
    });

    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(attendances)));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar presenças da sessão.' });
  }
}
