import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

// Extend Express Request so controllers can access req.user
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_SECRET = process.env.SERVICE_SECRET;

// ─── User JWT Authentication ───────────────────────────────────────────────

/**
 * Verifies the Bearer JWT token issued by the auth service.
 * Attaches the decoded payload to req.user on success.
 */
export function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    try {
        if (!JWT_SECRET) {
            res.status(500).json({ error: 'JWT_SECRET is not configured' });
            return;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

        if (payload.type !== 'access' || !payload.userId || !payload.email || !payload.role) {
            res.status(401).json({ error: 'Invalid token type or missing required fields' });
            return;
        }

        req.user = {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            type: 'access',
        };

        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ─── Role Guards ──────────────────────────────────────────────────────────

/**
 * Restricts a route to specific roles.
 * Must be used after `authenticate`.
 *
 * Example: requireRole(UserRole.ADMIN, UserRole.REVIEWER)
 */
export function requireRole(...roles: UserRole[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        if (!req.user.role || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}

/** Shortcut: restricts to admin only. */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
}

// ─── Service-to-Service Authentication ───────────────────────────────────

/**
 * Validates calls from other trusted internal services.
 * Accepts either:
 *   - Bearer <JWT service token>  (signed with JWT_SECRET, type = 'service')
 *   - Service <shared secret>     (raw SERVICE_SECRET string)
 */
export function authenticateService(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).json({ error: 'No authorization header provided' });
            return;
        }

        // Option 1: Bearer JWT service token
        if (authHeader.startsWith('Bearer ')) {
            if (!JWT_SECRET) {
                res.status(500).json({ error: 'JWT_SECRET is not configured' });
                return;
            }
            const token = authHeader.substring(7);
            const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

            if (payload.type !== 'service' || !payload.serviceName) {
                res.status(401).json({ error: 'Invalid service token' });
                return;
            }
            next();
            return;
        }

        // Option 2: Raw shared secret — e.g. "Service <SERVICE_SECRET>"
        if (authHeader.startsWith('Service ')) {
            const providedSecret = authHeader.substring(8);
            if (!SERVICE_SECRET || providedSecret !== SERVICE_SECRET) {
                res.status(401).json({ error: 'Invalid service secret' });
                return;
            }
            next();
            return;
        }

        res.status(401).json({ error: 'Invalid authorization format' });
    } catch {
        res.status(401).json({ error: 'Service authentication failed' });
    }
}
