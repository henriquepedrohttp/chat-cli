import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth';

const prisma = new PrismaClient();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, nickname, partnerEmail } = req.body;

    if (!email || !password || !nickname) {
      res.status(400).json({ error: 'Email, password and nickname are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let partnerId: string | null = null;
    if (partnerEmail) {
      const partner = await prisma.user.findUnique({ where: { email: partnerEmail } });
      if (partner) {
        partnerId = partner.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        nickname,
        partnerId
      }
    });

    if (partnerId) {
      await prisma.user.update({
        where: { id: partnerId },
        data: { partnerId: user.id }
      });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        partnerId: user.partnerId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    res.json({ message: 'Logged out and messages deleted' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPartner(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true }
    });

    if (!user || !user.partner) {
      res.status(404).json({ error: 'No partner found' });
      return;
    }

    res.json({
      id: user.partner.id,
      email: user.partner.email,
      nickname: user.partner.nickname
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function connectPartner(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { partnerEmail } = req.body;

    if (!partnerEmail) {
      res.status(400).json({ error: 'Partner email is required' });
      return;
    }

    const partner = await prisma.user.findUnique({ where: { email: partnerEmail } });
    if (!partner) {
      res.status(404).json({ error: 'Partner not found' });
      return;
    }

    if (partner.id === userId) {
      res.status(400).json({ error: 'Cannot connect to yourself' });
      return;
    }

    if (partner.partnerId === userId) {
      res.status(400).json({ error: 'Partner already connected to you' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { partnerId: partner.id }
    });

    await prisma.user.update({
      where: { id: partner.id },
      data: { partnerId: userId }
    });

    res.json({ message: 'Partner connected successfully' });
  } catch (error) {
    console.error('Connect partner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}