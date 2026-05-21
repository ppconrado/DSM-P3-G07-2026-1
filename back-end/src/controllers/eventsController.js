import { prisma } from '../database/client.js';
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';

function validateObjectId(fieldName, value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{24}$/.test(value)) {
    const error = new Error(`ID inválido em ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }
}

async function isAdminUser(userId) {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'ADMIN';
}

function parseEventDate(fieldName, value) {
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

function normalizeEventDates(data) {
  const normalized = { ...data };

  if (Object.prototype.hasOwnProperty.call(normalized, 'startDate')) {
    normalized.startDate = parseEventDate('startDate', normalized.startDate);
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'endDate')) {
    normalized.endDate = parseEventDate('endDate', normalized.endDate);
  }

  return normalized;
}

export async function getAllEvents(req, res) {
  try {
    // Use raw Mongo aggregation to avoid Prisma type conversion errors when DB documents contain nulls
    const events = await prisma.$runCommandRaw({
      aggregate: 'Event',
      pipeline: [{ $match: {} }],
      cursor: {},
    });
    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(events)));
  } catch (error) {
    console.error('getAllEvents error:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos.' });
  }
}

export async function createEvent(req, res) {
  try {
    const creatorId = req.body.createdByAdminId;
    validateObjectId('createdByAdminId', creatorId);

    if (!(await isAdminUser(creatorId))) {
      return res
        .status(403)
        .json({ error: 'Apenas ADMIN pode criar eventos.' });
    }

    const data = normalizeEventDates(req.body);

    const event = await prisma.event.create({
      data,
    });
    res.status(201).json(normalizeMongoResponse(event));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao criar evento.',
    });
  }
}

export async function getEventById(req, res) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
    });
    if (!event)
      return res.status(404).json({ error: 'Evento não encontrado.' });
    res.json(normalizeMongoResponse(event));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar evento.' });
  }
}

export async function updateEvent(req, res) {
  try {
    const data = normalizeEventDates(req.body);
    const currentEvent = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { speakerIds: true },
    });

    // If publishing event, validate business rules: at least one session and one speaker
    if (data.status === 'ATIVA') {
      const sessionsCount = await prisma.eventSession.count({
        where: { eventId: req.params.id },
      });
      const effectiveSpeakerIds = Array.isArray(data.speakerIds)
        ? data.speakerIds
        : currentEvent?.speakerIds || [];
      const speakersCount = effectiveSpeakerIds.length;
      if (sessionsCount < 1)
        return res.status(400).json({
          error: 'Não é possível publicar evento sem ao menos uma sessão.',
        });
      if (speakersCount < 1)
        return res.status(400).json({
          error: 'Não é possível publicar evento sem ao menos um palestrante.',
        });
    }

    // If speakerIds provided, synchronize Speaker.eventIds arrays
    if (Array.isArray(data.speakerIds)) {
      const eventId = req.params.id;
      const oldEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { speakerIds: true },
      });
      const oldSids = oldEvent?.speakerIds || [];
      const newSids = data.speakerIds || [];

      // removed speakers: present in old but not in new
      const removed = oldSids.filter((s) => !newSids.includes(s));
      // added speakers: present in new but not in old
      const added = newSids.filter((s) => !oldSids.includes(s));

      // Use atomic updates on Speaker.eventIds to avoid race conditions
      for (const sid of removed) {
        await prisma.$runCommandRaw({
          update: 'Speaker',
          updates: [
            {
              q: { _id: { $oid: sid } },
              u: { $pull: { eventIds: { $oid: eventId } } },
              upsert: false,
            },
          ],
        });
      }
      for (const sid of added) {
        await prisma.$runCommandRaw({
          update: 'Speaker',
          updates: [
            {
              q: { _id: { $oid: sid } },
              u: { $addToSet: { eventIds: { $oid: eventId } } },
              upsert: false,
            },
          ],
        });
      }
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
    });
    res.json(normalizeMongoResponse(event));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar evento.',
    });
  }
}

export async function deleteEvent(req, res) {
  try {
    const eventId = req.params.id;
    // Remove eventId from all related speakers' eventIds arrays
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { speakerIds: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }
    const sids = event?.speakerIds || [];
    for (const sid of sids) {
      await prisma.$runCommandRaw({
        update: 'Speaker',
        updates: [
          {
            q: { _id: { $oid: sid } },
            u: { $pull: { eventIds: { $oid: eventId } } },
            upsert: false,
          },
        ],
      });
    }

    await prisma.event.delete({ where: { id: eventId } });
    res.status(200).json({ message: 'Evento deletado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar evento.' });
  }
}
