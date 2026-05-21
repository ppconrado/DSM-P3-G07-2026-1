import { prisma } from '../database/client.js';
import { Prisma } from '@prisma/client';
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

function isUniqueEmailViolation(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    error.meta?.target?.includes('email')
  );
}

export async function getAllSpeakers(req, res) {
  try {
    const speakers = await prisma.$runCommandRaw({
      aggregate: 'Speaker',
      pipeline: [{ $match: {} }],
      cursor: {},
    });
    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(speakers)));
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
      const oldSp = await prisma.speaker.findUnique({
        where: { id: speakerId },
        select: { eventIds: true },
      });
      const oldEids = oldSp?.eventIds || [];
      const newEids = data.eventIds || [];

      const removed = oldEids.filter((e) => !newEids.includes(e));
      const added = newEids.filter((e) => !oldEids.includes(e));

      // Use atomic updates on Event.speakerIds to avoid race conditions
      for (const eid of removed) {
        await prisma.$runCommandRaw({
          update: 'Event',
          updates: [
            {
              q: { _id: { $oid: eid } },
              u: { $pull: { speakerIds: { $oid: speakerId } } },
              upsert: false,
            },
          ],
        });
      }
      for (const eid of added) {
        await prisma.$runCommandRaw({
          update: 'Event',
          updates: [
            {
              q: { _id: { $oid: eid } },
              u: { $addToSet: { speakerIds: { $oid: speakerId } } },
              upsert: false,
            },
          ],
        });
      }
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
    // Remove speakerId from all related events' speakerIds arrays
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId },
      select: { eventIds: true },
    });
    if (!speaker) {
      return res.status(404).json({ error: 'Palestrante não encontrado.' });
    }
    const eids = speaker?.eventIds || [];
    for (const eid of eids) {
      await prisma.$runCommandRaw({
        update: 'Event',
        updates: [
          {
            q: { _id: { $oid: eid } },
            u: { $pull: { speakerIds: { $oid: speakerId } } },
            upsert: false,
          },
        ],
      });
    }

    await prisma.speaker.delete({ where: { id: speakerId } });
    res.status(200).json({ message: 'Palestrante deletado com sucesso.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.message || 'Erro ao deletar palestrante.',
    });
  }
}
