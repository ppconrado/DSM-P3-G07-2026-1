import { prisma } from '../database/client.js';
import { Prisma } from '@prisma/client';
import {
  normalizeMongoResponse,
  unwrapMongoAggregationBatch,
} from '../services/mongoAggregationService.js';

function mergeUniqueIds(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

async function getAllEventsRaw() {
  const events = await prisma.$runCommandRaw({
    aggregate: 'Event',
    pipeline: [{ $match: {} }],
    cursor: {},
  });

  return normalizeMongoResponse(unwrapMongoAggregationBatch(events));
}

async function getLinkedEventIds(speakerId) {
  const events = await getAllEventsRaw();

  return events
    .filter((event) => (event.speakerIds ?? []).includes(speakerId))
    .map((event) => event.id);
}

async function syncEventLinks(speakerId, previousEventIds, nextEventIds) {
  const removed = previousEventIds.filter(
    (eventId) => !nextEventIds.includes(eventId),
  );
  const added = nextEventIds.filter(
    (eventId) => !previousEventIds.includes(eventId),
  );

  for (const eventId of removed) {
    await prisma.$runCommandRaw({
      update: 'Event',
      updates: [
        {
          q: { _id: { $oid: eventId } },
          u: { $pull: { speakerIds: { $oid: speakerId } } },
          upsert: false,
        },
      ],
    });
  }

  for (const eventId of added) {
    await prisma.$runCommandRaw({
      update: 'Event',
      updates: [
        {
          q: { _id: { $oid: eventId } },
          u: { $addToSet: { speakerIds: { $oid: speakerId } } },
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

function isUniqueEmailViolation(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    error.meta?.target?.includes('email')
  );
}

export async function getAllSpeakers(req, res) {
  try {
    const [speakersResult, events] = await Promise.all([
      prisma.$runCommandRaw({
        aggregate: 'Speaker',
        pipeline: [{ $match: {} }],
        cursor: {},
      }),
      getAllEventsRaw(),
    ]);

    const speakers = normalizeMongoResponse(
      unwrapMongoAggregationBatch(speakersResult),
    );
    const eventIdsBySpeakerId = new Map();

    for (const event of events) {
      for (const speakerId of event.speakerIds ?? []) {
        const currentIds = eventIdsBySpeakerId.get(speakerId) ?? [];
        currentIds.push(event.id);
        eventIdsBySpeakerId.set(speakerId, currentIds);
      }
    }

    res.json(
      speakers.map((speaker) => ({
        ...speaker,
        eventIds: mergeUniqueIds(
          speaker.eventIds ?? [],
          eventIdsBySpeakerId.get(speaker.id) ?? [],
        ),
      })),
    );
  } catch (error) {
    console.error('getAllSpeakers error:', error);
    res.status(500).json({ error: 'Erro ao buscar palestrantes.' });
  }
}

export async function createSpeaker(req, res) {
  try {
    const speaker = await prisma.speaker.create({
      data: req.body,
    });

    if (Array.isArray(req.body?.eventIds) && req.body.eventIds.length > 0) {
      await syncEventLinks(speaker.id, [], req.body.eventIds);
    }

    res.status(201).json(normalizeMongoResponse(speaker));
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    res.status(400).json({ error: 'Erro ao criar palestrante.' });
  }
}

export async function getSpeakerById(req, res) {
  try {
    validateObjectId('speakerId', req.params.id);

    const speaker = await prisma.speaker.findUnique({
      where: { id: req.params.id },
    });
    if (!speaker)
      return res.status(404).json({ error: 'Palestrante não encontrado.' });
    res.json(normalizeMongoResponse(speaker));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || 'Erro ao buscar palestrante.',
    });
  }
}

export async function updateSpeaker(req, res) {
  try {
    validateObjectId('speakerId', req.params.id);

    const data = { ...req.body };
    const speakerId = req.params.id;

    // If eventIds provided, synchronize Event.speakerIds arrays
    if (Array.isArray(data.eventIds)) {
      const currentLinkedEventIds = mergeUniqueIds(
        (
          await prisma.speaker.findUnique({
            where: { id: speakerId },
            select: { eventIds: true },
          })
        )?.eventIds ?? [],
        await getLinkedEventIds(speakerId),
      );

      await syncEventLinks(
        speakerId,
        currentLinkedEventIds,
        data.eventIds || [],
      );
    }

    const speaker = await prisma.speaker.update({
      where: { id: speakerId },
      data,
    });
    res.json(normalizeMongoResponse(speaker));
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar palestrante.',
    });
  }
}

export async function deleteSpeaker(req, res) {
  try {
    validateObjectId('speakerId', req.params.id);

    const speakerId = req.params.id;
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId },
      select: { eventIds: true },
    });
    if (!speaker) {
      return res.status(404).json({ error: 'Palestrante não encontrado.' });
    }

    const linkedEventIds = mergeUniqueIds(
      speaker.eventIds ?? [],
      await getLinkedEventIds(speakerId),
    );

    await syncEventLinks(speakerId, linkedEventIds, []);

    await prisma.speaker.delete({ where: { id: speakerId } });
    res.status(200).json({ message: 'Palestrante deletado com sucesso.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || 'Erro ao deletar palestrante.',
    });
  }
}
