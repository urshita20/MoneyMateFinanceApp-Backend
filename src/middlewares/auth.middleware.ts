import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // For demo/development fallback if token is omitted
    const demoUserId = req.headers['x-demo-user-id'] as string;
    if (demoUserId) {
      req.user = { id: demoUserId, email: 'demo@moneymate.com', role: 'user' };
      return next();
    }
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET || 'moneymate_super_secret_jwt_key_2026_finance_app';

  jwt.verify(token, secret, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};
