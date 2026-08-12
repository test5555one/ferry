import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';

export async function POST(req: Request) {
  const { qrToken, scannerUserId } = await req.json();
  if (!qrToken) return NextResponse.json({ error: 'No token' }, { status: 400 });

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.findUnique({ where: { qrToken } , include: { tariff: true }});
    if (!t) return null;

    if (t.status !== 'SOLD') return { ticket: t, status: 'INVALID_STATUS' };

    const now = new Date();
    if (t.validUntil && t.validUntil < now) return { ticket: t, status: 'EXPIRED' };

    if (t.remainingUses <= 0) return { ticket: t, status: 'USED_OUT' };

    const updated = await tx.ticket.update({
      where: { id: t.id },
      data: { remainingUses: t.remainingUses - 1 },
    });
    await tx.ticketUse.create({
      data: { ticketId: t.id, usedById: scannerUserId || null }
    });

    if (updated.remainingUses - 1 <= 0) {
      await tx.ticket.update({ where: { id: t.id }, data: { status: 'USED_OUT' } });
    }

    return { ticket: updated, status: 'OK' };
  });

  if (!ticket) return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
  return NextResponse.json(ticket);
}
