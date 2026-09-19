import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  savedAmount: z.number().optional().default(0),
  emoji: z.string().optional().default('🎯'),
  color: z.string().optional().default('emerald'),
  deadline: z.string().min(1),
  aiDate: z.string().optional(),
});

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, goals: [] });
    }

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedGoals = goals.map((g) => ({
      ...g,
      progressPercent: Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)),
      remaining: Math.max(0, g.targetAmount - g.savedAmount),
    }));

    return res.json({ success: true, goals: formattedGoals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const data = goalSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        ...data,
        userId,
      },
    });

    return res.status(201).json({ success: true, goal });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateGoalProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);
    const { depositAmount } = req.body;

    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        savedAmount: goal.savedAmount + Number(depositAmount),
      },
    });

    return res.json({ success: true, goal: updatedGoal });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    const goal = await prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id } });
    return res.json({ success: true, message: 'Goal deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
