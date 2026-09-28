const TEST_JWT_SECRET = 'test-secret-key-12345';
const TEST_SERVICE_SECRET = 'test-service-shared-secret';

process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SERVICE_SECRET = TEST_SERVICE_SECRET;

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  requireRole,
  requireAdmin,
  authenticateService,
  AuthRequest,
} from '../auth.middleware';
import { UserRole } from '../../types';

describe('Rating Service - Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header is provided', () => {
      authenticate(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic 12345' };
      authenticate(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for an invalid or expired token', () => {
      mockReq.headers = { authorization: 'Bearer invalid.token.payload' };
      authenticate(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token payload is not type access or missing required fields', () => {
      const invalidPayload = {
        userId: 'u1',
        type: 'refresh', // not 'access'
        email: 'test@tumoro.org',
        role: UserRole.TALENT,
      };
      const token = jwt.sign(invalidPayload, TEST_JWT_SECRET);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token type or missing required fields',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should attach user to request and call next for a valid access token', () => {
      const validPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'talent@tumoro.org',
        role: UserRole.TALENT,
        type: 'access',
      };
      const token = jwt.sign(validPayload, TEST_JWT_SECRET);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticate(mockReq as AuthRequest, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockReq.user).toEqual({
        userId: validPayload.userId,
        email: validPayload.email,
        role: validPayload.role,
        type: 'access',
      });
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user is not set on request', () => {
      const guard = requireRole(UserRole.ADMIN);
      guard(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in the allowed list', () => {
      mockReq.user = {
        userId: 'u1',
        email: 'talent@tumoro.org',
        role: UserRole.TALENT,
        type: 'access',
      };
      const guard = requireRole(UserRole.ADMIN, UserRole.REVIEWER);
      guard(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user role is allowed', () => {
      mockReq.user = {
        userId: 'u2',
        email: 'reviewer@tumoro.org',
        role: UserRole.REVIEWER,
        type: 'access',
      };
      const guard = requireRole(UserRole.ADMIN, UserRole.REVIEWER);
      guard(mockReq as AuthRequest, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 401 if user is not attached', () => {
      requireAdmin(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', () => {
      mockReq.user = {
        userId: 'u1',
        email: 'talent@tumoro.org',
        role: UserRole.TALENT,
        type: 'access',
      };
      requireAdmin(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user is admin', () => {
      mockReq.user = {
        userId: 'admin-1',
        email: 'admin@tumoro.org',
        role: UserRole.ADMIN,
        type: 'access',
      };
      requireAdmin(mockReq as AuthRequest, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('authenticateService', () => {
    it('should return 401 if authorization header is missing', () => {
      authenticateService(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No authorization header provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate valid Service secret header ("Service <secret>")', () => {
      mockReq.headers = { authorization: `Service ${TEST_SERVICE_SECRET}` };

      authenticateService(mockReq as AuthRequest, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid Service secret', () => {
      mockReq.headers = { authorization: 'Service wrong-secret' };

      authenticateService(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid service secret' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate valid service JWT token', () => {
      const servicePayload = {
        serviceName: 'interview-service',
        type: 'service',
      };
      const token = jwt.sign(servicePayload, TEST_JWT_SECRET);
      mockReq.headers = { authorization: `Bearer ${token}` };

      authenticateService(mockReq as AuthRequest, mockRes as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid service JWT token', () => {
      const invalidToken = jwt.sign({ serviceName: 'bad-service', type: 'access' }, TEST_JWT_SECRET);
      mockReq.headers = { authorization: `Bearer ${invalidToken}` };

      authenticateService(mockReq as AuthRequest, mockRes as Response, next);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid service token' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
