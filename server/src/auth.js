import jwt from 'jsonwebtoken';
import 'dotenv/config';

const SECRET = process.env.JWT_SECRET || 'expohub-dev-secret-change-me';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET, { expiresIn: EXPIRES_IN });
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Optional auth: attaches req.user when a valid token is present, else continues.
export function authOptional(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch { /* ignore */ }
  }
  next();
}
