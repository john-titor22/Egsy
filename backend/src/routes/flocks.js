import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

const flockSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  breed: z.string().min(1, 'La race est requise'),
  quantity: z.number().int().positive('La quantité doit être positive'),
  arrivalDate: z.string(),
  purpose: z.enum(['CHAIR', 'OEUF']).default('OEUF'),
  status: z.enum(['ACTIF', 'TERMINE']).default('ACTIF'),
  batchNumber: z.string().optional(),
});

// GET /api/flocks
router.get('/', async (req, res, next) => {
  try {
    const flocks = await prisma.flock.findMany({
      where: { farmId: req.user.farmId },
      orderBy: { createdAt: 'desc' },
      include: {
        productionRecords: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        _count: {
          select: { productionRecords: true },
        },
      },
    });
    res.json(flocks);
  } catch (err) {
    next(err);
  }
});

// POST /api/flocks
router.post('/', async (req, res, next) => {
  try {
    const data = flockSchema.parse(req.body);
    const flock = await prisma.flock.create({
      data: {
        ...data,
        arrivalDate: new Date(data.arrivalDate),
        farmId: req.user.farmId,
      },
    });
    res.status(201).json(flock);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/flocks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const flock = await prisma.flock.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: {
        productionRecords: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });
    if (!flock) {
      return res.status(404).json({ error: 'Troupeau non trouvé' });
    }
    res.json(flock);
  } catch (err) {
    next(err);
  }
});

// PUT /api/flocks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = flockSchema.partial().parse(req.body);
    const existing = await prisma.flock.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Troupeau non trouvé' });
    }

    const updateData = { ...data };
    if (data.arrivalDate) {
      updateData.arrivalDate = new Date(data.arrivalDate);
    }

    const flock = await prisma.flock.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(flock);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// DELETE /api/flocks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.flock.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Troupeau non trouvé' });
    }
    await prisma.productionRecord.deleteMany({ where: { flockId: req.params.id } });
    await prisma.flock.delete({ where: { id: req.params.id } });
    res.json({ message: 'Troupeau supprimé avec succès' });
  } catch (err) {
    next(err);
  }
});

export default router;
