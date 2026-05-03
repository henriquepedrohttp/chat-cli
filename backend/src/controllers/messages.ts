import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        iv: true,
        createdAt: true
      }
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { content, iv, receiverId } = req.body;

    if (!content || !iv) {
      res.status(400).json({ error: 'Content and iv are required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true }
    });

    if (!user || !user.partner) {
      res.status(400).json({ error: 'No partner connected' });
      return;
    }

    const targetReceiverId = receiverId || user.partnerId;

    if (targetReceiverId !== user.partnerId) {
      res.status(400).json({ error: 'Can only send to your partner' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: targetReceiverId,
        content,
        iv
      }
    });

    res.status(201).json({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      iv: message.iv,
      createdAt: message.createdAt
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function syncMessages(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).userId;
    const lastId = req.query.last_id as string;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.partnerId) {
      res.status(400).json({ error: 'No partner connected' });
      return;
    }

    let messages;
    if (lastId) {
      const lastMessage = await prisma.message.findUnique({ where: { id: lastId } });
      if (lastMessage) {
        messages = await prisma.message.findMany({
          where: {
            id: { gt: lastId },
            OR: [
              { senderId: userId },
              { receiverId: userId },
              { senderId: user.partnerId },
              { receiverId: user.partnerId }
            ]
          },
          orderBy: { createdAt: 'asc' }
        });
      } else {
        messages = [];
      }
    } else {
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    res.json({ messages });
  } catch (error) {
    console.error('Sync messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}