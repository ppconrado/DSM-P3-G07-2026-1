import { prisma } from '../database/client.js';
import { recalculateRegistrationProgress } from '../services/attendanceProgressService.js';
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

async function validateAttendanceScope(registrationId, attendanceId) {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });

  if (!attendance || attendance.registrationId !== registrationId) {
    return null;
  }

  return attendance;
}

async function isAdminUser(userId) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user && user.role === 'ADMIN';
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

export async function getAllAttendanceByRegistration(req, res) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: req.params.registrationId },
      select: { id: true },
    });

    if (!registration) {
      return res.status(404).json({ error: 'Inscrição não encontrada.' });
    }

    const attendances = await prisma.$runCommandRaw({
      aggregate: 'Attendance',
      pipeline: [
        { $match: { registrationId: { $oid: req.params.registrationId } } },
      ],
      cursor: {},
    });

    res.json(normalizeMongoResponse(unwrapMongoAggregationBatch(attendances)));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar presenças.' });
  }
}

export async function createAttendance(req, res) {
  try {
    validateObjectId('registrationId', req.params.registrationId);
    validateObjectId('eventSessionId', req.body.eventSessionId);

    const registration = await prisma.registration.findUnique({
      where: { id: req.params.registrationId },
      select: { eventId: true },
    });

    if (!registration) {
      return res.status(404).json({ error: 'Inscrição não encontrada.' });
    }

    const eventSession = await prisma.eventSession.findUnique({
      where: { id: req.body.eventSessionId },
      select: { eventId: true },
    });

    if (!eventSession) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    if (eventSession.eventId !== registration.eventId) {
      return res
        .status(400)
        .json({ error: 'Sessão não pertence ao evento da inscrição.' });
    }

    // Only ADMIN can mark presence according to the memorial/UML
    const markerId = req.body.markedByUserId;
    validateObjectId('markedByUserId', markerId);

    if (!markerId || !(await isAdminUser(markerId))) {
      return res
        .status(403)
        .json({ error: 'Apenas ADMIN pode marcar presença.' });
    }

    const attendance = await prisma.attendance.create({
      data: {
        registrationId: req.params.registrationId,
        eventSessionId: req.body.eventSessionId,
        present: Boolean(req.body.present),
        checkInAt: parseOptionalDate('checkInAt', req.body.checkInAt),
        checkOutAt: parseOptionalDate('checkOutAt', req.body.checkOutAt),
        markedByUserId: markerId,
        notes: req.body.notes,
      },
    });

    await recalculateRegistrationProgress(req.params.registrationId);

    res.status(201).json(normalizeMongoResponse(attendance));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao criar presença.',
    });
  }
}

export async function getAttendanceById(req, res) {
  try {
    const attendance = await validateAttendanceScope(
      req.params.registrationId,
      req.params.attendanceId,
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Presença não encontrada.' });
    }

    res.json(normalizeMongoResponse(attendance));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar presença.' });
  }
}

export async function updateAttendance(req, res) {
  try {
    const attendance = await validateAttendanceScope(
      req.params.registrationId,
      req.params.attendanceId,
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Presença não encontrada.' });
    }

    const data = { ...req.body };
    delete data.registrationId;
    delete data.eventSessionId;

    if (Object.prototype.hasOwnProperty.call(data, 'checkInAt')) {
      data.checkInAt = parseOptionalDate('checkInAt', data.checkInAt);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'checkOutAt')) {
      data.checkOutAt = parseOptionalDate('checkOutAt', data.checkOutAt);
    }

    // Only ADMIN can update presence markings
    const updaterId = req.body.markedByUserId || attendance.markedByUserId;
    if (!updaterId || !(await isAdminUser(updaterId))) {
      return res
        .status(403)
        .json({ error: 'Apenas ADMIN pode atualizar presença.' });
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: req.params.attendanceId },
      data,
    });

    await recalculateRegistrationProgress(req.params.registrationId);

    res.json(normalizeMongoResponse(updatedAttendance));
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar presença.',
    });
  }
}

export async function deleteAttendance(req, res) {
  try {
    const attendance = await validateAttendanceScope(
      req.params.registrationId,
      req.params.attendanceId,
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Presença não encontrada.' });
    }

    // Only ADMIN can delete presence
    const deleterId = req.body.markedByUserId || attendance.markedByUserId;
    if (!deleterId || !(await isAdminUser(deleterId))) {
      return res
        .status(403)
        .json({ error: 'Apenas ADMIN pode remover presença.' });
    }

    await prisma.attendance.delete({ where: { id: req.params.attendanceId } });
    await recalculateRegistrationProgress(req.params.registrationId);

    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: 'Erro ao deletar presença.' });
  }
}
