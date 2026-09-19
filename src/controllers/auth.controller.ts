import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  profileMode: z.enum(['adult', 'junior']).optional().default('adult'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        profileMode: data.profileMode,
      },
    });

    // Create default cash account for user
    await prisma.account.create({
      data: {
        name: 'Main Wallet',
        type: 'cash',
        balance: 1000,
        currency: 'INR',
        userId: user.id,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'moneymate_super_secret_jwt_key_2026_finance_app',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileMode: user.profileMode,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'moneymate_super_secret_jwt_key_2026_finance_app',
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileMode: user.profileMode,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Login failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Fallback demo user
      const demoUser = await prisma.user.findFirst();
      return res.json({ success: true, user: demoUser });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        profileMode: true,
        accounts: true,
      },
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const switchProfileMode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { mode } = req.body; // 'adult' | 'junior'

    if (!['adult', 'junior'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profileMode: mode },
    });

    return res.json({
      success: true,
      message: `Profile switched to ${mode} mode`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        profileMode: updatedUser.profileMode,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
