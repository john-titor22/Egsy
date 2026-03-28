import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm, requireRole } from '../middleware/auth.js';

const ownerOnly = requireRole('OWNER');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

const expenseSchema = z.object({
  category: z.string().min(1, 'La catégorie est requise'),
  description: z.string().min(1, 'La description est requise'),
  amount: z.number().positive('Le montant doit être positif'),
  date: z.string(),
});

const EXPENSE_CATEGORIES = [
  'Alimentation',
  'Médicaments',
  'Équipements',
  'Eau & Électricité',
  'Main d\'oeuvre',
  'Transport',
  'Vétérinaire',
  'Entretien',
  'Taxes & Licences',
  'Autre',
];

// GET /api/expenses/categories
router.get('/categories', (req, res) => {
  res.json(EXPENSE_CATEGORIES);
});

// GET /api/expenses
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, category } = req.query;
    const where = { farmId: req.user.farmId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses
router.post('/', async (req, res, next) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: {
        ...data,
        date: new Date(data.date),
        farmId: req.user.farmId,
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', ownerOnly, async (req, res, next) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (err) {
    next(err);
  }
});

export default router;
