import { prisma } from './prisma';
import crypto from 'crypto';

export async function nextTicketNumber() {
  const year = new Date().getUTCFullYear();
  const result: any = await prisma.$queryRawUnsafe(`SELECT nextval('fhr_ticket_seq') as val`);
  const val = result[0].val;
  return `FHR-${year}-${String(val).padStart(6, '0')}`;
}

export function calculatePrice(tariffGross: number, taxPercent: number, extras: Array<{price:number}>=[]) {
  const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
  const priceGross = Number((tariffGross + extrasTotal).toFixed(2));
  const priceNet = Number((priceGross / (1 + taxPercent / 100)).toFixed(2));
  const taxAmount = Number((priceGross - priceNet).toFixed(2));
  return { priceGross, priceNet, taxAmount };
}

export function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}
