'use client';
import React, { useRef, useState } from 'react';
import Html5Qrcode from 'html5-qrcode';

export default function ScannerPage() {
  const [result, setResult] = useState<any>(null);
  const qrRegionId = 'qr-region';

  async function startScanner() {
    const html5QrCode = new Html5Qrcode(qrRegionId);
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      async (decodedText) => {
        html5QrCode.stop();
        const token = decodedText.includes('/ticket/') ? decodedText.split('/ticket/').pop() : decodedText;
        const res = await fetch('/api/scan', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ qrToken: token }) });
        const data = await res.json();
        setResult(data);
      },
      (errorMessage) => { }
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl">Scanner</h1>
      <div id={qrRegionId} className="w-full h-96 bg-gray-200 mt-4"></div>
      <div className="mt-4">
        <button onClick={startScanner} className="px-4 py-2 bg-blue-600 text-white rounded">Scanner starten</button>
      </div>
      {result && (
        <div className="mt-4 p-4 border rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
