import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

const stockItemSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  category: z.enum(['ALIMENT', 'MEDICAMENT', 'EQUIPEMENT', 'AUTRE']).default('AUTRE'),
  quantity: z.number().min(0).default(0),
  unit: z.string().min(1, 'L\'unité est requise'),
  unitPrice: z.number().min(0).default(0),
  alertThreshold: z.number().min(0).default(0),
});

const movementSchema = z.object({
  type: z.enum(['ENTREE', 'SORTIE']),
  quantity: z.number().positive('La quantité doit être positive'),
  reason: z.string().optional(),
  date: z.string().optional(),
});

// GET /api/stock
router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.stockItem.findMany({
      where: { farmId: req.user.farmId },
      orderBy: { createdAt: 'desc' },
      include: {
        movements: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/stock
router.post('/', async (req, res, next) => {
  try {
    const data = stockItemSchema.parse(req.body);
    const item = await prisma.stockItem.create({
      data: {
        ...data,
        farmId: req.user.farmId,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/stock/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.stockItem.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: {
        movements: { orderBy: { date: 'desc' } },
      },
    });
    if (!item) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PUT /api/stock/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = stockItemSchema.partial().parse(req.body);
    const existing = await prisma.stockItem.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    const item = await prisma.stockItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/stock/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.stockItem.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }
    await prisma.stockMovement.deleteMany({ where: { stockItemId: req.params.id } });
    await prisma.stockItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Article supprimé avec succès' });
  } catch (err) {
    next(err);
  }
});

// POST /api/stock/:id/movement
router.post('/:id/movement', async (req, res, next) => {
  try {
    const data = movementSchema.parse(req.body);
    const item = await prisma.stockItem.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!item) {
      return res.status(404).json({ error: 'Article non trouvé' });
    }

    if (data.type === 'SORTIE' && item.quantity < data.quantity) {
      return res.status(400).json({ error: 'Quantité insuffisante en stock' });
    }

    const newQuantity = data.type === 'ENTREE'
      ? item.quantity + data.quantity
      : item.quantity - data.quantity;

    await prisma.stockItem.update({
      where: { id: req.params.id },
      data: { quantity: newQuantity },
    });

    const movement = await prisma.stockMovement.create({
      data: {
        stockItemId: req.params.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });

    const updatedItem = await prisma.stockItem.findUnique({
      where: { id: req.params.id },
      include: { movements: { orderBy: { date: 'desc' }, take: 10 } },
    });

    res.status(201).json({ movement, item: updatedItem });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

export default router;
