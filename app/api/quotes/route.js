// Serverseitiger Kurs-Abruf über Twelve Data. Läuft NUR auf dem Server
// (Vercel Function), damit der API-Key niemals im Browser landet.
// Erwartet Umgebungsvariable: TWELVEDATA_API_KEY
//
// Free-Tier: 8 Credits/Minute, 1 Credit PRO SYMBOL. Die App schickt die
// Symbole für den jeweiligen Batch als ?symbols=AAA,BBB (max 8 pro Call).
// Über den Tag verteilt (bzw. zwei Klicks im Minutenabstand) sind so alle
// Titel abrufbar, ohne das Minutenlimit zu reißen.

export const dynamic = "force-dynamic";

const FALLBACK = ["JNJ", "NVDA", "RPRX", "GEN", "EXEL", "NVO"];
const MAX = 8;

export async function GET(req) {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    return Response.json({ error: "TWELVEDATA_API_KEY fehlt in den Environment Variables" }, { status: 500 });
  }
  // Symbole aus der Anfrage (?symbols=...) oder Fallback; hart auf MAX begrenzt.
  const url0 = new URL(req.url);
  const param = url0.searchParams.get("symbols");
  let symbols = param ? param.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : FALLBACK;
  symbols = symbols.slice(0, MAX);
  if (symbols.length === 0) {
    return Response.json({ error: "keine Symbole angefragt" }, { status: 400 });
  }
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${symbols.join(",")}&apikey=${key}`;
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
    for (const sym of symbols) {
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
