import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const budgetSchema = z.object({
  category: z.string().min(1),
  budgetAmount: z.number().positive(),
  emoji: z.string().optional().default('📊'),
  color: z.string().optional().default('#6366F1'),
  month: z.string().optional().default('Jul 2026'),
});

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.json({ success: true, budgets: [] });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: targetUserId },
    });

    const formattedBudgets = budgets.map((b) => ({
      ...b,
      percentSpent: Math.min(100, Math.round((b.spentAmount / b.budgetAmount) * 100)),
      isOverBudget: b.spentAmount > b.budgetAmount,
    }));

    return res.json({ success: true, budgets: formattedBudgets });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const demoUser = userId ? null : await prisma.user.findFirst();
    const targetUserId = userId || demoUser?.id;

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const data = budgetSchema.parse(req.body);

    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId: targetUserId,
      },
    });

    return res.status(201).json({ success: true, budget });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const { budgetAmount, spentAmount } = req.body;

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...(budgetAmount !== undefined && { budgetAmount: Number(budgetAmount) }),
        ...(spentAmount !== undefined && { spentAmount: Number(spentAmount) }),
      },
    });

    return res.json({ success: true, budget });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.budget.delete({ where: { id } });
    return res.json({ success: true, message: 'Budget deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
