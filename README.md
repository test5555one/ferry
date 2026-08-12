# Föhr-Reederei Kassensystem – Demo

Eine direkt startbare Next.js-15-Demo ohne Anmeldung. Sie eignet sich zum Spielen/Testen und speichert Tickets im Browser (`localStorage`).

## Enthalten

- Kassensystem mit DaySaver, Einzelfahrt, Hin-/Rückfahrt, Woche, Monat, Arbeiter
- Zusatzleistungen und Mengen
- Barzahlung / Kartenzahlung
- automatische Ticketnummern `FHR-JAHR-000001`
- QR-Code mit sicherer Ticketnummer als Referenz
- Ticketverwaltung
- Scanner per Kamera (wenn der Browser Kamera-Zugriff erlaubt) oder manuelle Nummer
- Nutzungszählung für Einzelfahrt und Hin-/Rückfahrt
- unbegrenzte Nutzung für DaySaver/Woche/Monat/Arbeiter
- A4-Druckansicht mit QR-Code
- Tagesbericht CSV
- JSON-Datenbackup
- Bericht drucken / als PDF im Browser speichern
- responsive Blau-Weiß-Oberfläche

## Start

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` öffnen.

## GitHub + Vercel

Repository hochladen, bei Vercel importieren und automatisch bauen lassen.

## Wichtig für einen echten Produktivbetrieb

Diese Demo ist absichtlich ohne Anmeldung und ohne Serverdatenbank. Für echten Verkauf müssen PostgreSQL/Prisma, Benutzerrechte, Server-seitige Ticketvalidierung, Audit-Logs, Rate-Limiting, CSRF/Origin-Schutz sowie echte Apple-Wallet- und Google-Wallet-Signaturen ergänzt werden.

Apple Wallet `.pkpass` kann nicht ohne gültiges Apple-Pass-Zertifikat signiert werden. Google Wallet benötigt ebenfalls einen konfigurierten Issuer/Service-Account. Die Oberfläche ist deshalb als Demo vorbereitet, statt ungültige Fake-Pässe auszugeben.
