"use client";
import React from "react";

/* Assistent-Seite: bettet das veröffentlichte Claude-Artifact per iframe ein.
   SO GEHT'S:
   1. Artifact in Claude öffnen → "Publish"
   2. "Get embed code" → deine Vercel-Domain zur Allowlist hinzufügen
   3. Die dort gezeigte URL unten bei EMBED_URL eintragen
   Hinweis: Der Chat im Artifact braucht eine aktive Claude-Session im selben
   Browser. Für dich eingeloggt funktioniert er, für fremde Besucher nicht. */

const EMBED_URL = "https://claude.site/public/artifacts/37b70159-9e78-431e-b9f2-61c58d840004/embed";

const C = {
  bg: "#0E1116", panel: "#161A21", line: "#262D38",
  text: "#E6E4DF", dim: "#7C8492", faint: "#4A515C", steel: "#6E92B8",
};

export default function Assistent() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "18px 20px 13px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2.6, color: C.steel, fontFamily: "monospace", marginBottom: 5 }}>VALUE · PULLBACK</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>Assistent</h1>
        </div>
        <a href="/" style={{ fontSize: 12, fontFamily: "monospace", color: C.dim, textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 12px" }}>← Cockpit</a>
      </header>

      <main style={{ flex: 1, display: "flex" }}>
        {EMBED_URL ? (
          <iframe
            src={EMBED_URL}
            title="Swing-Assistent"
            style={{ flex: 1, width: "100%", border: "none", minHeight: "calc(100vh - 70px)" }}
            allow="clipboard-write"
          />
        ) : (
          <div style={{ margin: "40px auto", maxWidth: 520, padding: "0 22px", color: C.dim, fontSize: 13.5, lineHeight: 1.65 }}>
            <p style={{ color: C.text, fontWeight: 600, marginTop: 0 }}>Noch keine Embed-URL hinterlegt.</p>
            <p>1. Artifact in Claude öffnen und <strong style={{ color: C.text }}>Publish</strong> klicken.</p>
            <p>2. <strong style={{ color: C.text }}>Get embed code</strong> öffnen und diese Domain zur Allowlist hinzufügen.</p>
            <p>3. Die URL in <code style={{ color: C.steel }}>app/assistent/page.js</code> bei <code style={{ color: C.steel }}>EMBED_URL</code> eintragen, committen, pushen.</p>
            <p style={{ color: C.faint, fontSize: 12, marginTop: 22 }}>
              Der Chat im Artifact benötigt eine aktive Claude-Session im selben Browser.
              Veröffentlichte Artifacts sind über ihren Link öffentlich — vor dem Publish keine
              Depotgrößen, Einstandskurse oder Positionen im Artifact-Code lassen.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
