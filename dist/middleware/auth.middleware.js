"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.requireAdmin = requireAdmin;
exports.authenticateService = authenticateService;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
const JWT_SECRET = process.env.JWT_SECRET;
const SERVICE_SECRET = process.env.SERVICE_SECRET;
// ─── User JWT Authentication ───────────────────────────────────────────────
/**
 * Verifies the Bearer JWT token issued by the auth service.
 * Attaches the decoded payload to req.user on success.
 */
function authenticate(req, res, next) {
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
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
    }
    catch (_a) {
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
function requireRole(...roles) {
    return (req, res, next) => {
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
function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (req.user.role !== types_1.UserRole.ADMIN) {
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
function authenticateService(req, res, next) {
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
            const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
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
    }
    catch (_a) {
        res.status(401).json({ error: 'Service authentication failed' });
    }
}
