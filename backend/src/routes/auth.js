import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const formatUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  farmId: user.farmId,
  farmName: user.farm?.name ?? null,
  mustChangePassword: user.mustChangePassword,
});

const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  farmName: z.string().min(2, 'Le nom de la ferme doit contenir au moins 2 caractères'),
  farmLocation: z.string().min(2, 'La localisation doit contenir au moins 2 caractères'),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/register (admin only)
router.post('/register', authenticate, adminOnly, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const farm = await prisma.farm.create({
      data: { name: data.farmName, location: data.farmLocation, ownerId: 'temp' },
    });

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'OWNER',
        farmId: farm.id,
      },
      include: { farm: true },
    });

    await prisma.farm.update({ where: { id: farm.id }, data: { ownerId: user.id } });

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({ user: formatUser(user), accessToken, refreshToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { farm: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.json({ user: formatUser(user), accessToken, refreshToken });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    next(err);
  }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { farm: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    res.json({ user: formatUser(user), accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }
    next(err);
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Forced change (first login) — skip current password check
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Le mot de passe actuel est requis' });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed, mustChangePassword: false },
      include: { farm: true },
    });

    res.json({ message: 'Mot de passe mis à jour avec succès', user: formatUser(updated) });
  } catch (err) {
    next(err);
  }
});

export default router;
