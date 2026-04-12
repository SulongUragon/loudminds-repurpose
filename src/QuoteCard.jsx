import { useState, useRef, useEffect } from "react";

const CARD_SIZES = [
  { id: "square",    label: "Square",    w: 1080, h: 1080, platform: "IG Post" },
  { id: "story",     label: "Story",     w: 1080, h: 1920, platform: "IG Story" },
  { id: "landscape", label: "Landscape", w: 1920, h: 1080, platform: "YouTube" },
];

const STYLES = [
  { id: "acid",   label: "Acid",    bg: "#050505", accent: "#c8ff00", text: "#ffffff" },
  { id: "white",  label: "Clean",   bg: "#f5f5f0", accent: "#050505", text: "#050505" },
  { id: "red",    label: "Danger",  bg: "#0a0000", accent: "#ff2a2a", text: "#ffffff" },
  { id: "ghost",  label: "Ghost",   bg: "#0a0a0a", accent: "#ffffff", text: "#888888" },
];

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push({ text: line.trim(), x, y });
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  lines.push({ text: line.trim(), x, y });
  return lines;
}

function drawCard(canvas, quote, handle, size, style, font) {
  const ctx = canvas.getContext('2d');
  const { w, h } = size;
  canvas.width = w;
  canvas.height = h;

  const s = STYLES.find(s => s.id === style);

  // Background
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, w, h);

  // Grain texture
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i]     = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const pad = w * 0.1;
  const contentW = w - pad * 2;

  // Accent line top
  ctx.fillStyle = s.accent;
  ctx.fillRect(pad, pad * 0.8, w * 0.08, 4);

  // Quote mark
  ctx.fillStyle = s.accent;
  ctx.globalAlpha = 0.15;
  ctx.font = `bold ${w * 0.35}px Georgia, serif`;
  ctx.textAlign = 'left';
  ctx.fillText('"', pad * 0.6, h * 0.55);
  ctx.globalAlpha = 1;

  // Quote text
  const fontSize = w * 0.058;
  const lineHeight = fontSize * 1.5;
  ctx.fillStyle = s.text;
  ctx.font = `${fontSize}px 'Bebas Neue', Impact, sans-serif`;
  ctx.textAlign = 'left';
  ctx.letterSpacing = '2px';

  // Center the text block vertically
  const testLines = wrapText(ctx, quote.toUpperCase(), 0, 0, contentW, lineHeight);
  const totalTextH = testLines.length * lineHeight;
  const startY = (h - totalTextH) / 2;

  const lines = wrapText(ctx, quote.toUpperCase(), pad, startY, contentW, lineHeight);
  lines.forEach(line => {
    ctx.fillText(line.text, line.x, line.y);
  });

  // Bottom accent line
  ctx.fillStyle = s.accent;
  ctx.fillRect(pad, h - pad * 0.8 - 4, w * 0.08, 4);

  // Handle
  if (handle) {
    ctx.fillStyle = s.accent;
    ctx.font = `${w * 0.028}px 'DM Mono', monospace, sans-serif`;
    ctx.textAlign = 'left';
    ctx.letterSpacing = '3px';
    ctx.fillText(`@${handle.replace('@', '')}`, pad, h - pad * 0.6);
  }

  // Watermark
  ctx.fillStyle = s.accent;
  ctx.globalAlpha = 0.3;
  ctx.font = `${w * 0.022}px 'Bebas Neue', Impact, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('LOUDMINDSCLUB', w - pad, h - pad * 0.6);
  ctx.globalAlpha = 1;
}

export default function QuoteCard({ prefillText = '' }) {
  const canvasRef = useRef(null);
  const [quote, setQuote] = useState(prefillText);
  const [handle, setHandle] = useState('loudminds.club');
  const [sizeId, setSizeId] = useState('square');
  const [styleId, setStyleId] = useState('acid');
  const [rendered, setRendered] = useState(false);

  const size = CARD_SIZES.find(s => s.id === sizeId);
  const scale = 320 / size.w;
  const previewH = size.h * scale;

  const render = () => {
    if (!quote.trim()) return;
    const canvas = canvasRef.current;
    drawCard(canvas, quote, handle, size, styleId);
    setRendered(true);
  };

  const download = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `lmc-quote-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    if (prefillText) setQuote(prefillText);
  }, [prefillText]);

  return (
    <div style={{ background: "#080808", border: "1px solid #141414", padding: "24px" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 11, color: "#c8ff00", letterSpacing: 3, marginBottom: 20 }}>
        QUOTE CARD GENERATOR
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Quote text */}
          <div>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#333", letterSpacing: 2, display: "block", marginBottom: 8 }}>QUOTE TEXT</label>
            <textarea
              value={quote}
              onChange={e => setQuote(e.target.value)}
              placeholder="Type your quote here..."
              style={{ width: "100%", minHeight: 100, background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ccc", padding: "12px", fontFamily: "'DM Mono',monospace", fontSize: 12, lineHeight: 1.7, resize: "vertical" }}
            />
            <div style={{ textAlign: "right", color: "#1e1e1e", fontSize: 10, fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{quote.length} CHARS</div>
          </div>

          {/* Handle */}
          <div>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#333", letterSpacing: 2, display: "block", marginBottom: 8 }}>HANDLE</label>
            <input
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="loudminds.club"
              style={{ width: "100%", background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#ccc", padding: "8px 12px", fontFamily: "'DM Mono',monospace", fontSize: 12 }}
            />
          </div>

          {/* Size */}
          <div>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#333", letterSpacing: 2, display: "block", marginBottom: 8 }}>SIZE</label>
            <div style={{ display: "flex", gap: 8 }}>
              {CARD_SIZES.map(s => (
                <button key={s.id} onClick={() => setSizeId(s.id)}
                  style={{ flex: 1, background: sizeId === s.id ? "#0c120c" : "none", border: `1px solid ${sizeId === s.id ? "#c8ff00" : "#1e1e1e"}`, color: sizeId === s.id ? "#c8ff00" : "#444", padding: "8px", fontFamily: "'DM Mono',monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}>
                  {s.label}<br/>
                  <span style={{ fontSize: 9, opacity: 0.6 }}>{s.platform}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#333", letterSpacing: 2, display: "block", marginBottom: 8 }}>STYLE</label>
            <div style={{ display: "flex", gap: 8 }}>
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyleId(s.id)}
                  style={{ flex: 1, background: s.bg, border: `2px solid ${styleId === s.id ? s.accent : "#1e1e1e"}`, color: s.accent, padding: "8px", fontFamily: "'DM Mono',monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1, transition: "all 0.15s" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={render} disabled={!quote.trim()}
              style={{ flex: 1, background: "#c8ff00", border: "none", color: "#000", padding: "12px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 3, cursor: "pointer", opacity: !quote.trim() ? 0.4 : 1 }}>
              GENERATE CARD
            </button>
            {rendered && (
              <button onClick={download}
                style={{ background: "none", border: "1px solid #c8ff00", color: "#c8ff00", padding: "12px 20px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 2, cursor: "pointer" }}>
                ↓ PNG
              </button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 8 }}>PREVIEW</div>
          <div style={{ width: 320, height: previewH, background: "#0a0a0a", border: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {rendered ? (
              <canvas ref={canvasRef} style={{ width: 320, height: previewH, display: "block" }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#1e1e1e", letterSpacing: 1 }}>CLICK GENERATE</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 8, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#1e1e1e", letterSpacing: 1 }}>
            {size.w} × {size.h}px · {size.platform}
          </div>
        </div>
      </div>
    </div>
  );
}
