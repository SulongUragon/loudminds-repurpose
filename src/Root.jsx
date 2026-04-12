import { useState, useEffect, useCallback } from "react";
import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://lmc-repurpose-api.sulonguragon.workers.dev";

export default function Root() {
  const [page, setPage] = useState("repurpose");
  const [pendingItem, setPendingItem] = useState(null);
  const [accounts, setAccounts] = useState({ twitter: [], linkedin: [] });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/accounts`);
      const data = await res.json();
      setAccounts(data.accounts || { twitter: [], linkedin: [] });
    } catch (e) {
      console.error("Failed to fetch accounts", e);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth")) {
      if (params.get("status") === "success") fetchAccounts();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchAccounts]);

  const handleAddToQueue = (item) => {
    setPendingItem({ ...item, _ts: Date.now() });
    setPage("dashboard");
  };

  if (page === "dashboard") {
    return (
      <Dashboard
        onNavigate={setPage}
        pendingItem={pendingItem}
        accounts={accounts}
      />
    );
  }

  return (
    <App
      onNavigate={setPage}
      onAddToQueue={handleAddToQueue}
      accounts={accounts}
      fetchAccounts={fetchAccounts}
    />
  );
}
