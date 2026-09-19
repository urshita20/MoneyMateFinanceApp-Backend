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

const setupSchema = z.object({
  monthlyIncome: z.number().nonnegative(),
  monthlyBudget: z.number().nonnegative(),
  savingsTarget: z.number().optional().default(0),
});

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        accountExists: true,
        message: 'An account with this email already exists. Please sign in instead.',
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        profileMode: data.profileMode,
        monthlyIncome: 0,
        monthlyBudget: 0,
        savingsTarget: 0,
        hasCompletedSetup: false,
      },
    });

    // Create main wallet account with 0 balance
    await prisma.account.create({
      data: {
        name: 'Main Wallet',
        type: 'cash',
        balance: 0,
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
        monthlyIncome: user.monthlyIncome,
        monthlyBudget: user.monthlyBudget,
        savingsTarget: user.savingsTarget,
        hasCompletedSetup: user.hasCompletedSetup,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    let user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      // Auto-create user account if missing (e.g. after serverless cold restarts)
      const hashedPassword = await bcrypt.hash(data.password, 10);
      user = await prisma.user.create({
        data: {
          name: data.email.split('@')[0] || 'User',
          email: data.email,
          password: hashedPassword,
          profileMode: 'adult',
          monthlyIncome: 0,
          monthlyBudget: 0,
          savingsTarget: 0,
          hasCompletedSetup: false,
        },
      });

      await prisma.account.create({
        data: {
          name: 'Main Wallet',
          type: 'cash',
          balance: 0,
          currency: 'INR',
          userId: user.id,
        },
      });
    } else {
      const isMatch = await bcrypt.compare(data.password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
      }
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
        monthlyIncome: user.monthlyIncome || 0,
        monthlyBudget: user.monthlyBudget || 0,
        savingsTarget: user.savingsTarget || 0,
        hasCompletedSetup: user.hasCompletedSetup || false,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
      return res.status(400).json({ success: false, message: msg || 'Validation failed' });
    }
    return res.status(400).json({ success: false, message: error.message || 'Login failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        profileMode: true,
        monthlyIncome: true,
        monthlyBudget: true,
        savingsTarget: true,
        hasCompletedSetup: true,
        accounts: true,
      },
    });

    return res.json({ success: true, user });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const setupFinancialProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const data = setupSchema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyIncome: data.monthlyIncome,
        monthlyBudget: data.monthlyBudget,
        savingsTarget: data.savingsTarget,
        hasCompletedSetup: true,
      },
    });

    return res.json({
      success: true,
      message: 'Financial profile setup completed',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        monthlyIncome: updatedUser.monthlyIncome,
        monthlyBudget: updatedUser.monthlyBudget,
        savingsTarget: updatedUser.savingsTarget,
        hasCompletedSetup: updatedUser.hasCompletedSetup,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
      return res.status(400).json({ success: false, message: msg });
    }
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
