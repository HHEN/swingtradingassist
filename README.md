# Swing-Cockpit → Vercel

Dein Value-Pullback-Cockpit als eigenständige Web-App. Kurse kommen serverseitig
von FMP (dein API-Key bleibt geheim), Persistenz über den Browser (localStorage).

## Was du brauchst
1. Einen **FMP-API-Key** — kostenlos unter twelvedata.com (Dashboard → API Key).
   Der Free-Tier reicht für ~250 Abrufe/Tag; du brauchst nur einen pro Tag.
2. Einen **GitHub-Account** und einen **Vercel-Account** (beide kostenlos, Vercel-Login via GitHub).

## Weg A — der einfachste (GitHub + Vercel, keine Kommandozeile)

1. Neues GitHub-Repository anlegen (z. B. `swing-cockpit`, privat).
2. Diese Dateien ins Repo laden: Auf der GitHub-Repo-Seite „Add file → Upload files",
   den gesamten Ordnerinhalt reinziehen, committen.
3. Auf vercel.com → „Add New… → Project" → dein GitHub-Repo auswählen → „Import".
4. Vor dem Deploy: unter **Environment Variables** eintragen:
   - Name: `TWELVEDATA_API_KEY`
   - Value: dein FMP-Schlüssel
5. „Deploy" klicken. Nach ~1 Minute bekommst du eine URL wie `swing-cockpit-xyz.vercel.app`.
6. URL auf dem Handy öffnen → „Zum Home-Bildschirm hinzufügen" → fühlt sich wie eine App an.

## Weg B — lokal testen, dann deployen (mit Node/CLI)

```bash
npm install
cp .env.local.example .env.local     # TWELVEDATA_API_KEY eintragen
npm run dev                          # http://localhost:3000
# zufrieden? dann:
npm i -g vercel
vercel                               # folgt dem Assistenten
vercel env add TWELVEDATA_API_KEY           # Schlüssel hinterlegen
vercel --prod
```

## Täglicher Gebrauch
- Einmal am Tag „Kurse holen" tippen (holt den letzten Tagesschluss).
- Ampeln checken, R-Leiste des aktiven Trades checken — fertig.
- Wird eine Ampel grün („Setup"), den vollen Fünf-Stufen-Check weiterhin mit Claude machen.

## Anpassen
- Watchlist, Alerts und Trades stehen oben in `app/page.js` in `SEED_WATCH` / `SEED_TRADES`.
- Geschlossene Trades trägst du dort mit `resultR` (z. B. `resultR: 2.1`) ins Journal ein.

Analyse-Werkzeug, keine Anlageberatung.
