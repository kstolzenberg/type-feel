import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Square, Download, List, MoveHorizontal, Circle, ChevronLeft, ChevronRight } from "lucide-react";

/* ---------------------------------------------------------------------
   DESIGN TOKENS
   Swiss minimalist system: paper/ink/signal-red only. One accent, spent
   entirely on the record control, active states, and the quadrant plot.
--------------------------------------------------------------------- */
const COLOR = {
  paper: "#FFFFFF",
  ink: "#141414",
  signal: "#D5001C",
  graphite: "#6B6B66",
  hairline: "#DAD9D3",
  hairlineStrong: "#B9B8B1",
};
const SANS = '"Google Sans Flex", system-ui, sans-serif';

/* ---------------------------------------------------------------------
   NRC-VAD-STYLE LEXICON (demo subset — real build uses the full ~20k
   word published lexicon). Values approximate published VAD norms.
--------------------------------------------------------------------- */
const VAD_LEXICON = {
  happy: [0.9, 0.55], joy: [0.92, 0.65], joyful: [0.9, 0.6], thrilled: [0.88, 0.9],
  excited: [0.82, 0.85], delighted: [0.87, 0.6], elated: [0.88, 0.75], ecstatic: [0.9, 0.92],
  cheerful: [0.78, 0.55], glad: [0.72, 0.4], content: [0.68, -0.2], satisfied: [0.65, -0.15],
  calm: [0.55, -0.7], relaxed: [0.6, -0.75], peaceful: [0.6, -0.7], serene: [0.62, -0.72],
  grateful: [0.75, 0.2], hopeful: [0.68, 0.35], proud: [0.75, 0.45], loved: [0.85, 0.4],
  love: [0.88, 0.5], inspired: [0.78, 0.6], motivated: [0.72, 0.6], confident: [0.72, 0.4],
  optimistic: [0.7, 0.35], curious: [0.55, 0.4], amazed: [0.75, 0.7], amazing: [0.8, 0.55],
  great: [0.75, 0.45], good: [0.6, 0.15], wonderful: [0.85, 0.5], awesome: [0.82, 0.6],
  fine: [0.15, -0.15], okay: [0.1, -0.1], alright: [0.12, -0.1],
  sad: [-0.75, -0.35], unhappy: [-0.7, -0.2], depressed: [-0.85, -0.5], miserable: [-0.85, -0.3],
  gloomy: [-0.6, -0.4], melancholy: [-0.5, -0.35], lonely: [-0.65, -0.4], hopeless: [-0.85, -0.45],
  disappointed: [-0.6, -0.1], heartbroken: [-0.85, 0.1],
  angry: [-0.7, 0.75], furious: [-0.8, 0.9], mad: [-0.6, 0.65], enraged: [-0.85, 0.92],
  frustrated: [-0.55, 0.55], irritated: [-0.5, 0.5], annoyed: [-0.45, 0.45],
  anxious: [-0.5, 0.7], nervous: [-0.45, 0.65], worried: [-0.5, 0.55], stressed: [-0.6, 0.7],
  overwhelmed: [-0.6, 0.75], scared: [-0.7, 0.75], afraid: [-0.65, 0.7], terrified: [-0.8, 0.9],
  panicked: [-0.7, 0.9], restless: [-0.3, 0.6],
  tired: [-0.3, -0.6], exhausted: [-0.45, -0.65], drained: [-0.5, -0.6], sluggish: [-0.3, -0.65],
  bored: [-0.4, -0.5], dull: [-0.3, -0.55],
  bad: [-0.6, 0.1], terrible: [-0.8, 0.3], awful: [-0.8, 0.35], horrible: [-0.82, 0.4],
  embarrassed: [-0.45, 0.4], ashamed: [-0.6, 0.35], guilty: [-0.55, 0.3], jealous: [-0.4, 0.45],
  nostalgic: [0.15, -0.1], surprised: [0.3, 0.7], confused: [-0.25, 0.35], numb: [-0.2, -0.6],
};
const NEGATIONS = new Set(["not", "no", "never", "dont", "don't", "isnt", "isn't", "wasnt", "wasn't", "cant", "can't", "wont", "won't"]);

