import { useState, useEffect, useCallback } from "react";
import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import LoginGate, { useAuth } from "./LoginGate.jsx";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://lmc-repurpose-api.sulonguragon.workers.dev";

export default function Root() {
  const { user, loading, login, logout } = useAuth();
  const [page, setPage] = useState("repurpose");
  const [pendingItem, setPendingItem] = useState(null);
  const [accounts, setAccounts] = useState({ twitter: [], linkedin: [] });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/accounts`);
      const data = await res.json();
      setAccounts(data.accounts || { twitter: [], linkedin: [] });
    } catch (e) {}
  }, []);

  useEffect(() => { if (user) fetchAccounts(); }, [user, fetchAccounts]);

  const handleAddToQueue = (item) => {
    setPendingItem({ ...item, _ts: Date.now() });
    setPage("dashboard");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid #c8ff00", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <LoginGate />;

  if (page === "dashboard") {
    return <Dashboard onNavigate={setPage} pendingItem={pendingItem} accounts={accounts} user={user} onLogout={logout}/>;
  }

  return <App onNavigate={setPage} onAddToQueue={handleAddToQueue} accounts={accounts} fetchAccounts={fetchAccounts} user={user} onLogout={logout}/>;
}
