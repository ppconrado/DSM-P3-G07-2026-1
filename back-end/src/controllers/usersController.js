import { prisma } from '../database/client.js';
import { normalizeMongoResponse } from '../services/mongoAggregationService.js';
import bcrypt from 'bcryptjs';

const VALID_USER_ROLES = new Set(['ADMIN', 'PARTICIPANTE']);
const PASSWORD_HASH_ROUNDS = 10;

function isUniqueEmailViolation(error) {
  if (!error || error.code !== 'P2002') {
    return false;
  }

  const target = error.meta?.target;

  return (
    target === 'User_email_key' ||
    (Array.isArray(target) && target.includes('email'))
  );
}

function stripPasswordHash(user) {
  if (Array.isArray(user)) {
    return user.map(stripPasswordHash);
  }

  if (!user || typeof user !== 'object') {
    return user;
  }

  const { passwordHash, ...rest } = user;
  return rest;
}

async function normalizeUserData(reqBody, { requirePasswordHash = true } = {}) {
  const data = { ...reqBody };

  if (data.role && !VALID_USER_ROLES.has(data.role)) {
    const error = new Error('Função de usuário inválida.');
    error.statusCode = 400;
    throw error;
  }

  const plainPassword = data.password ?? data.passwordHash;

  delete data.password;
  delete data.passwordHash;
  delete data.id;

  if (plainPassword !== undefined) {
    if (typeof plainPassword !== 'string' || !plainPassword.trim()) {
      const error = new Error('Senha inválida.');
      error.statusCode = 400;
      throw error;
    }

    data.passwordHash = await bcrypt.hash(plainPassword, PASSWORD_HASH_ROUNDS);
  } else if (requirePasswordHash) {
    const error = new Error('Senha é obrigatória.');
    error.statusCode = 400;
    throw error;
  }

  return data;
}

export async function getAllUsers(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const users = await prisma.user.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(stripPasswordHash(normalizeMongoResponse(users)));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
}

export async function createUser(req, res) {
  try {
    const user = await prisma.user.create({
      data: await normalizeUserData(req.body, { requirePasswordHash: true }),
    });
    res.status(201).json(stripPasswordHash(normalizeMongoResponse(user)));
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao criar usuário.',
    });
  }
}

export async function getUserById(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json(stripPasswordHash(normalizeMongoResponse(user)));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
}

export async function updateUser(req, res) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: await normalizeUserData(req.body, { requirePasswordHash: false }),
    });

    res.json(stripPasswordHash(normalizeMongoResponse(user)));
  } catch (error) {
    if (isUniqueEmailViolation(error)) {
      return res.status(409).json({ error: 'E-mail já cadastrado.' });
    }

    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({
      error: error.message || 'Erro ao atualizar usuário.',
    });
  }
}

export async function deleteUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, isActive: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (!user.isActive) {
      return res.status(409).json({ error: 'Usuário já está inativo.' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.status(200).json({ message: 'Usuário desativado com sucesso.' });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao desativar usuário.' });
  }
}
