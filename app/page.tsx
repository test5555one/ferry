"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { BrowserMultiFormatReader } from "@zxing/browser";

type TariffKey = "daysaver" | "single" | "return" | "week" | "month" | "worker";
type Payment = "Karte" | "Barzahlung";
type TicketStatus = "Gültig" | "Abgelaufen" | "Gesperrt" | "Storniert";

type Ticket = {
  id: string;
  number: string;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  tariff: TariffKey;
  tariffName: string;
  people: number;
  child: number;
  toddler: number;
  extras: { name: string; qty: number; price: number }[];
  net: number;
  vat: number;
  gross: number;
  payment: Payment;
  uses: number;
  maxUses: number | null;
  status: TicketStatus;
  personalized: boolean;
  employeeName?: string;
};

const TARIFFS: Record<TariffKey, { name: string; price: number }> = {
  daysaver: { name: "DaySaver", price: 19.90 },
  single: { name: "Einzelfahrt", price: 9.90 },
  return: { name: "Hin- und Rückfahrt", price: 17.90 },
  week: { name: "Wochenkarte", price: 49.90 },
  month: { name: "Monatskarte", price: 149.90 },
  worker: { name: "Arbeiter", price: 0 }
};

const EXTRAS = [
  ["Kurtaxe Erwachsener", 3.50],
  ["Kurtaxe Kind", 1.50],
  ["Fahrrad", 4.90],
  ["E-Bike", 5.90],
  ["Hund", 2.90],
  ["Motorrad", 9.90],
  ["PKW", 19.90],
  ["Wohnmobil", 39.90],
  ["Anhänger", 14.90]
] as const;

const STORAGE = "foehr-demo-tickets-v1";
const YEAR = new Date().getFullYear();

