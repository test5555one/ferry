'use client';
import React, { useState } from 'react';

export default function KassePage() {
  const [tariff, setTariff] = useState('SINGLE');
  const [persons, setPersons] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sell(method: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffCode: tariff, purchaserName: name, purchaserEmail: email, persons, paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler');
      window.open(`/ticket/print/${data.ticket.ticketNumber}`, '_blank');
      alert('Ticket verkauft: ' + data.ticket.ticketNumber);
    } catch (e: any) {
      alert('Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Kasse — Ticketverkauf</h1>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label>Tarif</label>
          <select value={tariff} onChange={(e)=>setTariff(e.target.value)} className="block mt-1 p-2 border rounded">
            <option value="DAYSAVER">DaySaver</option>
            <option value="SINGLE">Einzelfahrt</option>
            <option value="RETURN">Hin- und Rückfahrt</option>
            <option value="WEEK">Wochenkarte</option>
            <option value="MONTH">Monatskarte</option>
            <option value="WORKER">Arbeiter</option>
          </select>
        </div>
        <div>
          <label>Personen</label>
          <input type="number" value={persons} onChange={(e)=>setPersons(Number(e.target.value))} className="block mt-1 p-2 border rounded"/>
        </div>
        <div>
          <label>Name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="block mt-1 p-2 border rounded"/>
        </div>
        <div>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} className="block mt-1 p-2 border rounded"/>
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <button onClick={()=>sell('CARD')} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Kartenzahlung</button>
        <button onClick={()=>sell('CASH')} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">Barzahlung</button>
      </div>
    </div>
  );
}
