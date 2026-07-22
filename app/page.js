"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

/* =========================================================================
   SWING-COCKPIT — Value-Pullback-Framework (Vercel / Next.js Version)
   Kurse: eigene Server-Route /api/quotes (FMP, Key bleibt serverseitig).
   Persistenz: localStorage. Einmal täglich Tagesschluss holen.
   ========================================================================= */

const C = {
  bg: "#0E1116", panel: "#161A21", panel2: "#1C222B", line: "#262D38",
  text: "#E6E4DF", dim: "#7C8492", faint: "#4A515C",
  sage: "#6BA88C", amber: "#CFA255", clay: "#C56B5C", steel: "#6E92B8",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
`;

const SEED_WATCH = [
  { sym: "NVDA", name: "Nvidia",          sector: "KI/Halbleiter", alert: 185.75, dir: "up",   note: "Reparatur: höheres Hoch >212$ nötig" },
  { sym: "MU",   name: "Micron",          sector: "KI/Halbleiter", alert: 785.0,  dir: "up",   note: "Rückeroberung 50er" },
  { sym: "QCOM", name: "Qualcomm",        sector: "KI/Halbleiter", alert: 148.60, dir: "up",   note: "Rückeroberung + Earnings Ende Juli" },
  { sym: "ADBE", name: "Adobe",           sector: "KI/Halbleiter", alert: 201.50, dir: "down", note: "50er-Retest, Bodenbildung jung" },
  { sym: "ADI",  name: "Analog Devices",  sector: "KI/Halbleiter", alert: 350.0,  dir: "up",   note: "Standby — 50er-Rückeroberung" },
  { sym: "LULU", name: "Lululemon",       sector: "Lifestyle",     alert: 91.50,  dir: "down", note: "52-Wochen-Tief = These tot" },
  { sym: "NKE",  name: "Nike",            sector: "Lifestyle",     alert: null,   dir: "watch",note: "Bodenbildung, Wochenchart" },
  { sym: "NVO",  name: "Novo Nordisk",    sector: "Pharma-Opp",    alert: 40.30,  dir: "down", note: "Rücksetzer an steigende 50er" },
  { sym: "RPRX", name: "Royalty Pharma",  sector: "Pharma-Opp",    alert: 46.30,  dir: "down", note: "Rücksetzer an steigende 50er" },
  { sym: "GILD", name: "Gilead",          sector: "Depot",         alert: null,   dir: "term", note: "Re-Check nach Q2 (Anfang Aug.)" },
];

const SEED_TRADES = [
  { id: "jnj-1", sym: "JNJ", name: "Johnson & Johnson", status: "open",
    entry: 218.0, stop: 211.15, target: 235.55, opened: "2026-07-20",
    timestop: "2026-08-17", instrument: "UBS OE Turbo (KO 224,5$)", note: "Value-Pullback, Earnings durch bis 20.10." },
  { id: "wmt-1", sym: "WMT", name: "Walmart", status: "closed",
    entry: null, stop: null, target: null, opened: "2026-07-08", closed: "2026-07-20",
    resultR: null, resultPct: 3.0, note: "Regellose Altposition — diszipliniert geschlossen (+~3 %)" },
];

const FX_FALLBACK = 1.144;

const eur = (v) => (v == null || isNaN(v)) ? "–" : v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => (v == null || isNaN(v)) ? "–" : (v >= 0 ? "+" : "") + v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";

// Persistenz über localStorage (Browser)
function storageGet(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function storageSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// Tagesschluss über eigene Server-Route (FMP-Key bleibt serverseitig)
async function fetchQuotes() {
  const res = await fetch("/api/quotes", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return { prices: data.prices || {}, eurusd: data.eurusd || FX_FALLBACK, asof: data.asof || null };
}

// ---- Kleine UI-Bausteine ------------------------------------------------
function Dot({ color }) {
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: color, flexShrink: 0 }} />;
}

function Ampel({ status }) {
  const map = {
    check: { c: C.amber, t: "Prüfen" },
    watch: { c: C.dim,   t: "Beobachten" },
    corr:  { c: C.clay,  t: "Korrektur" },
    term:  { c: C.steel, t: "Termin" },
    near:  { c: C.amber, t: "Nahe Alert" },
  };
  const m = map[status] || map.watch;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: m.c, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.3 }}>
      <Dot color={m.c} />{m.t}
    </span>
  );
}

// ---- R-Leiste (Signature) ----------------------------------------------
function RLeiste({ entry, stop, target, price }) {
  const R = entry - stop;                       // 1R in EUR
  const rNow = price != null ? (price - entry) / R : null;
  const rTarget = (target - entry) / R;         // z. B. +2,56R
  const min = -1.4, max = rTarget + 0.4;
  const span = max - min;
  const posOf = (r) => ((r - min) / span) * 100;

  const markerColor =
    rNow == null ? C.dim : rNow >= 0 ? C.sage : rNow <= -1 ? C.clay : C.amber;

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 7, letterSpacing: 0.4 }}>
        <span>STOP · −1R</span><span>ENTRY · 0</span><span>ZIEL · +{rTarget.toFixed(2)}R</span>
      </div>
      <div style={{ position: "relative", height: 44 }}>
        {/* Bahn */}
        <div style={{ position: "absolute", top: 19, left: 0, right: 0, height: 6, borderRadius: 3, background: C.panel2, overflow: "hidden" }}>
          {/* Risiko-Segment */}
          <div style={{ position: "absolute", left: posOf(-1) + "%", width: (posOf(0) - posOf(-1)) + "%", top: 0, bottom: 0, background: "rgba(197,107,92,0.35)" }} />
          {/* Chance-Segment */}
          <div style={{ position: "absolute", left: posOf(0) + "%", width: (posOf(rTarget) - posOf(0)) + "%", top: 0, bottom: 0, background: "rgba(107,168,140,0.35)" }} />
        </div>
        {/* Ticks */}
        {[["-1R", -1, C.clay], ["0", 0, C.text], ["+" + rTarget.toFixed(1) + "R", rTarget, C.sage]].map(([lbl, r, col]) => (
          <div key={lbl} style={{ position: "absolute", left: posOf(r) + "%", top: 12, transform: "translateX(-50%)" }}>
            <div style={{ width: 2, height: 20, background: col, opacity: 0.6 }} />
          </div>
        ))}
        {/* Live-Marker */}
        {rNow != null && (
          <div style={{ position: "absolute", left: Math.max(0, Math.min(100, posOf(rNow))) + "%", top: 4, transform: "translateX(-50%)", transition: "left 0.6s cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ width: 3, height: 36, background: markerColor, borderRadius: 2, boxShadow: `0 0 10px ${markerColor}` }} />
            <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: markerColor, fontWeight: 600 }}>
              {rNow >= 0 ? "+" : ""}{rNow.toFixed(2)}R
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Aktiver Trade ------------------------------------------------------
function ActiveTrade({ t, price, fx }) {
  const R = t.entry - t.stop;
  const rNow = price != null ? (price - t.entry) / R : null;
  const daysLeft = Math.ceil((new Date(t.timestop) - new Date()) / 86400000);
  const gap = (label, val, col) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.4, marginBottom: 4, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 17, color: col || C.text, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{val}</div>
    </div>
  );
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: "22px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: C.text }}>{t.sym}</span>
          <span style={{ color: C.dim, fontSize: 13 }}>{t.name}</span>
        </div>
        <span style={{ fontSize: 11, color: C.sage, fontFamily: "'IBM Plex Mono', monospace", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Dot color={C.sage} /> AKTIVER TRADE
        </span>
      </div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>{t.instrument} · {t.note}</div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
        {gap("KURS JETZT", price != null ? eur(price) + " €" : "lädt…", rNow == null ? C.text : rNow >= 0 ? C.sage : C.clay)}
        {gap("ENTRY", eur(t.entry) + " €")}
        {gap("STOP", eur(t.stop) + " €", C.clay)}
        {gap("ZIEL", eur(t.target) + " €", C.sage)}
        {gap("ZEIT-STOP", daysLeft + " Tage", daysLeft <= 5 ? C.amber : C.text)}
      </div>

      <RLeiste entry={t.entry} stop={t.stop} target={t.target} price={price} />
    </div>
  );
}

// ---- Watchlist-Zeile ----------------------------------------------------
function WatchRow({ w, price, onSave }) {
  const [open, setOpen] = useState(false);
  const [editAlert, setEditAlert] = useState(w.alert ?? "");
  const [editDir, setEditDir] = useState(w.direction || w.dir || "watch");
  const dir = w.direction || w.dir;
  let status = dir === "term" ? "term" : "watch";
  let distTxt = "—", distCol = C.dim;
  if (w.alert != null && price != null) {
    const d = ((price - w.alert) / w.alert) * 100;
    const triggered = dir === "down" ? price <= w.alert : price >= w.alert;
    const near = Math.abs(d) <= 2;
    // Ausgelöster Alert = Prüfauftrag, KEIN Setup. Ob ein Setup vorliegt,
    // entscheidet der Fünf-Stufen-Check im Chat, nicht die Kursabfrage.
    status = triggered ? "check" : near ? "near" : (dir === "down" ? "watch" : "corr");
    distTxt = (d >= 0 ? "+" : "") + d.toFixed(1) + " %";
    distCol = triggered ? C.amber : near ? C.amber : C.dim;
  }
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "·";
  const sub = w.condition || w.note || "";
  const edited = w._edited;

  const save = () => {
    const val = editAlert === "" ? null : parseFloat(String(editAlert).replace(",", "."));
    onSave(w.sym, { alert: isNaN(val) ? null : val, direction: editDir });
  };

  return (
    <div style={{ borderBottom: `1px solid ${C.line}` }}>
      <div onClick={() => setOpen((o) => !o)}
        style={{ display: "grid", gridTemplateColumns: "62px 1fr 96px 84px 120px", gap: 10, alignItems: "center", padding: "11px 14px", cursor: "pointer" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.text }}>{w.sym}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.text, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            {w.name}
            <span style={{ color: C.faint, fontSize: 10, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
          </div>
          <div style={{ fontSize: 10.5, color: C.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: price != null ? C.text : C.faint, textAlign: "right" }}>
          {price != null ? eur(price) : "–"}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: edited ? C.sage : C.dim, textAlign: "right" }}>
          {w.alert != null ? `${arrow} ${eur(w.alert)}` : arrow}{edited ? " •" : ""}
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: distCol }}>{distTxt}</span>
          <Ampel status={status} />
        </div>
      </div>
      {open && (
        <div style={{ padding: "2px 14px 14px 76px", display: "flex", flexDirection: "column", gap: 10 }}>
          {w.narrative && (
            <div style={{ fontSize: 12, color: C.text, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
              <span style={{ color: C.steel, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4 }}>NARRATIV </span>{w.narrative}
            </div>
          )}
          {w.indicator && (
            <div style={{ fontSize: 11.5, color: C.dim, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
              <span style={{ color: C.steel, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4 }}>INDIKATOR </span>{w.indicator}
            </div>
          )}
          {/* Alert bearbeiten */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
            <span style={{ color: C.steel, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: 0.4 }}>ALERT</span>
            <input value={editAlert} onChange={(e) => setEditAlert(e.target.value)} placeholder="Marke €"
              inputMode="decimal"
              style={{ width: 88, background: C.panel2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 9px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }} />
            <select value={editDir} onChange={(e) => setEditDir(e.target.value)}
              style={{ background: C.panel2, color: C.text, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 9px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>
              <option value="up">↑ Rückeroberung</option>
              <option value="down">↓ Rücksetzer</option>
              <option value="watch">· Beobachten</option>
              <option value="term">· Termin</option>
            </select>
            <button onClick={save}
              style={{ background: C.sage, color: C.bg, border: "none", borderRadius: 7, padding: "6px 13px", fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, cursor: "pointer" }}>
              Speichern
            </button>
            {edited && (
              <button onClick={() => onSave(w.sym, null)}
                style={{ background: "transparent", color: C.dim, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 11px", fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}>
                Zurücksetzen
              </button>
            )}
          </div>
          {w.tvLink && (
            <a href={w.tvLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ alignSelf: "flex-start", fontSize: 11.5, fontFamily: "'IBM Plex Mono', monospace", color: C.sage, textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: 7, padding: "5px 11px" }}>
              ↗ TradingView-Chart
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Journal / Statistik ------------------------------------------------
function Journal({ trades }) {
  const closed = trades.filter((t) => t.status === "closed");
  const open = trades.filter((t) => t.status === "open");
  const rTrades = closed.filter((t) => typeof t.resultR === "number");
  const sumR = rTrades.reduce((a, t) => a + t.resultR, 0);
  const wins = closed.filter((t) => (t.resultR ?? t.resultPct ?? 0) > 0).length;
  const hit = closed.length ? Math.round((wins / closed.length) * 100) : 0;

  const stat = (label, val, col) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 21, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, color: col || C.text }}>{val}</div>
      <div style={{ fontSize: 10.5, color: C.dim, letterSpacing: 0.4, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 16, padding: "4px 4px 20px" }}>
        {stat("TRADES GESAMT", closed.length + open.length)}
        {stat("OFFEN", open.length, C.sage)}
        {stat("TREFFERQUOTE", hit + " %")}
        {stat("SUMME R", (sumR >= 0 ? "+" : "") + sumR.toFixed(2) + "R", sumR >= 0 ? C.sage : C.clay)}
      </div>
      {trades.map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 4px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Dot color={t.status === "open" ? C.sage : C.faint} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13.5, color: C.text, width: 44 }}>{t.sym}</span>
            <span style={{ fontSize: 11.5, color: C.faint }}>{t.status === "open" ? `offen seit ${t.opened}` : `${t.opened} → ${t.closed}`}</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: t.status === "open" ? C.dim : ((t.resultR ?? t.resultPct ?? 0) >= 0 ? C.sage : C.clay) }}>
            {t.status === "open" ? "läuft" : typeof t.resultR === "number" ? `${t.resultR >= 0 ? "+" : ""}${t.resultR.toFixed(2)}R` : pct(t.resultPct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- Panel-Rahmen -------------------------------------------------------
function Panel({ title, right, children }) {
  return (
    <section style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.line}` }}>
        <h2 style={{ margin: 0, fontSize: 12, letterSpacing: 1.2, color: C.dim, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, textTransform: "uppercase" }}>{title}</h2>
        {right}
      </header>
      <div style={{ padding: title ? 0 : 18 }}>{children}</div>
    </section>
  );
}

