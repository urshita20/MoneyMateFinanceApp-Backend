import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  participantEmails: z.array(z.string().email('Invalid participant email')),
  category: z.string().optional().default('General'),
  groupName: z.string().optional().default('Personal'),
});

export const createSharedExpense = async (req: AuthRequest, res: Response) => {
  try {
    const payerId = req.user?.id;
    const payerEmail = req.user?.email || 'user@moneymate.com';

    let payer = payerId ? await prisma.user.findUnique({ where: { id: payerId } }) : null;
    if (!payer && payerEmail) {
      payer = await prisma.user.findUnique({ where: { email: payerEmail.toLowerCase().trim() } });
    }

    if (!payer) {
      // Auto-create missing payer user record in database
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash('default_password_2026', 10);
      payer = await prisma.user.create({
        data: {
          name: payerEmail.split('@')[0] || 'User',
          email: payerEmail.toLowerCase().trim(),
          password: hashedPassword,
          profileMode: 'adult',
          monthlyIncome: 0,
          monthlyBudget: 0,
          savingsTarget: 0,
          hasCompletedSetup: false,
        },
      });
    }

    const data = createExpenseSchema.parse(req.body);

    // Normalize emails and exclude payer's own email if provided
    const rawEmails = data.participantEmails
      .map(e => e.toLowerCase().trim())
      .filter((email, index, self) => email !== '' && self.indexOf(email) === index && email !== payer!.email.toLowerCase());

    if (rawEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please enter at least one friend\'s email to split this expense with.',
      });
    }

    // Lookup or auto-create registered participant users in User collection
    const participants = [];
    const bcrypt = (await import('bcryptjs')).default;
    for (const email of rawEmails) {
      let existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('default_password_2026', 10);
        const newUser = await prisma.user.create({
          data: {
            name: email.split('@')[0] || 'Friend',
            email: email,
            password: hashedPassword,
            profileMode: 'adult',
          },
          select: { id: true, name: true, email: true },
        });
        existingUser = newUser;
      }
      participants.push(existingUser);
    }

    // Total participants = Payer + Friends
    const allParticipants = [{ id: payer.id, name: payer.name, email: payer.email }, ...participants];
    const totalPeople = allParticipants.length;

    // Equal Split Calculation with exact rounding safety
    const totalAmount = data.amount;
    const baseShare = Math.floor((totalAmount / totalPeople) * 100) / 100;
    let remainderCents = Math.round((totalAmount - baseShare * totalPeople) * 100);

    const splitsData = allParticipants.map(person => {
      let personAmount = baseShare;
      if (remainderCents > 0) {
        personAmount = Math.round((personAmount + 0.01) * 100) / 100;
        remainderCents -= 1;
      }
      return {
        userId: person.id,
        amount: personAmount,
        settled: false,
      };
    });

    // Create SharedExpense and nested Splits in database
    const expense = await prisma.sharedExpense.create({
      data: {
        description: data.description.trim(),
        amount: totalAmount,
        category: data.category || 'General',
        groupName: data.groupName || 'Personal',
        paidById: payer.id,
        settled: false,
        splits: {
          create: splitsData,
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Create notifications for participants
    for (const part of participants) {
      const splitObj = splitsData.find(s => s.userId === part.id);
      const shareAmt = splitObj ? splitObj.amount : Math.round((totalAmount / totalPeople) * 100) / 100;
      await prisma.notification.create({
        data: {
          userId: part.id,
          title: '🤝 New Shared Expense',
          message: `${payer.name || payer.email.split('@')[0]} added a shared expense: "${expense.description}" (Your share: ₹${shareAmt})`,
          type: 'shared_expense',
        },
      }).catch(err => console.warn('Could not create notification:', err));
    }

    return res.status(201).json({
      success: true,
      message: 'Shared expense created successfully.',
      expense,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || 'Invalid expense data',
      });
    }
    console.error('Error creating shared expense:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMySharedExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase().trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const expenses = await prisma.sharedExpense.findMany({
      where: {
        OR: [
          { paidById: userId },
          ...(userEmail ? [{ paidBy: { email: userEmail } }] : []),
          { splits: { some: { userId } } },
          ...(userEmail ? [{ splits: { some: { user: { email: userEmail } } } }] : []),
        ],
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Summary calculations
    let totalYouOwe = 0;
    let totalOwedToYou = 0;
    const netContactMap: Record<string, { contactId: string; name: string; email: string; netAmount: number }> = {};

    expenses.forEach(exp => {
      const payerEmail = exp.paidBy?.email?.toLowerCase().trim();
      const isPayer = exp.paidById === userId || (userEmail && payerEmail === userEmail);

      exp.splits.forEach(split => {
        if (split.settled || exp.settled) return;

        const splitUserEmail = split.user?.email?.toLowerCase().trim();
        const isSplitUserMe = split.userId === userId || (userEmail && splitUserEmail === userEmail);

        if (isPayer && !isSplitUserMe) {
          // Others owe the payer
          totalOwedToYou += split.amount;

          const contactKey = split.userId;
          if (!netContactMap[contactKey]) {
            netContactMap[contactKey] = {
              contactId: split.userId,
              name: split.user.name,
              email: split.user.email,
              netAmount: 0,
            };
          }
          netContactMap[contactKey].netAmount += split.amount;
        } else if (!isPayer && isSplitUserMe) {
          // User owes the payer
          totalYouOwe += split.amount;

          const contactKey = exp.paidById;
          if (!netContactMap[contactKey]) {
            netContactMap[contactKey] = {
              contactId: exp.paidById,
              name: exp.paidBy.name,
              email: exp.paidBy.email,
              netAmount: 0,
            };
          }
          netContactMap[contactKey].netAmount -= split.amount;
        }
      });
    });

    const netBalances = Object.values(netContactMap);

    return res.json({
      success: true,
      expenses,
      summary: {
        totalYouOwe: Math.round(totalYouOwe * 100) / 100,
        totalOwedToYou: Math.round(totalOwedToYou * 100) / 100,
        netBalances,
      },
    });
  } catch (error) {
    console.error('Error fetching shared expenses:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const settleSharedExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase().trim();
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const expense = await prisma.sharedExpense.findUnique({
      where: { id },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Shared expense not found' });
    }

    const isParticipant =
      expense.paidById === userId ||
      (userEmail && expense.paidBy.email.toLowerCase().trim() === userEmail) ||
      expense.splits.some((s: any) => s.userId === userId || (userEmail && s.user.email.toLowerCase().trim() === userEmail));

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Mark expense and all splits as settled
    const updatedExpense = await prisma.sharedExpense.update({
      where: { id },
      data: {
        settled: true,
        settledAt: new Date(),
        splits: {
          updateMany: {
            where: { sharedExpenseId: id },
            data: { settled: true, settledAt: new Date() },
          },
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Notify all participants about settlement
    const settlerName = userEmail ? userEmail.split('@')[0] : 'Friend';
    const targetUserIds = [expense.paidById, ...expense.splits.map((s: any) => s.userId)].filter(
      (uid, idx, self) => uid !== userId && self.indexOf(uid) === idx
    );

    for (const targetId of targetUserIds) {
      await prisma.notification.create({
        data: {
          userId: targetId,
          title: '✅ Shared Expense Settled',
          message: `${settlerName} settled the shared expense: "${expense.description}"`,
          type: 'settlement',
        },
      }).catch(err => console.warn('Could not create settlement notification:', err));
    }

    return res.json({
      success: true,
      message: 'Expense marked as settled.',
      expense: updatedExpense,
    });
  } catch (error) {
    console.error('Error settling shared expense:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