function euro(n: number) {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}
function dateDE(s: string) {
  return new Date(s).toLocaleDateString("de-DE");
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function ticketLimit(tariff: TariffKey) {
  if (tariff === "single") return 1;
  if (tariff === "return") return 2;
  return null;
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [view, setView] = useState<"kasse" | "tickets" | "scanner" | "reports">("kasse");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [tariff, setTariff] = useState<TariffKey>("single");
  const [people, setPeople] = useState(1);
  const [child, setChild] = useState(0);
  const [toddler, setToddler] = useState(0);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<Payment>("Karte");
  const [employeeName, setEmployeeName] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scannerOn, setScannerOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (raw) setTickets(JSON.parse(raw));
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(tickets));
  }, [tickets]);

  const cart = useMemo(() => {
    const base = TARIFFS[tariff].price * (tariff === "worker" ? 1 : people);
    const extraRows = EXTRAS.map(([name, price]) => ({
      name, price, qty: extras[name] || 0
    })).filter(x => x.qty > 0);
    const gross = base + extraRows.reduce((s, x) => s + x.price * x.qty, 0);
    const net = gross / 1.19;
    return { base, extraRows, gross, net, vat: gross - net };
  }, [tariff, people, extras]);

  const stats = useMemo(() => {
    const today = todayKey();
    const todayTickets = tickets.filter(t => t.createdAt.slice(0, 10) === today);
    const month = new Date().toISOString().slice(0, 7);
    const monthTickets = tickets.filter(t => t.createdAt.slice(0, 7) === month);
    return {
      todayTickets,
      todayRevenue: todayTickets.reduce((s, t) => s + t.gross, 0),
      monthRevenue: monthTickets.reduce((s, t) => s + t.gross, 0),
      open: tickets.filter(t => t.status === "Gültig").length,
      monthCards: tickets.filter(t => t.tariff === "month" && t.status === "Gültig").length,
      weekCards: tickets.filter(t => t.tariff === "week" && t.status === "Gültig").length
    };
  }, [tickets]);

  function nextNumber() {
    const max = tickets.reduce((m, t) => {
      const n = Number(t.number.split("-").pop());
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    return `FHR-${YEAR}-${String(max + 1).padStart(6, "0")}`;
  }

  async function createTicket() {
    if (tariff === "worker" && !employeeName.trim()) {
      setMessage("Bitte für die personalisierte Arbeiterkarte einen Namen eintragen.");
      return;
    }
    const now = new Date();
    const until = tariff === "daysaver" ? addDays(now, 1) :
      tariff === "week" ? addDays(now, 7) :
      tariff === "month" ? addDays(now, 30) : addDays(now, 1);

    const ticket: Ticket = {
      id: crypto.randomUUID(),
      number: nextNumber(),
      createdAt: now.toISOString(),
      validFrom: now.toISOString(),
      validUntil: until.toISOString(),
      tariff,
      tariffName: TARIFFS[tariff].name,
      people, child, toddler,
      extras: cart.extraRows,
      net: cart.net,
      vat: cart.vat,
      gross: cart.gross,
      payment,
      uses: 0,
      maxUses: ticketLimit(tariff),
      status: "Gültig",
      personalized: tariff === "worker",
      employeeName: tariff === "worker" ? employeeName.trim() : undefined
    };
    setTickets(prev => [ticket, ...prev]);
    setSelected(ticket);
    setView("tickets");
    setMessage(`Ticket ${ticket.number} wurde erstellt.`);
  }

  function useTicket(ticket: Ticket) {
    const now = new Date();
    if (ticket.status !== "Gültig") return { ok: false, text: ticket.status };
    if (now > new Date(ticket.validUntil)) {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "Abgelaufen" } : t));
      return { ok: false, text: "Abgelaufen" };
    }
    if (ticket.maxUses !== null && ticket.uses >= ticket.maxUses) {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: "Abgelaufen" } : t));
      return { ok: false, text: "Bereits vollständig verwendet" };
    }
    setTickets(prev => prev.map(t => {
      if (t.id !== ticket.id) return t;
      const uses = t.uses + 1;
      return { ...t, uses, status: t.maxUses !== null && uses >= t.maxUses ? "Abgelaufen" : "Gültig" };
    }));
    return { ok: true, text: "Gültiges Ticket – Nutzung registriert" };
  }

  function findTicket(value: string) {
    const v = value.trim();
    return tickets.find(t => t.number === v || t.id === v || v.endsWith(t.number)) || null;
  }

  async function scan(value: string) {
    const t = findTicket(value);
    if (!t) {
      setMessage("ROT – Ticket nicht gefunden.");
      setSelected(null);
      return;
    }
    setSelected(t);
    const result = useTicket(t);
    setMessage((result.ok ? "GRÜN – " : "ROT – ") + result.text);
  }

  async function startScanner() {
    setScannerOn(true);
    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) {
          scan(result.getText());
          controlsRef.current?.stop?.();
          setScannerOn(false);
        }
      });
    } catch {
      setMessage("Kamera konnte nicht gestartet werden. Nutze alternativ die manuelle Ticketnummer.");
      setScannerOn(false);
    }
  }

  function stopScanner() {
    controlsRef.current?.stop?.();
    setScannerOn(false);
  }

  async function makeQR(ticket: Ticket) {
    return QRCode.toDataURL(`${window.location.origin}/ticket/${ticket.number}`, {
      width: 360, margin: 1
    });
  }

  async function printTicket(ticket: Ticket) {
    const qr = await makeQR(ticket);
    const extrasText = ticket.extras.length ? ticket.extras.map(e => `${e.name} × ${e.qty}`).join(", ") : "Keine";
    const html = `
      <html><head><title>${ticket.number}</title><style>
      @page{size:A4;margin:16mm}body{font-family:Arial;color:#10283a}.head{display:flex;justify-content:space-between;border-bottom:2px solid #123c5a;padding-bottom:14px}
      .logo{font-size:25px;font-weight:800;color:#075985}.box{border:1px solid #d6e0e7;border-radius:14px;padding:18px;margin-top:18px}
      .row{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:7px 0}.total{font-size:21px;font-weight:800}.qr{text-align:center;margin-top:20px}.qr img{width:180px}
      </style></head><body>
      <div class="head"><div class="logo">⚓ FÖHR-REEDEREI</div><div>${dateDE(ticket.createdAt)}</div></div>
      <h1>Fährticket</h1>
      <div class="box"><div class="row"><b>Ticketnummer</b><span>${ticket.number}</span></div>
      <div class="row"><b>Strecke</b><span>Wyk auf Föhr ↔ Dagebüll</span></div>
      <div class="row"><b>Tarif</b><span>${ticket.tariffName}</span></div>
      <div class="row"><b>Personen</b><span>Erwachsene ${ticket.people}, Kinder ${ticket.child}, Kleinkinder ${ticket.toddler}</span></div>
      <div class="row"><b>Zusatzleistungen</b><span>${extrasText}</span></div>
      ${ticket.personalized ? `<div class="row"><b>Personalisierung</b><span>${ticket.employeeName}</span></div>` : ""}
      <div class="row"><b>Zahlungsart</b><span>${ticket.payment}</span></div>
      <div class="row"><b>Nettobetrag</b><span>${euro(ticket.net)}</span></div>
      <div class="row"><b>MwSt. 19 %</b><span>${euro(ticket.vat)}</span></div>
      <div class="row total"><b>Gesamtbetrag</b><span>${euro(ticket.gross)}</span></div></div>
      <div class="qr"><img src="${qr}"/><p><b>${ticket.number}</b></p><p>Scannen Sie diesen QR-Code, um das Ticket in Apple Wallet oder Google Wallet zu speichern.</p></div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { setMessage("Popup wurde blockiert. Bitte Popups erlauben."); return; }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  function downloadCSV() {
    const rows = tickets.filter(t => t.createdAt.slice(0,10) === todayKey());
    const header = ["Ticketnummer","Datum","Tarif","Personen","Zusatzleistungen","Zahlungsart","Netto","MwSt","Brutto","Nutzungen","Status"];
    const data = rows.map(t => [t.number,t.createdAt,t.tariffName,t.people,t.extras.map(e=>`${e.name} x${e.qty}`).join(" | "),t.payment,t.net.toFixed(2),t.vat.toFixed(2),t.gross.toFixed(2),t.uses,t.status]);
    const csv = [header,...data].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `tagesbericht-${todayKey()}.csv`; a.click();
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(tickets, null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "foehr-demo-daten.json"; a.click();
  }

  function addDemo() {
    const fake: Ticket = {
      id: crypto.randomUUID(), number: nextNumber(), createdAt: new Date().toISOString(),
      validFrom: new Date().toISOString(), validUntil: addDays(new Date(), 7).toISOString(),
      tariff:"return", tariffName:"Hin- und Rückfahrt", people:2, child:0, toddler:0,
      extras:[{name:"Fahrrad",qty:1,price:4.9}], net:30.08, vat:5.72, gross:35.80,
      payment:"Karte", uses:0, maxUses:2, status:"Gültig", personalized:false
    };
    setTickets(p => [fake,...p]);
    setMessage("Beispielbuchung hinzugefügt.");
  }

  const remaining = selected?.maxUses === null ? "Unbegrenzt" : Math.max(0, (selected?.maxUses ?? 0) - (selected?.uses ?? 0));

  return (
    <main className="min-h-screen">
      <header className="no-print sticky top-0 z-20 bg-[#063b5c] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => setView("kasse")} className="flex items-center gap-3 text-left">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-2xl text-[#063b5c]">⚓</div>
            <div><div className="text-lg font-extrabold">FÖHR-REEDEREI</div><div className="text-xs opacity-80">Kasse · Tickets · Scanner</div></div>
          </button>
          <div className="flex flex-wrap gap-2">
            {([["kasse","Kasse"],["tickets","Tickets"],["scanner","Scanner"],["reports","Berichte"]] as const).map(([id,label]) =>
              <button key={id} onClick={() => setView(id)} className={`rounded-lg px-3 py-2 text-sm font-bold ${view===id ? "bg-white text-[#063b5c]" : "bg-white/10 hover:bg-white/20"}`}>{label}</button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {message && <div className="no-print mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">{message}</div>}

        {view === "kasse" && (
          <div className="grid gap-5 lg:grid-cols-[1.5fr_.8fr]">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-end justify-between"><div><h1 className="text-2xl font-extrabold">Ticketverkauf</h1><p className="text-sm text-slate-500">Demo-Modus ohne Anmeldung</p></div><button onClick={addDemo} className="rounded-lg border px-3 py-2 text-sm">Beispieldaten</button></div>
              <h2 className="mb-2 font-bold">Tarif</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {Object.entries(TARIFFS).map(([key,t]) => <button key={key} onClick={() => setTariff(key as TariffKey)} className={`rounded-xl border p-3 text-left ${tariff===key ? "border-sky-600 bg-sky-50 ring-2 ring-sky-100" : "hover:bg-slate-50"}`}><div className="font-bold">{t.name}</div><div className="text-sm text-slate-500">{euro(t.price)}</div></button>)}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="block"><span className="text-sm font-bold">Erwachsene</span><input type="number" min="1" value={people} onChange={e=>setPeople(Math.max(1,+e.target.value))} className="mt-1 w-full rounded-lg border p-3"/></label>
                <label className="block"><span className="text-sm font-bold">Kinder</span><input type="number" min="0" value={child} onChange={e=>setChild(Math.max(0,+e.target.value))} className="mt-1 w-full rounded-lg border p-3"/></label>
                <label className="block"><span className="text-sm font-bold">Kleinkinder</span><input type="number" min="0" value={toddler} onChange={e=>setToddler(Math.max(0,+e.target.value))} className="mt-1 w-full rounded-lg border p-3"/></label>
              </div>
              {tariff === "worker" && <label className="mt-4 block"><span className="text-sm font-bold">Name des Mitarbeiters</span><input value={employeeName} onChange={e=>setEmployeeName(e.target.value)} placeholder="z. B. Max Mustermann" className="mt-1 w-full rounded-lg border p-3"/></label>}
              <h2 className="mb-2 mt-5 font-bold">Zusatzleistungen</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {EXTRAS.map(([name,price]) => <div key={name} className="flex items-center justify-between rounded-xl border p-3"><div><div className="font-semibold text-sm">{name}</div><div className="text-xs text-slate-500">{euro(price)}</div></div><input type="number" min="0" value={extras[name]||0} onChange={e=>setExtras({...extras,[name]:Math.max(0,+e.target.value)})} className="w-16 rounded border p-2 text-center"/></div>)}
              </div>
              <h2 className="mb-2 mt-5 font-bold">Zahlung</h2>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>setPayment("Karte")} className={`rounded-xl p-4 font-extrabold ${payment==="Karte"?"bg-[#063b5c] text-white":"border bg-white"}`}>💳 Kartenzahlung</button>
                <button onClick={()=>setPayment("Barzahlung")} className={`rounded-xl p-4 font-extrabold ${payment==="Barzahlung"?"bg-[#063b5c] text-white":"border bg-white"}`}>💶 Barzahlung</button>
              </div>
            </section>
            <aside className="h-fit rounded-2xl bg-[#063b5c] p-5 text-white shadow-lg lg:sticky lg:top-24">
              <div className="text-sm opacity-75">Zusammenfassung</div>
              <div className="mt-1 text-2xl font-extrabold">{TARIFFS[tariff].name}</div>
              <div className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><span>Netto</span><b>{euro(cart.net)}</b></div><div className="flex justify-between"><span>MwSt. 19 %</span><b>{euro(cart.vat)}</b></div><div className="my-3 border-t border-white/20"/><div className="flex justify-between text-2xl"><span>Gesamt</span><b>{euro(cart.gross)}</b></div></div>
              <button onClick={createTicket} className="mt-6 w-full rounded-xl bg-white p-4 font-extrabold text-[#063b5c] hover:bg-sky-50">Zahlung abschließen & Ticket erzeugen</button>
              <p className="mt-3 text-xs opacity-70">QR enthält nur die Ticketnummer. Daten bleiben in dieser Demo lokal im Browser.</p>
            </aside>
          </div>
        )}

        {view === "tickets" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Ticketverwaltung</h1><p className="text-sm text-slate-500">{tickets.length} Tickets lokal gespeichert</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticketnummer suchen…" className="rounded-lg border p-3"/></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b bg-slate-50"><th className="p-3">Ticket</th><th>Tarif</th><th>Datum</th><th>Status</th><th>Utz.</th><th>Betrag</th><th>Aktion</th></tr></thead><tbody>
              {tickets.filter(t=>t.number.toLowerCase().includes(search.toLowerCase())).map(t=><tr key={t.id} className="border-b"><td className="p-3 font-bold">{t.number}</td><td>{t.tariffName}</td><td>{dateDE(t.createdAt)}</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${t.status==="Gültig"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{t.status}</span></td><td>{t.maxUses===null?`${t.uses} / ∞`:`${t.uses} / ${t.maxUses}`}</td><td>{euro(t.gross)}</td><td><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={()=>setSelected(t)}>Anzeigen</button><button className="rounded bg-[#063b5c] px-2 py-1 text-white" onClick={()=>printTicket(t)}>Drucken</button></div></td></tr>)}
            </tbody></table></div>
            {selected && <div className="mt-5 rounded-2xl border bg-slate-50 p-5"><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">{selected.number}</h2><p>{selected.tariffName} · {selected.payment}</p></div><button onClick={()=>setSelected(null)}>✕</button></div><div className="mt-4 grid gap-3 md:grid-cols-4"><div><b>Nutzungen</b><div>{selected.uses}</div></div><div><b>Restliche Fahrten</b><div>{remaining}</div></div><div><b>Gültig bis</b><div>{dateDE(selected.validUntil)}</div></div><div><b>Gesamt</b><div>{euro(selected.gross)}</div></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>printTicket(selected)} className="rounded-lg bg-[#063b5c] px-4 py-2 font-bold text-white">A4 erneut drucken</button><button onClick={()=>setTickets(p=>p.map(x=>x.id===selected.id?{...x,status:"Gesperrt"}:x))} className="rounded-lg border px-4 py-2">Sperren</button><button onClick={()=>setTickets(p=>p.map(x=>x.id===selected.id?{...x,status:"Storniert"}:x))} className="rounded-lg border px-4 py-2">Stornieren</button></div></div>}
          </section>
        )}

        {view === "scanner" && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm"><h1 className="text-2xl font-extrabold">Scanner</h1><p className="mt-1 text-sm text-slate-500">Kamera oder Ticketnummer verwenden.</p><div className="mt-4 overflow-hidden rounded-xl bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline/></div><div className="mt-3 flex gap-2"><button onClick={startScanner} className="rounded-lg bg-[#063b5c] px-4 py-3 font-bold text-white">Kamera starten</button><button onClick={stopScanner} disabled={!scannerOn} className="rounded-lg border px-4 py-3">Stop</button></div><div className="mt-5 flex gap-2"><input value={scanInput} onChange={e=>setScanInput(e.target.value)} placeholder="FHR-2026-000001" className="min-w-0 flex-1 rounded-lg border p-3"/><button onClick={()=>scan(scanInput)} className="rounded-lg bg-green-600 px-4 font-bold text-white">Prüfen</button></div></div>
            <div className={`rounded-2xl p-6 shadow-sm ${message.startsWith("GRÜN")?"bg-green-600 text-white":message.startsWith("ROT")?"bg-red-600 text-white":"bg-white"}`}><div className="text-3xl font-black">{message.startsWith("GRÜN")?"GRÜN":message.startsWith("ROT")?"ROT":"Scanner bereit"}</div>{selected && <div className="mt-5 space-y-2"><div><span className="opacity-75">Ticketnummer</span><div className="text-xl font-extrabold">{selected.number}</div></div><div><span className="opacity-75">Tarif</span><div>{selected.tariffName}</div></div><div><span className="opacity-75">Nutzungen</span><div>{selected.maxUses===null?`${selected.uses} / ∞`:`${selected.uses} / ${selected.maxUses}`}</div></div><div><span className="opacity-75">Restliche Fahrten</span><div className="text-xl font-extrabold">{selected.maxUses===null?"Unbegrenzt":Math.max(0,selected.maxUses-selected.uses)}</div></div></div>}</div>
          </section>
        )}

        {view === "reports" && (
          <section>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[["Heutiger Umsatz",euro(stats.todayRevenue)],["Tickets heute",String(stats.todayTickets.length)],["Monatsumsatz",euro(stats.monthRevenue)],["Offene Tickets",String(stats.open)]].map(([a,b])=><div key={a} className="rounded-2xl bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">{a}</div><div className="mt-2 text-2xl font-extrabold">{b}</div></div>)}
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">Berichte & Tagesabschluss</h1><p className="text-sm text-slate-500">Aktuelle Buchungen des Tages exportieren.</p></div><div className="flex flex-wrap gap-2"><button onClick={downloadCSV} className="rounded-lg bg-[#063b5c] px-4 py-2 font-bold text-white">⬇ Tagesbericht CSV</button><button onClick={downloadJSON} className="rounded-lg border px-4 py-2 font-bold">⬇ Daten-Backup JSON</button><button onClick={()=>window.print()} className="rounded-lg border px-4 py-2 font-bold">🖨 Bericht drucken / PDF</button></div></div>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-3">Tarif</th><th>Tickets</th><th>Umsatz</th></tr></thead><tbody>{Object.entries(TARIFFS).map(([k,t])=>{const r=stats.todayTickets.filter(x=>x.tariff===k);return <tr key={k} className="border-b"><td className="p-3 font-bold">{t.name}</td><td>{r.length}</td><td>{euro(r.reduce((s,x)=>s+x.gross,0))}</td></tr>})}</tbody></table></div>
              <div className="mt-5 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Barumsatz</div><b>{euro(stats.todayTickets.filter(t=>t.payment==="Barzahlung").reduce((s,t)=>s+t.gross,0))}</b></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Kartenumsatz</div><b>{euro(stats.todayTickets.filter(t=>t.payment==="Karte").reduce((s,t)=>s+t.gross,0))}</b></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">MwSt. 19 %</div><b>{euro(stats.todayTickets.reduce((s,t)=>s+t.vat,0))}</b></div></div>
            </div>
          </section>
        )}
      </div>
      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 pt-2 text-center text-xs text-slate-500">Demo ohne Login · Daten werden nur lokal im Browser gespeichert · Wallet-Buttons/Signaturen benötigen im Produktivbetrieb Apple- bzw. Google-Wallet-Zugangsdaten.</footer>
    </main>
  );
}
