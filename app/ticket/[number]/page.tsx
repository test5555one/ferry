"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Ticket = {
  number: string; tariffName: string; createdAt: string; validUntil: string;
  people: number; child: number; toddler: number;
  extras: { name: string; qty: number; price: number }[];
  gross: number; uses: number; maxUses: number | null; status: string;
  personalized: boolean; employeeName?: string;
};

const STORAGE = "foehr-demo-tickets-v1";
const euro = (n:number) => n.toLocaleString("de-DE",{style:"currency",currency:"EUR"});
const dateDE = (s:string) => new Date(s).toLocaleDateString("de-DE");

export default function TicketPage({ params }: { params: Promise<{ number: string }> }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    params.then(({number}) => {
      const raw = localStorage.getItem(STORAGE);
      const all: Ticket[] = raw ? JSON.parse(raw) : [];
      const found = all.find(t => t.number === decodeURIComponent(number));
      setTicket(found || null);
      if (found) QRCode.toDataURL(window.location.href, {width: 320, margin: 1}).then(setQr);
    });
  }, [params]);

  if (!ticket) return <main className="grid min-h-screen place-items-center bg-slate-100 p-6"><div className="rounded-2xl bg-white p-8 text-center shadow"><div className="text-5xl">🎫</div><h1 className="mt-3 text-2xl font-extrabold">Ticket nicht gefunden</h1><p className="mt-2 text-slate-500">Dieses Demo-Ticket ist auf diesem Browser nicht gespeichert.</p></div></main>;

  const remaining = ticket.maxUses === null ? "Unbegrenzt" : Math.max(0, ticket.maxUses-ticket.uses);

  function wallet(kind:string) {
    alert(`${kind}: Demo-Modus. Für einen echten Wallet-Pass müssen Apple-Pass-Zertifikat bzw. Google-Wallet-Issuer eingerichtet werden.`);
  }

  return <main className="min-h-screen bg-[#eef6fb] p-4 md:p-8">
    <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="bg-[#063b5c] p-6 text-white">
        <div className="text-sm opacity-80">FÖHR-REEDEREI · E-TICKET</div>
        <div className="mt-2 text-2xl font-black">{ticket.tariffName}</div>
        <div className="mt-1">Wyk auf Föhr ↔ Dagebüll</div>
      </div>
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_190px]">
          <div className="space-y-3">
            <div><div className="text-xs uppercase text-slate-400">Ticketnummer</div><div className="text-xl font-extrabold">{ticket.number}</div></div>
            <div className="grid grid-cols-2 gap-3"><div><div className="text-xs text-slate-400">Gültig bis</div><b>{dateDE(ticket.validUntil)}</b></div><div><div className="text-xs text-slate-400">Status</div><b>{ticket.status}</b></div></div>
            <div><div className="text-xs text-slate-400">Fahrgäste</div><b>Erwachsene {ticket.people} · Kinder {ticket.child} · Kleinkinder {ticket.toddler}</b></div>
            <div><div className="text-xs text-slate-400">Nutzungen</div><b>{ticket.maxUses === null ? `${ticket.uses} genutzt · unbegrenzt` : `${ticket.uses} genutzt · ${remaining} verbleibend`}</b></div>
            {ticket.personalized && <div><div className="text-xs text-slate-400">Mitarbeiterausweis</div><b>{ticket.employeeName}</b></div>}
          </div>
          <div className="rounded-2xl border-2 border-sky-200 p-3 text-center"><img src={qr} alt="Ticket QR-Code" className="mx-auto"/><div className="text-xs font-bold">{ticket.number}</div></div>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4"><div className="font-bold">Zusatzleistungen</div><div className="mt-1 text-sm text-slate-600">{ticket.extras.length ? ticket.extras.map(e=>`${e.name} × ${e.qty}`).join(", ") : "Keine"}</div><div className="mt-3 text-xl font-black">{euro(ticket.gross)}</div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button onClick={()=>wallet("Apple Wallet")} className="rounded-xl bg-black px-4 py-3 font-bold text-white"> Zu Apple Wallet hinzufügen</button>
          <button onClick={()=>wallet("Google Wallet")} className="rounded-xl bg-[#063b5c] px-4 py-3 font-bold text-white">▣ Zu Google Wallet hinzufügen</button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Demo-Wallet. Im Produktivbetrieb wird hier ein signierter Apple- bzw. Google-Wallet-Pass ausgegeben.</p>
      </div>
    </div>
  </main>;
}
