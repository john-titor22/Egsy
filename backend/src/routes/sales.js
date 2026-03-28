import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireFarm, requireRole } from '../middleware/auth.js';

const ownerOnly = requireRole('OWNER');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireFarm);

const saleItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});

const saleSchema = z.object({
  clientName: z.string().min(1, 'Le nom du client est requis'),
  clientPhone: z.string().optional(),
  date: z.string(),
  totalAmount: z.number().min(0),
  paymentStatus: z.enum(['PAYE', 'EN_ATTENTE', 'PARTIEL']).default('EN_ATTENTE'),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Au moins un article est requis'),
});

// GET /api/sales
router.get('/', async (req, res, next) => {
  try {
    const { startDate, endDate, paymentStatus } = req.query;
    const where = { farmId: req.user.farmId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        items: true,
        invoice: true,
      },
    });
    res.json(sales);
  } catch (err) {
    next(err);
  }
});

// POST /api/sales
router.post('/', async (req, res, next) => {
  try {
    const data = saleSchema.parse(req.body);
    const sale = await prisma.sale.create({
      data: {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        date: new Date(data.date),
        totalAmount: data.totalAmount,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
        farmId: req.user.farmId,
        items: {
          create: data.items,
        },
      },
      include: {
        items: true,
        invoice: true,
      },
    });
    res.status(201).json(sale);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// GET /api/sales/:id
router.get('/:id', async (req, res, next) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: {
        items: true,
        invoice: true,
      },
    });
    if (!sale) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sales/:id/status
router.put('/:id/status', ownerOnly, async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    if (!['PAYE', 'EN_ATTENTE', 'PARTIEL'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Statut de paiement invalide' });
    }

    const existing = await prisma.sale.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }

    const sale = await prisma.sale.update({
      where: { id: req.params.id },
      data: { paymentStatus },
      include: { items: true, invoice: true },
    });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/invoice
router.post('/:id/invoice', ownerOnly, async (req, res, next) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: { id: req.params.id, farmId: req.user.farmId },
      include: { invoice: true },
    });
    if (!sale) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }
    if (sale.invoice) {
      return res.status(400).json({ error: 'Une facture existe déjà pour cette vente' });
    }

    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const invoiceNumber = `FAC-${year}-${String(count + 1).padStart(4, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        saleId: sale.id,
        invoiceNumber,
        dueDate,
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

export default router;
