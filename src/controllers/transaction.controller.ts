import { Response } from 'express';
import { z } from 'zod';
import createWorker from 'tesseract.js';
import { prisma } from '../prisma.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

const transactionSchema = z.object({
  merchant: z.string().min(1),
  amount: z.number(),
  category: z.string().min(1),
  date: z.string().optional().default(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
  emoji: z.string().optional().default('💸'),
  type: z.enum(['income', 'expense', 'transfer']).optional().default('expense'),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptImage: z.string().optional(),
  note: z.string().optional(),
  accountId: z.string().optional(),
});

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.json({ success: true, count: 0, transactions: [] });
    }

    const { category, search, type } = req.query;
    const where: any = { userId };
    if (category) where.category = String(category);
    if (type) where.type = String(type);
    if (search) {
      where.OR = [
        { merchant: { contains: String(search) } },
        { category: { contains: String(search) } },
        { description: { contains: String(search) } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const data = transactionSchema.parse(req.body);

    // Duplicate transaction check
    const existing = await prisma.transaction.findFirst({
      where: {
        userId,
        merchant: data.merchant,
        amount: data.amount,
        date: data.date,
      },
    });

    const isDuplicate = Boolean(existing);

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId,
      },
    });

    // Update user budget spentAmount if expense
    if (data.type === 'expense') {
      const budget = await prisma.budget.findFirst({
        where: { userId, category: data.category },
      });
      if (budget) {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { spentAmount: budget.spentAmount + data.amount },
        });
      }
    }

    return res.status(201).json({ success: true, transaction, isPossibleDuplicate: isDuplicate });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx || tx.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    await prisma.transaction.delete({ where: { id } });

    // Deduct from budget spentAmount if expense
    if (tx.type === 'expense') {
      const budget = await prisma.budget.findFirst({
        where: { userId, category: tx.category },
      });
      if (budget) {
        const newSpent = Math.max(0, budget.spentAmount - tx.amount);
        await prisma.budget.update({
          where: { id: budget.id },
          data: { spentAmount: newSpent },
        });
      }
    }

    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper for category inference
function inferCategory(text: string): { category: string; emoji: string } {
  const lower = text.toLowerCase();
  if (/starbucks|mcdonald|domino|swiggy|zomato|restaurant|cafe|food|dining|pizza|burger|bistro|kitchen|bakery|coffee|tea|dine/i.test(lower)) {
    return { category: 'Food & Dining', emoji: '🍕' };
  }
  if (/grocery|supermarket|bazaar|mart|d-mart|blinkit|zepto|instamart|vegetable|fruit|dairy|store/i.test(lower)) {
    return { category: 'Groceries', emoji: '🛒' };
  }
  if (/uber|ola|rapido|petrol|fuel|shell|bpcl|hpcl|metro|transit|cab|parking|toll|auto|travel/i.test(lower)) {
    return { category: 'Transport', emoji: '🚗' };
  }
  if (/amazon|flipkart|myntra|zara|uniqlo|h&m|decathlon|mall|fashion|apparel|clothes|shoes|retail/i.test(lower)) {
    return { category: 'Shopping', emoji: '🛍️' };
  }
  if (/pharmacy|apollo|medplus|hospital|clinic|doctor|lab|pathology|medicine|health|pharma/i.test(lower)) {
    return { category: 'Health', emoji: '💊' };
  }
  if (/bescom|power|electricity|water|gas|wifi|broadband|airtel|jio|bill|recharge/i.test(lower)) {
    return { category: 'Utilities', emoji: '⚡' };
  }
  if (/netflix|cinema|movie|pvr|inox|spotify|game|entertainment|play/i.test(lower)) {
    return { category: 'Entertainment', emoji: '🎬' };
  }
  return { category: 'Other', emoji: '💸' };
}

// Helper for extracting total amount
function extractAmount(lines: string[]): number | null {
  const fullText = lines.join('\n');
  
  // Search for lines containing Total / Amount / RS / INR / Net Amount
  const totalRegexes = [
    /(?:grand\s+total|total\s+amount|net\s+amount|total\s+due|amount\s+paid|total|bal|paid)\s*[:=₹Rs\.\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const regex of totalRegexes) {
    const match = fullText.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        return parsed;
      }
    }
  }

  // Fallback: Find largest number on lines containing numbers
  let maxAmount = 0;
  for (const line of lines) {
    const numbers = line.match(/\b\d+(?:\.\d{1,2})?\b/g);
    if (numbers) {
      for (const numStr of numbers) {
        const val = parseFloat(numStr);
        // Exclude dates like 2026, zip codes, GST numbers
        if (val > maxAmount && val < 500000 && !/20[2-3][0-9]/.test(numStr)) {
          maxAmount = val;
        }
      }
    }
  }

  return maxAmount > 0 ? maxAmount : null;
}

// Helper for extracting date
function extractDate(fullText: string): string {
  const dateRegex = /\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b|\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i;
  const match = fullText.match(dateRegex);
  if (match) {
    return match[0];
  }
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper for payment method
function extractPaymentMethod(fullText: string): string {
  if (/upi|gpay|phonepe|paytm/i.test(fullText)) return 'UPI';
  if (/credit\s*card|visa|mastercard|amex/i.test(fullText)) return 'Credit Card';
  if (/debit\s*card/i.test(fullText)) return 'Debit Card';
  if (/cash/i.test(fullText)) return 'Cash';
  if (/net\s*banking/i.test(fullText)) return 'Net Banking';
  return 'Card/UPI';
}

export const ocrScanReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image provided for OCR scanning' });
    }

    // Convert base64 data to buffer if data URL header present
    let imageBuffer: Buffer;
    if (imageBase64.includes('base64,')) {
      const base64Data = imageBase64.split('base64,')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      imageBuffer = Buffer.from(imageBase64, 'base64');
    }

    // Run real Tesseract OCR on the buffer
    const worker = await createWorker.createWorker('eng');
    const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract Merchant Name (first prominent non-noise line)
    let merchant = 'Unknown Merchant';
    const ignoreKeywords = /receipt|tax|invoice|bill|welcome|customer|copy|cashier|date|time|total|gst/i;
    for (const line of lines.slice(0, 5)) {
      if (line.length >= 3 && !ignoreKeywords.test(line)) {
        merchant = line;
        break;
      }
    }

    const amount = extractAmount(lines);
    const date = extractDate(text);
    const { category, emoji } = inferCategory(text);
    const paymentMethod = extractPaymentMethod(text);

    // Check if user already has a matching transaction
    const userId = req.user?.id;
    let isPossibleDuplicate = false;
    if (userId && amount) {
      const match = await prisma.transaction.findFirst({
        where: {
          userId,
          merchant,
          amount,
        },
      });
      if (match) isPossibleDuplicate = true;
    }

    return res.json({
      success: true,
      confidence: Math.round(confidence || 85),
      rawText: text,
      extractedData: {
        merchant,
        amount: amount || 0,
        date,
        category,
        emoji,
        paymentMethod,
        description: `Receipt scanned via MoneyMate OCR (${merchant})`,
        isPossibleDuplicate,
      },
    });
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process receipt image. Please enter details manually.',
      error: error.message,
    });
  }
};
