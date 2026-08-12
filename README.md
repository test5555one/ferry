# Föhr-Reederei — Kassen & Ticket-System (Next.js + Prisma + Postgres)

Features
- Kassenoberfläche (Kassierer)
- Ticketverkauf + Preisberechnung
- QR-Code Tickets (sichere Token)
- Scanner Interface (QR Kamera) mit Verbrauchs-Logik
- Admin-Export (Excel)
- Druckansicht A4 (Bon)
- Wallet-Integration (Apple / Google) — Platzhalter und Anleitung
- PWA + Docker Support

Voraussetzungen
- Node 18+
- Postgres (in Docker enthalten, siehe docker-compose)
- Apple Pass Zertifikat (für .pkpass) für Produktion
- Google Service Account JSON (für Google Wallet)

Quickstart (lokal)
1. .env anlegen: cp .env.example .env und anpassen
2. DB starten: docker-compose up -d db
3. Dependencies: npm ci
4. Prisma: npx prisma generate
5. Migration/Sequenz: führe die SQL-Sequenz aus oder npx prisma migrate dev --name init
   (Vorher: CREATE SEQUENCE IF NOT EXISTS fhr_ticket_seq START 1;)
6. Seed: npm run seed
7. Dev starten: npm run dev
8. Öffne: http://localhost:3000/kasse, /scanner, /admin

Wallet / Pass Setup (Kurz)
- Apple .pkpass:
  - Erstelle Pass Type ID in Apple Developer, lade Zertifikat (.p12) herunter.
  - Implementiere signieren mit passkit-generator.
  - Setze APPLE_P12_PATH und APPLE_P12_PASSWORD in .env.
- Google Wallet:
  - Erstelle Service Account in Google Cloud, aktiviere Google Wallet API.
  - Lege credentials JSON Pfad in GOOGLE_SERVICE_ACCOUNT_JSON ab.
  - Erstelle CardClass/CardObject per JWT (siehe Google Wallet docs).

Sicherheit
- JWT Auth für API-Routen (implementieren)
- CSRF-Protection auf Seiten mit Formularen (Next.js Middleware)
- Rate-Limiting / Audit-Logs (DB-Model vorhanden)

