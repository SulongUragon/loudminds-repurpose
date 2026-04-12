import { useState, useEffect } from "react";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://lmc-repurpose-api.sulonguragon.workers.dev";

const SESSION_KEY = "lmc_session";
const USER_KEY = "lmc_user";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  // Check URL params on load (Google OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    const session = params.get("session");
    const name = params.get("name");
    const email = params.get("email");
    const picture = params.get("picture");

    if (googleStatus === "success" && session) {
      const userData = { name, email, picture, session };
      localStorage.setItem(SESSION_KEY, session);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (googleStatus === "error") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Verify existing session on load
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token || user) return;

    setLoading(true);
    fetch(`${WORKER_URL}/auth/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          localStorage.setItem(USER_KEY, JSON.stringify({ ...data.user, session: token }));
          setUser({ ...data.user, session: token });
        } else {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = `${WORKER_URL}/auth/google/start`;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return { user, loading, login, logout };
}

export default function LoginGate({ onLogin }) {
  const [hovering, setHovering] = useState(false);

  const login = () => {
    window.location.href = `${WORKER_URL}/auth/google/start`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      {/* Grain */}
      <svg style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.04 }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
        <rect width="100%" height="100%" filter="url(#g)"/>
      </svg>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(200,255,0,0.1)}50%{box-shadow:0 0 40px rgba(200,255,0,0.2)}}
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: 32, animation: "fadeUp 0.6s ease forwards" }}>
        <img src="/logo.png" alt="LMC" style={{ width: 100, height: 100, borderRadius: "50%", border: "2px solid #1a1a1a" }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeUp 0.6s ease 0.1s both" }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, letterSpacing: 6, color: "#fff", lineHeight: 1 }}>
          LOUDMINDS
        </div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, letterSpacing: 6, color: "#c8ff00", lineHeight: 1 }}>
          REPURPOSE
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#333", letterSpacing: 3, marginTop: 12 }}>
          AI CONTENT ENGINE FOR DARK PSYCHOLOGY CREATORS
        </div>
      </div>

      {/* Features */}
      <div style={{ display: "flex", gap: 24, marginBottom: 48, animation: "fadeUp 0.6s ease 0.2s both" }}>
        {["8 FORMATS", "PUBLISH DIRECT", "QUOTE CARDS"].map(f => (
          <div key={f} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#333", letterSpacing: 2, padding: "6px 12px", border: "1px solid #1a1a1a" }}>
            {f}
          </div>
        ))}
      </div>

      {/* Google Login Button */}
      <button
        onClick={login}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          display: "flex", alignItems: "center", gap: 14,
          background: hovering ? "#0f0f0f" : "#0a0a0a",
          border: `1px solid ${hovering ? "#c8ff00" : "#222"}`,
          color: "#fff", padding: "16px 32px",
          fontFamily: "'DM Mono',monospace", fontSize: 13,
          cursor: "pointer", letterSpacing: 2,
          transition: "all 0.2s",
          animation: "fadeUp 0.6s ease 0.3s both",
        }}
      >
        {/* Google G icon */}
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        CONTINUE WITH GOOGLE
      </button>

      <div style={{ marginTop: 24, fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#252525", letterSpacing: 1, textAlign: "center", animation: "fadeUp 0.6s ease 0.4s both" }}>
        FREE TO USE · BRING YOUR OWN API KEY
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 24, fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#1a1a1a", letterSpacing: 2 }}>
        LOUDMINDSCLUB · REPURPOSE ENGINE v2.0
      </div>
    </div>
  );
}
