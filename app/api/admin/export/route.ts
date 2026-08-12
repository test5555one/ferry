import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const fromDate = from ? new Date(from) : new Date('1970-01-01');
  const toDate = to ? new Date(to) : new Date();

  const rows = await prisma.ticket.findMany({
    where: { soldAt: { gte: fromDate, lte: toDate } },
    include: { tariff: true, payments: true },
    orderBy: { soldAt: 'desc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Verkäufe');
  sheet.columns = [
    { header: 'Ticketnummer', key: 'ticketNumber', width: 18 },
    { header: 'Tarif', key: 'tarif', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Personen', key: 'persons', width: 10 },
    { header: 'Preis Brutto', key: 'gross', width: 14 },
    { header: 'MwSt', key: 'tax', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Verkauft am', key: 'soldAt', width: 20 },
  ];

  rows.forEach(r => {
    sheet.addRow({
      ticketNumber: r.ticketNumber,
      tarif: r.tariff.name,
      name: r.purchaserName,
      email: r.purchaserEmail,
      persons: r.persons,
      gross: r.priceGross.toString(),
      tax: r.taxAmount.toString(),
      status: r.status,
      soldAt: r.soldAt.toISOString()
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="verkaeufe_${fromDate.toISOString().slice(0,10)}_${toDate.toISOString().slice(0,10)}.xlsx"`
    }
  });
}
