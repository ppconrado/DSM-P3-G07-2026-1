import bcrypt from 'bcryptjs';
import { prisma } from '../database/client.js';
import { normalizeMongoResponse } from '../services/mongoAggregationService.js';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_MS,
  buildAuthCookieOptions,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../services/authTokenService.js';

function stripPasswordHash(user) {
  if (Array.isArray(user)) {
    return user.map(stripPasswordHash);
  }

  if (!user || typeof user !== 'object') {
    return user;
  }

  const { passwordHash, refreshTokenHash, ...rest } = user;
  return rest;
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(
    ACCESS_COOKIE_NAME,
    accessToken,
    buildAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
  );
  res.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    buildAuthCookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
  );
}

function clearAuthCookies(res) {
  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.clearCookie(ACCESS_COOKIE_NAME, clearOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, clearOptions);
}

function getTokenFromCookies(req, cookieName) {
  return req.cookies?.[cookieName];
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        phone: true,
        role: true,
        isActive: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      user: stripPasswordHash(normalizeMongoResponse(user)),
      message: 'Login realizado com sucesso.',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao autenticar usuário.' });
  }
}

export async function refresh(req, res) {
  try {
    const refreshToken = getTokenFromCookies(req, REFRESH_COOKIE_NAME);

    if (!refreshToken) {
      return res.status(401).json({ error: 'Sessão expirada.' });
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Sessão expirada.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        refreshTokenHash: true,
        refreshTokenExpiresAt: true,
      },
    });

    if (!user || !user.isActive || !user.refreshTokenHash) {
      return res.status(401).json({ error: 'Sessão expirada.' });
    }

    if (
      user.refreshTokenExpiresAt &&
      user.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      return res.status(401).json({ error: 'Sessão expirada.' });
    }

    if (hashToken(refreshToken) !== user.refreshTokenHash) {
      return res.status(401).json({ error: 'Sessão expirada.' });
    }

    const accessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: hashToken(newRefreshToken),
        refreshTokenExpiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      },
    });

    setAuthCookies(res, accessToken, newRefreshToken);

    return res.json({
      user: stripPasswordHash(normalizeMongoResponse(user)),
      message: 'Sessão renovada com sucesso.',
    });
  } catch (error) {
    return res.status(401).json({ error: 'Sessão expirada.' });
  }
}

export async function logout(req, res) {
  try {
    const refreshToken = getTokenFromCookies(req, REFRESH_COOKIE_NAME);

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload?.sub) {
          await prisma.user.update({
            where: { id: payload.sub },
            data: {
              refreshTokenHash: null,
              refreshTokenExpiresAt: null,
            },
          });
        }
      } catch {
        // Token já inválido ou expirado. Apenas limpamos cookies.
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({ message: 'Logout realizado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao realizar logout.' });
  }
}

export async function me(req, res) {
  try {
    const accessToken = getTokenFromCookies(req, ACCESS_COOKIE_NAME);

    if (!accessToken) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const payload = verifyAccessToken(accessToken);

    if (!payload?.sub) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    return res.json({ user: normalizeMongoResponse(user) });
  } catch (error) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
}