// ---- App ----------------------------------------------------------------

export default function App() {
  const [watch, setWatch] = useState(SEED_WATCH);
  const [overrides, setOverrides] = useState({}); // sym -> {alert, direction} (lokal)
  const [trades, setTrades] = useState(SEED_TRADES);
  const [dataInfo, setDataInfo] = useState(null); // meta aus data.json
  const [prices, setPrices] = useState({});      // sym -> EUR
  const [fx, setFx] = useState(FX_FALLBACK);
  const [status, setStatus] = useState("init");  // init|loading|ok|error|empty
  const [asof, setAsof] = useState(null);        // Datum des Kursstands
  const [updated, setUpdated] = useState(null);  // Zeitpunkt des Abrufs
  const [errMsg, setErrMsg] = useState("");
  const mounted = useRef(true);

  const todayStr = new Date().toISOString().slice(0, 10);
  const fetchedToday = updated && updated.slice(0, 10) === todayStr;

  const load = useCallback(async () => {
    setStatus("loading"); setErrMsg("");
    try {
      const { prices: raw, eurusd, asof: dt } = await fetchQuotes();
      const rate = eurusd || FX_FALLBACK;
      const eurPrices = {};
      Object.entries(raw).forEach(([s, p]) => { if (typeof p === "number") eurPrices[s] = p / rate; });
      if (!mounted.current) return;
      const stamp = new Date().toISOString();
      setPrices(eurPrices); setFx(rate); setAsof(dt); setUpdated(stamp); setStatus("ok");
      storageSet("cockpit_cache", { prices: eurPrices, fx: rate, asof: dt, updated: stamp });
    } catch (e) {
      if (!mounted.current) return;
      setStatus(Object.keys(prices).length ? "ok" : "error");
      setErrMsg(String(e.message || e));
    }
  }, [prices]);

  useEffect(() => {
    mounted.current = true;
    // Lokale Alert-Overrides laden (vom User in der App gesetzt)
    setOverrides(storageGet("cockpit_alert_overrides", {}) || {});
    (async () => {
      // Zentrale Datei der Wahrheit laden (im Chat gepflegt, hier nur gelesen).
      try {
        const r = await fetch("/data.json", { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (mounted.current && d) {
            if (Array.isArray(d.watchlist)) setWatch(d.watchlist);
            const built = [];
            if (d.activeTrade) built.push({ ...d.activeTrade, id: "active-" + d.activeTrade.sym, status: "open" });
            if (Array.isArray(d.closedTrades)) d.closedTrades.forEach((t, i) => built.push({ ...t, id: "closed-" + i, status: "closed" }));
            if (built.length) setTrades(built);
            if (d.meta) setDataInfo(d.meta);
            if (d.meta?.eurusd) setFx(d.meta.eurusd);
          }
        }
      } catch { /* Fallback auf SEED */ }

      const cached = storageGet("cockpit_cache", null);
      if (cached) {
        setPrices(cached.prices); setFx((f) => cached.fx || f); setAsof(cached.asof); setUpdated(cached.updated);
        setStatus("ok");
      } else {
        setStatus("empty");
      }
    })();
    return () => { mounted.current = false; };
  }, []);

  const jnj = trades.find((t) => t.status === "open");

  // Overrides auf die Watchlist anwenden (lokale Eingaben schlagen data.json)
  const effectiveWatch = watch.map((w) => {
    const o = overrides[w.sym];
    return o ? { ...w, alert: o.alert, direction: o.direction, _edited: true } : w;
  });

  const saveAlert = (sym, patch) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (patch === null) delete next[sym];         // Zurücksetzen auf data.json
      else next[sym] = patch;
      storageSet("cockpit_alert_overrides", next);
      return next;
    });
  };

  const statusMeta = {
    init:    { c: C.dim,   t: "…" },
    empty:   { c: C.steel, t: "noch keine Kurse" },
    loading: { c: C.amber, t: "hole Tagesschluss…" },
    ok:      { c: fetchedToday ? C.sage : C.amber, t: fetchedToday ? "heute aktuell" : "Stand von gestern" },
    error:   { c: C.clay,  t: "Abruf fehlgeschlagen" },
  }[status] || { c: C.dim, t: "…" };

  const fmtDate = (s) => {
    if (!s) return "–";
    const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', sans-serif", padding: "26px 22px 60px" }}>
      <style>{FONTS}</style>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>

        {/* Kopf */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.steel, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 6 }}>VALUE · PULLBACK</div>
            <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Swing-Cockpit</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: statusMeta.c, fontFamily: "'IBM Plex Mono', monospace" }}>
                <Dot color={statusMeta.c} />{statusMeta.t}
              </div>
              <div style={{ fontSize: 10.5, color: C.faint, marginTop: 3, fontFamily: "'IBM Plex Mono', monospace" }}>
                Kurse {fmtDate(asof)} · EUR/USD {fx.toFixed(4)}
              </div>
            </div>
            <button onClick={load} disabled={status === "loading" || fetchedToday}
              title={fetchedToday ? "Heute bereits geholt" : "Tagesschluss abrufen"}
              style={{ background: fetchedToday ? C.panel : C.panel2, color: fetchedToday ? C.faint : C.text, border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 16px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", cursor: status === "loading" ? "wait" : fetchedToday ? "default" : "pointer" }}>
              {status === "loading" ? "…" : fetchedToday ? "✓ Heute geholt" : "↻ Kurse holen"}
            </button>
          </div>
        </header>

        {status === "error" && (
          <div style={{ background: "rgba(197,107,92,0.1)", border: `1px solid ${C.clay}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12.5, color: C.clay, fontFamily: "'IBM Plex Mono', monospace" }}>
            Kursabruf fehlgeschlagen ({errMsg}). Prüfe, ob der FMP-Connector in Claude aktiv ist, dann „Kurse holen".
          </div>
        )}
        {status === "empty" && (
          <div style={{ background: C.panel, border: `1px dashed ${C.line}`, borderRadius: 12, padding: "20px 22px", marginBottom: 20, fontSize: 13, color: C.dim, fontFamily: "'Inter', sans-serif", lineHeight: 1.6 }}>
            Noch keine Kurse geladen. Hol dir einmal am Tag den Tagesschluss über „<span style={{ color: C.text }}>Kurse holen</span>" oben rechts —
            danach zeigt das Cockpit diesen Stand, bis du am nächsten Tag erneut aktualisierst.
          </div>
        )}

        {/* Aktiver Trade */}
        {jnj && <div style={{ marginBottom: 20 }}><ActiveTrade t={jnj} price={prices[jnj.sym]} fx={fx} /></div>}

        {/* Watchlist + Journal */}
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 20 }}>
          <Panel title="Watchlist · 10 Titel"
            right={<span style={{ fontSize: 10.5, color: C.faint, fontFamily: "'IBM Plex Mono', monospace" }}>Kurs · Alert · Abstand</span>}>
            <div>{effectiveWatch.map((w) => <WatchRow key={w.sym} w={w} price={prices[w.sym]} onSave={saveAlert} />)}</div>
          </Panel>

          <Panel title="Journal · R-Bilanz">
            <div style={{ padding: 18 }}><Journal trades={trades} /></div>
          </Panel>
        </div>

        {/* Fußnote */}
        <div style={{ marginTop: 24, fontSize: 11, color: C.faint, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
          <strong style={{ color: C.dim, fontWeight: 600 }}>Ampel = Alert-Status, kein Handelssignal.</strong>{" "}
          <span style={{ color: C.amber }}>Prüfen</span> = Alert ausgelöst, Fünf-Stufen-Check im Chat fällig ·
          <span style={{ color: C.amber }}> Nahe Alert</span> ·
          <span style={{ color: C.clay }}> Korrektur</span> ·
          <span style={{ color: C.steel }}> Termin</span> ·
          <span style={{ color: C.dim }}> Beobachten</span>.
          Ob ein „Prüfen" ein echtes Setup wird, entscheidet Trend, RSI und Earnings-Nähe — nicht der Kurs allein.
          Marken auf USD-Chart hergeleitet, Anzeige in EUR (gettex). Analyse-Werkzeug, keine Anlageberatung.
        </div>
      </div>
    </div>
  );
}