function classifyEntry(text) {
  const tokens = (text.toLowerCase().match(/[a-z']+/g) || []);
  const scores = [];
  tokens.forEach((word, i) => {
    const hit = VAD_LEXICON[word];
    if (!hit) return;
    const prev = tokens[i - 1];
    const negated = prev && NEGATIONS.has(prev);
    scores.push(negated ? [-hit[0], hit[1]] : hit);
  });
  if (scores.length === 0) return { valence: 0, arousal: 0 };
  const valence = scores.reduce((s, [v]) => s + v, 0) / scores.length;
  const arousal = scores.reduce((s, [, a]) => s + a, 0) / scores.length;
  return { valence: clamp(valence, -1, 1), arousal: clamp(arousal, -1, 1) };
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const norm = (x) => (clamp(x, -1, 1) + 1) / 2; // -1..1 -> 0..1
const lerp = (a, b, t) => a + (b - a) * t;

function fontVars(valence, arousal) {
  const wght = Math.round(lerp(250, 850, norm(valence)));
  const opsz = Math.round(lerp(12, 120, norm(valence)));
  const wdth = Math.round(lerp(150, 55, norm(arousal))); // high arousal -> narrow
  const fontSize = Math.round(lerp(14, 56, norm(valence)));
  return {
    fontFamily: SANS,
    fontVariationSettings: `"wght" ${wght}, "wdth" ${wdth}, "opsz" ${opsz}`,
    fontSize: `${fontSize}px`,
    lineHeight: 1.15,
    letterSpacing: arousal > 0.15 ? "-0.01em" : "0em",
    transition: "font-variation-settings 220ms ease, font-size 220ms ease",
    color: COLOR.ink,
  };
}

function formatDateShort(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}`;
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildArchiveHTML(entries) {
  const rows = entries.map((e) => {
    const f = fontVars(e.valence, e.arousal);
    return `<div class="entry">
      <div class="text" style="font-variation-settings:${f.fontVariationSettings}; font-size:${f.fontSize};">${escapeHtml(e.text)}</div>
      <div class="meta">${new Date(e.createdAt).toLocaleString()} — V ${e.valence.toFixed(2)} / A ${e.arousal.toFixed(2)}</div>
    </div>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mood Journal Archive</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght@6..144,25..151,1..1000&display=swap" rel="stylesheet">
<style>
  body{background:${COLOR.paper};color:${COLOR.ink};font-family:${SANS};max-width:720px;margin:64px auto;padding:0 24px 96px;}
  h1{font-family:"Google Sans Flex",sans-serif;font-weight:800;font-size:28px;letter-spacing:-0.01em;margin-bottom:4px;}
  .sub{color:${COLOR.graphite};font-size:12px;margin-bottom:48px;}
  .entry{padding:28px 0;border-bottom:1px solid ${COLOR.hairline};}
  .text{font-family:"Google Sans Flex",sans-serif;margin-bottom:10px;}
  .meta{font-size:11px;color:${COLOR.graphite};letter-spacing:0.03em;}
</style></head>
<body>
  <h1>Mood Journal Archive</h1>
  <div class="sub">Exported ${new Date().toLocaleString()} · ${entries.length} entries</div>
  ${rows || '<div class="meta">No entries yet.</div>'}
</body></html>`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------------------------------------------------------------
   ENTRY CARDS
--------------------------------------------------------------------- */
function EntryCardVertical({ entry, index }) {
  const style = fontVars(entry.valence, entry.arousal);
  return (
    <div style={{ padding: "18px 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: SANS, fontSize: 11, color: COLOR.graphite }}>
          {formatDateShort(entry.createdAt)}
        </span>
        <span style={{ fontFamily: SANS, fontSize: 12, color: COLOR.graphite }}>{formatTimestamp(entry.createdAt)}</span>
      </div>
      <div style={style}>{entry.text}</div>
    </div>
  );
}

function EntryColumnTimeline({ entry, x }) {
  const style = fontVars(entry.valence, entry.arousal);
  const elevation = Math.round(lerp(10, 220, norm(entry.valence))); // higher = more positive
  return (
    <div style={{ position: "absolute", left: x, bottom: SPINE_Y, transform: "translateX(-50%)" }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1, height: elevation, background: COLOR.hairlineStrong, transform: "translateX(-50%)" }} />
      <div style={{ position: "absolute", left: 0, bottom: elevation - 3, width: 6, height: 6, borderRadius: "50%", background: COLOR.signal, transform: "translateX(-50%)" }} />
      <div style={{
        position: "absolute", left: 0, bottom: elevation + 12, width: 200, transform: "translateX(-50%)",
        ...style, fontSize: `${Math.min(38, parseInt(style.fontSize))}px`,
      }}>
        {entry.text}
      </div>
      <div style={{ position: "absolute", left: 0, bottom: -28, width: 200, transform: "translateX(-50%)", textAlign: "center", fontFamily: SANS, fontSize: 11, color: COLOR.graphite }}>
        {formatTimestamp(entry.createdAt)}
      </div>
    </div>
  );
}
const SPINE_Y = 70;
const SLOT_WIDTH = 240;

/* ---------------------------------------------------------------------
   MAIN APP
--------------------------------------------------------------------- */
export default function MoodJournal() {
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState(null);
  const [viewMode, setViewMode] = useState("vertical");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastExportedAt, setLastExportedAt] = useState(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const recognitionRef = useRef(null);
  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // load google sans flex
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght@6..144,25..151,1..1000&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // hydrate from persistent storage
  useEffect(() => {
    (async () => {
      try {
        const e = await window.storage?.get("mood-journal-entries");
        if (e?.value) setEntries(JSON.parse(e.value));
      } catch (_) {}
      try {
        const t = await window.storage?.get("mood-journal-last-export");
        if (t?.value) setLastExportedAt(t.value);
      } catch (_) {}
      setHydrated(true);
    })();
  }, []);

  const persistEntries = useCallback(async (next) => {
    try { await window.storage?.set("mood-journal-entries", JSON.stringify(next)); } catch (_) {}
  }, []);

  const addEntry = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const { valence, arousal } = classifyEntry(trimmed);
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, text: trimmed, createdAt: new Date().toISOString(), valence, arousal };
    setEntries((prev) => {
      const next = [entry, ...prev];
      persistEntries(next);
      return next;
    });
    setDraft("");
    setInterim("");
  }, [persistEntries]);

  const toggleRecording = () => {
    if (!speechSupported) return;
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setInterim(text);
    };
    rec.onend = () => {
      setIsRecording(false);
      setInterim((current) => { if (current.trim()) addEntry(current); return ""; });
    };
    rec.onerror = (ev) => {
      setIsRecording(false);
      setMicError(ev.error === "not-allowed" || ev.error === "service-not-allowed"
        ? "Mic access blocked in this preview"
        : `Mic error: ${ev.error}`);
    };
    recognitionRef.current = rec;
    setMicError(null);
    try {
      rec.start();
      setIsRecording(true);
    } catch (_) {
      setMicError("Couldn't start microphone");
    }
  };

  const exportJSON = () => {
    downloadBlob(JSON.stringify(entries, null, 2), `mood-journal-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    markExported();
  };
  const exportHTML = () => {
    downloadBlob(buildArchiveHTML(entries), `mood-journal-${new Date().toISOString().slice(0, 10)}.html`, "text/html");
    markExported();
  };
  const markExported = () => {
    const now = new Date().toISOString();
    setLastExportedAt(now);
    setNudgeDismissed(false);
    try { window.storage?.set("mood-journal-last-export", now); } catch (_) {}
  };

  const daysSinceExport = lastExportedAt ? (Date.now() - new Date(lastExportedAt).getTime()) / 86400000 : Infinity;
  const showNudge = hydrated && entries.length > 0 && daysSinceExport >= 7 && !nudgeDismissed;

  return (
    <div style={{ background: COLOR.paper, height: 640, fontFamily: SANS, color: COLOR.ink, display: "flex", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? 272 : 0,
        flexShrink: 0,
        borderRight: sidebarOpen ? `1px solid ${COLOR.hairline}` : "none",
        padding: sidebarOpen ? "32px 24px" : "32px 0",
        display: "flex", flexDirection: "column",
        height: 640, overflow: "hidden",
        transition: "width 200ms ease, padding 200ms ease",
      }}>
        <div style={{ width: 224, flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.01em" }}>The Shape of Today</div>
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 12, color: COLOR.graphite, marginTop: 2 }}>
              A Visual Mood Journal
            </div>
          </div>

          <div style={{ height: 1, background: COLOR.hairline, margin: "24px 0" }} />

          {/* VIEW TOGGLE */}
          <div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.graphite, marginBottom: 10 }}>View</div>
            <div style={{ display: "flex", gap: 16 }}>
              <button onClick={() => setViewMode("vertical")} style={tabStyle(viewMode === "vertical")}>
                <List size={13} /> List
              </button>
              <button onClick={() => setViewMode("timeline")} style={tabStyle(viewMode === "timeline")}>
                <MoveHorizontal size={13} /> Timeline
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: COLOR.hairline, margin: "16px 0" }} />

          {/* EXPORT */}
          <div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: COLOR.graphite, marginBottom: 10 }}>Export</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={exportJSON} disabled={entries.length === 0} style={exportBtnStyle(entries.length > 0)}>
                <Download size={12} /> Download JSON
              </button>
              <button onClick={exportHTML} disabled={entries.length === 0} style={exportBtnStyle(entries.length > 0)}>
                <Download size={12} /> Download HTML
              </button>
              <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.graphite, marginTop: 2 }}>
                {lastExportedAt ? `Last backup ${formatTimestamp(lastExportedAt)}` : "No backup yet"}
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* BACKUP NUDGE */}
          {showNudge && (
            <div style={{ border: `1px solid ${COLOR.signal}`, padding: "10px 12px", marginBottom: 16 }}>
              <div style={{ fontSize: 12, marginBottom: 6 }}>It's been a week — back up your journal?</div>
              <button onClick={() => setNudgeDismissed(true)} style={{ fontFamily: SANS, fontSize: 11, color: COLOR.graphite, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                dismiss
              </button>
            </div>
          )}

          <div style={{ fontFamily: SANS, fontSize: 11, color: COLOR.graphite }}>
            made by{" "}
            <a
              href="https://github.com/kstolzenberg"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLOR.graphite, textDecoration: "underline" }}
            >
              karen
            </a>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, height: 640, position: "relative", overflow: "hidden" }}>
        {/* SIDEBAR TOGGLE */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          style={{
            position: "absolute", top: 20, left: 20, zIndex: 5,
            width: 32, height: 32, borderRadius: "50%",
            border: `1px solid ${COLOR.hairline}`, background: COLOR.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(20, 20, 20, 0.06)",
          }}
        >
          {sidebarOpen ? <ChevronLeft size={15} color={COLOR.graphite} /> : <ChevronRight size={15} color={COLOR.graphite} />}
        </button>

        {/* SCROLLING HISTORY */}
        <div style={{
          position: "absolute", inset: 0,
          overflowY: viewMode === "vertical" ? "auto" : "hidden",
          padding: viewMode === "vertical" ? "72px 48px 148px" : "0",
        }}>
          {entries.length === 0 ? (
            <div style={{ height: viewMode === "vertical" ? 420 : "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: COLOR.graphite, textAlign: "center" }}>
              <Circle size={16} style={{ marginBottom: 12 }} />
              <div style={{ fontFamily: SANS, fontSize: 13, color: COLOR.graphite }}>No Entries Yet</div>
              <div style={{ fontSize: 13, marginTop: 6, maxWidth: 260 }}>Speak or type a brief thought to begin.</div>
            </div>
          ) : viewMode === "vertical" ? (
            <div style={{ maxWidth: 640 }}>
              {entries.map((e, i) => (
                <EntryCardVertical key={e.id} entry={e} index={entries.length - 1 - i} />
              ))}
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", overflowX: "auto", padding: "0 40px" }}>
              <div style={{ position: "relative", height: 480, width: [...entries].length * SLOT_WIDTH, flexShrink: 0 }}>
                <div style={{ position: "absolute", bottom: SPINE_Y, left: 0, right: 0, height: 1, background: COLOR.hairlineStrong }} />
                {[...entries].reverse().map((e, i) => (
                  <EntryColumnTimeline key={e.id} entry={e} x={i * SLOT_WIDTH + SLOT_WIDTH / 2} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FLOATING CAPTURE BAR — sticky to the viewport, scroll moves underneath */}
        <div style={{
          position: "absolute", left: "50%", bottom: 16, zIndex: 10,
          transform: "translateX(-50%)",
          width: "40vw", minWidth: 360,
          background: COLOR.paper,
          padding: "18px 32px 18px 16px",
          borderRadius: 999,
          boxShadow: "0 -6px 24px rgba(20, 20, 20, 0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%" }}>
            <button
              onClick={toggleRecording}
              disabled={!speechSupported}
              style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: isRecording ? COLOR.signal : "transparent",
                border: `1.5px solid ${isRecording ? COLOR.signal : COLOR.ink}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: speechSupported ? "pointer" : "not-allowed",
                opacity: speechSupported ? 1 : 0.35,
                transition: "all 150ms ease",
              }}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <Square size={15} color={COLOR.paper} fill={COLOR.paper} /> : <Mic size={17} color={COLOR.ink} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEntry(draft); } }}
                placeholder="Speak, or type a thought…"
                style={{
                  width: "100%", border: "none", borderBottom: `1px solid ${COLOR.hairlineStrong}`,
                  background: "transparent", fontFamily: SANS, fontSize: 14, padding: "6px 0", outline: "none",
                }}
              />
              {(isRecording || micError) && (
                <div style={{ fontFamily: SANS, fontSize: 12, color: micError ? COLOR.signal : COLOR.graphite, marginTop: 6 }}>
                  {micError || (interim || "Listening…")}
                </div>
              )}
            </div>

            <button
              onClick={() => addEntry(draft)}
              disabled={!draft.trim()}
              style={{
                fontFamily: SANS, fontSize: 12, flexShrink: 0,
                background: "none", border: "none", padding: "0 0 6px 0",
                color: draft.trim() ? COLOR.ink : COLOR.hairlineStrong,
                cursor: draft.trim() ? "pointer" : "default",
              }}
            >
              Add
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function tabStyle(active) {
  return {
    display: "flex", alignItems: "center", gap: 5,
    fontFamily: SANS, fontSize: 12,
    background: "none", border: "none", cursor: "pointer", padding: "0 0 4px 0",
    color: active ? COLOR.ink : COLOR.graphite,
    borderBottom: `1.5px solid ${active ? COLOR.signal : "transparent"}`,
  };
}
function exportBtnStyle(enabled) {
  return {
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: SANS, fontSize: 12,
    background: "none", border: "none", padding: 0, textAlign: "left",
    color: enabled ? COLOR.ink : COLOR.hairlineStrong,
    cursor: enabled ? "pointer" : "default",
  };
}
