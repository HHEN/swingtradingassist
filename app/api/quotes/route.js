// Serverseitiger Kurs-Abruf über Twelve Data. Läuft NUR auf dem Server
// (Vercel Function), damit der API-Key niemals im Browser landet.
// Erwartet Umgebungsvariable: TWELVEDATA_API_KEY
//
// Free-Tier: 8 Credits/Minute, 1 Credit PRO SYMBOL. Ein Batch-Call mit
// bis zu 8 Symbolen kostet 8 Credits und bleibt im Limit — daher EIN Call,
// keine Wartepausen (Vercel-Functions haben nur wenige Sekunden Laufzeit).

export const dynamic = "force-dynamic";

// Nur die Top-Setup-Kandidaten (aktiver Trade + Titel nah an einer Kaufzone).
// Alles andere ist im Chat-Update / Archiv und braucht keinen taeglichen Kurs.
const SYMBOLS = ["JNJ", "NVDA", "RPRX", "GEN", "EXEL", "NVO"];

export async function GET() {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    return Response.json({ error: "TWELVEDATA_API_KEY fehlt in den Environment Variables" }, { status: 500 });
  }
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${SYMBOLS.join(",")}&apikey=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error("TwelveData HTTP " + res.status + (body ? " — " + body.slice(0, 140) : ""));
    }
    const data = await res.json();
    if (data && data.code === 429) throw new Error(String(data.message || "Rate limit").slice(0, 160));

    const entries = (data && data.symbol) ? { [data.symbol]: data } : data;
    const prices = {};
    let asof = null;
    for (const sym of SYMBOLS) {
      const q = entries?.[sym];
      if (!q || q.status === "error") continue;
      const p = parseFloat(q.close ?? q.price ?? q.previous_close);
      if (!isNaN(p)) {
        prices[sym] = p;
        if (q.datetime && !asof) asof = String(q.datetime).slice(0, 10);
      }
    }

    if (Object.keys(prices).length === 0) {
      const msg = data?.message || "keine Kursdaten — Key oder Limit prüfen";
      throw new Error(String(msg).slice(0, 160));
    }

    const eurusd = 1.144; // fester Umrechnungskurs, spart Credits
    return Response.json({ prices, eurusd, asof });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502 });
  }
}
