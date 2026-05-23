import { prisma } from '../database/client.js';
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';

function mergeUniqueIds(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

async function getAllSpeakersRaw() {
  const speakers = await prisma.$runCommandRaw({
    aggregate: 'Speaker',
    pipeline: [{ $match: {} }],
    cursor: {},
  });

  return normalizeMongoResponse(unwrapMongoAggregationBatch(speakers));
}

async function getLinkedSpeakerIds(eventId) {
  const speakers = await getAllSpeakersRaw();

  return speakers
    .filter((speaker) => (speaker.eventIds ?? []).includes(eventId))
    .map((speaker) => speaker.id);
}

async function syncSpeakerLinks(eventId, previousSpeakerIds, nextSpeakerIds) {
  const removed = previousSpeakerIds.filter(
    (speakerId) => !nextSpeakerIds.includes(speakerId),
  );
  const added = nextSpeakerIds.filter(
    (speakerId) => !previousSpeakerIds.includes(speakerId),
  );

  for (const speakerId of removed) {
    await prisma.$runCommandRaw({
      update: 'Speaker',
      updates: [
        {
          q: { _id: { $oid: speakerId } },
          u: { $pull: { eventIds: { $oid: eventId } } },
          upsert: false,
        },
      ],
    });
  }

  for (const speakerId of added) {
    await prisma.$runCommandRaw({
      update: 'Speaker',
      updates: [
        {
          q: { _id: { $oid: speakerId } },
          u: { $addToSet: { eventIds: { $oid: eventId } } },
          upsert: false,
        },
      ],
    });
  }
}

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
  // Accept either a date-only string YYYY-MM-DD (interpret as UTC midnight)
  // or a full ISO datetime string (return as-is parsed by Date).
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

  // Fallback: try to parse as full ISO datetime
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(`Data inválida em ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
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
    const [eventsResult, speakers] = await Promise.all([
      prisma.$runCommandRaw({
        aggregate: 'Event',
        pipeline: [{ $match: {} }],
        cursor: {},
      }),
      getAllSpeakersRaw(),
    ]);

    const events = normalizeMongoResponse(
      unwrapMongoAggregationBatch(eventsResult),
    );
    const speakerIdsByEventId = new Map();

    for (const speaker of speakers) {
      for (const eventId of speaker.eventIds ?? []) {
        const currentIds = speakerIdsByEventId.get(eventId) ?? [];
        currentIds.push(speaker.id);
        speakerIdsByEventId.set(eventId, currentIds);
      }
    }

    res.json(
      events.map((event) => ({
        ...event,
        speakerIds: mergeUniqueIds(
          event.speakerIds ?? [],
          speakerIdsByEventId.get(event.id) ?? [],
        ),
      })),
    );
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

    if (Array.isArray(data.speakerIds) && data.speakerIds.length > 0) {
      await syncSpeakerLinks(event.id, [], data.speakerIds);
    }

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
      const linkedSpeakerIds = mergeUniqueIds(
        currentEvent?.speakerIds ?? [],
        await getLinkedSpeakerIds(eventId),
      );

      await syncSpeakerLinks(eventId, linkedSpeakerIds, data.speakerIds || []);
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
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { speakerIds: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const linkedSpeakerIds = mergeUniqueIds(
      event.speakerIds ?? [],
      await getLinkedSpeakerIds(eventId),
    );

    await syncSpeakerLinks(eventId, linkedSpeakerIds, []);

    await prisma.event.delete({ where: { id: eventId } });
    res.status(200).json({ message: 'Evento deletado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar evento.' });
  }
}
