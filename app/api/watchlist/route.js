// Watchlist-Persistenz über Vercel KV (Redis).
// GET  /api/watchlist  → liefert den gespeicherten Stand (seedet beim ersten Mal aus data.json)
// POST /api/watchlist  → speichert den kompletten Watchlist-Stand
//
// Datenmodell in KV unter dem Key "cockpit:watchlist":
//   { watchlist: [...], archiv: [sym,...], overrides: {sym:{alert,direction}}, updated: "ISO" }

import { kv } from "@vercel/kv";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const KEY = "cockpit:watchlist";

function seedFromDataJson() {
  try {
    const p = path.join(process.cwd(), "public", "data.json");
    const d = JSON.parse(fs.readFileSync(p, "utf8"));
    const archiv = (d.watchlist || []).filter((w) => w.archived).map((w) => w.sym);
    return { watchlist: d.watchlist || [], archiv, overrides: {}, updated: new Date().toISOString() };
  } catch {
    return { watchlist: [], archiv: [], overrides: {}, updated: new Date().toISOString() };
  }
}

export async function GET() {
  try {
    let data = await kv.get(KEY);
    if (!data) {
      data = seedFromDataJson();
      await kv.set(KEY, data);
    }
    return Response.json(data);
  } catch (e) {
    // Fällt KV aus, liefern wir den Seed, damit die App nicht leer bleibt.
    return Response.json({ ...seedFromDataJson(), _fallback: true, _error: String(e.message || e) });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.watchlist)) {
      return Response.json({ error: "watchlist fehlt oder ungültig" }, { status: 400 });
    }
    const data = {
      watchlist: body.watchlist,
      archiv: Array.isArray(body.archiv) ? body.archiv : [],
      overrides: body.overrides && typeof body.overrides === "object" ? body.overrides : {},
      updated: new Date().toISOString(),
    };
    await kv.set(KEY, data);
    return Response.json({ ok: true, updated: data.updated });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502 });
  }
}
