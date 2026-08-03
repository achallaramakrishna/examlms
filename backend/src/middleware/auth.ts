import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/User';

// req.user is typed via the global Express.User augmentation in types/express.d.ts

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwt.secret) as { sub: string; email: string; role: UserRole };
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Must run after requireAuth. Rejects with 403 if the authenticated user's
 * role isn't in the allowed list. Role is read from the JWT (set at
 * login/register), not re-fetched from the DB on every request — a role
 * change won't take effect until the user's token is refreshed.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Missing or malformed Authorization header' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
}

export function signAccessToken(user: { id: string; email: string; role: UserRole }): string {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwt.secret, options);
}

export function signRefreshToken(user: { id: string }): string {
  const options: SignOptions = { expiresIn: env.jwt.refreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.jwt.secret, options);
}
