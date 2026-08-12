import { prisma } from '@/src/lib/prisma';
import { qrDataUrl } from '@/src/lib/qr';

export default async function PrintTicket({ params }: { params: { ticketNumber: string }}) {
  const ticket = await prisma.ticket.findUnique({ where: { ticketNumber: params.ticketNumber }, include: { tariff: true, payments: true } });
  if (!ticket) return <div>Ticket nicht gefunden</div>;
  const qrUrl = `/ticket/${ticket.ticketNumber}`;
  const qr = await qrDataUrl(`${process.env.NEXT_PUBLIC_BASE_URL}${qrUrl}`);

  return (
    <html>
      <head>
        <style>{`@media print { @page { size: A4; margin: 20mm } } .container { font-family: sans-serif }`}</style>
      </head>
      <body>
        <div className="container" style={{maxWidth:800, margin:'0 auto', padding:20}}>
          <header style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
              <img src="/logo.png" alt="Föhr-Reederei" style={{height:60}} />
              <div>Föhr-Reederei GmbH<br/>Hauptstraße 1, 12345 Hafenstadt</div>
            </div>
            <div style={{textAlign:'right'}}>
              <h2>Ticket</h2>
              <div>Ticketnummer: {ticket.ticketNumber}</div>
              <div>Verkauft: {ticket.soldAt.toISOString()}</div>
            </div>
          </header>

          <main style={{marginTop:20, display:'flex', gap:20}}>
            <div style={{flex:1}}>
              <h3>{ticket.tariff.name}</h3>
              <p>Personen: {ticket.persons}</p>
              <p>Zusatz: {JSON.stringify(ticket.extras)}</p>
              <p>Netto: {ticket.priceNet.toString()} €</p>
              <p>MwSt: {ticket.taxAmount.toString()} €</p>
              <p>Brutto: {ticket.priceGross.toString()} €</p>
              <p>Zahlungsart: {ticket.payments?.[0]?.method || '—'}</p>
            </div>
            <div style={{width:260, textAlign:'center'}}>
              <img src={qr} alt="QR" style={{width:220}} />
              <p>Scannen Sie diesen QR-Code, um das Ticket in Apple Wallet oder Google Wallet zu speichern.</p>
            </div>
          </main>

          <footer style={{marginTop:40}}>
            <small>Firmenname: Föhr-Reederei GmbH — Steuernummer: DE123456789</small>
          </footer>
        </div>
        <script>window.print();</script>
      </body>
    </html>
  );
}
