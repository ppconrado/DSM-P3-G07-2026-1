import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'academyflow-access-secret-dev';
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'academyflow-refresh-secret-dev';
const ACCESS_TOKEN_TTL = '15m';
// 12 houras em secundos (hard-coded por decisão de produto)
// TODO: move to environment variable like process.env.REFRESH_TOKEN_TTL_SECONDS
// in a future improvement to make this configurable without code changes.
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export const ACCESS_COOKIE_NAME = 'academyflow_access_token';
export const REFRESH_COOKIE_NAME = 'academyflow_refresh_token';

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      tokenType: 'refresh',
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

export function buildAuthCookieOptions(maxAgeMilliseconds) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMilliseconds,
  };
}

export const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
// 12 hours in milliseconds (hard-coded)
// TODO: consider reading from process.env.REFRESH_TOKEN_MAX_AGE_MS
export const REFRESH_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 12;
