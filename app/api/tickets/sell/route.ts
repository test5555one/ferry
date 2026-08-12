import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { nextTicketNumber, calculatePrice, generateQrToken } from '@/src/lib/ticket';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tariffCode, purchaserName, purchaserEmail, persons = 1, extras = [], paymentMethod } = body;

    const tariff = await prisma.tariff.findUnique({ where: { code: tariffCode } });
    if (!tariff) return NextResponse.json({ error: 'Tarif nicht gefunden' }, { status: 400 });

    const { priceGross, priceNet, taxAmount } = calculatePrice(Number(tariff.grossPrice), tariff.taxPercent, extras);

    const ticketNumber = await nextTicketNumber();
    const qrToken = generateQrToken();

    let totalUses = 1;
    let validFrom = new Date();
    let validUntil: Date | null = null;
    switch (tariff.code) {
      case 'DAYSAVER':
        totalUses = 999999;
        validFrom = new Date();
        validUntil = new Date();
        validUntil.setHours(23,59,59,999);
        break;
      case 'SINGLE':
        totalUses = 1;
        validUntil = null;
        break;
      case 'RETURN':
        totalUses = 2;
        break;
      case 'WEEK':
        totalUses = 999999;
        validUntil = new Date();
        validUntil.setDate(validFrom.getDate() + 7);
        break;
      case 'MONTH':
        totalUses = 999999;
        validUntil = new Date();
        validUntil.setDate(validFrom.getDate() + 30);
        break;
      case 'WORKER':
        totalUses = 999999;
        validUntil = null;
        break;
    }

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        qrToken,
        tariffId: tariff.id,
        purchaserName,
        purchaserEmail,
        persons,
        extras: extras as any,
        priceNet: priceNet as any,
        priceGross: priceGross as any,
        taxAmount: taxAmount as any,
        totalUses,
        remainingUses: totalUses,
        validFrom,
        validUntil,
      }
    });

    await prisma.payment.create({
      data: {
        ticketId: ticket.id,
        method: paymentMethod || 'CASH',
        amountNet: priceNet as any,
        amountGross: priceGross as any,
        taxAmount: taxAmount as any
      }
    });

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        qrUrl: `/ticket/${ticket.ticketNumber}`,
      }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
