import React, { useState, useEffect } from "react";
import { api } from "../api/client";

export default function TimeclockPage({ user }) {
  const [entries, setEntries] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [openEntry, setOpenEntry] = useState(null); // pointage d'arrivée sans sortie
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const data = await api.myTimeEntries();
      setEntries(data);
      // Un pointage avec clock_out null = salarié en poste
      const open = data.find((e) => !e.clock_out);
      setOpenEntry(open || null);
      setIsClockedIn(!!open);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClockIn() {
    setError(null);
    setActionLoading(true);
    try {
      await api.clockIn();
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClockOut() {
    setError(null);
    setActionLoading(true);
    try {
      await api.clockOut();
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
  }

  function hoursWorked(entry) {
    if (!entry.clock_out) return "En cours…";
    const diff = (new Date(entry.clock_out) - new Date(entry.clock_in)) / 3600000;
    return `${diff.toFixed(1)}h`;
  }

  if (loading) return <div style={pageStyle}><p style={{ color: "#8A8578" }}>Chargement…</p></div>;

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: "0 0 6px" }}>Pointage</h2>
      <p style={{ fontSize: 13.5, color: "#8A8578", margin: "0 0 20px" }}>Bonjour {user.email} — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Carte de statut */}
      <div style={{ background: isClockedIn ? "#EFF6FF" : "white", border: `1px solid ${isClockedIn ? "#BFDBFE" : "#E7E5E1"}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#8A8578", marginBottom: 6 }}>Statut actuel</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#1F1D1A", marginBottom: 16 }}>
          {isClockedIn
            ? `En poste depuis ${formatTime(openEntry?.clock_in)}`
            : "Pas encore pointé aujourd'hui"}
        </div>
        <button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={actionLoading}
          style={{
            background: isClockedIn ? "#DC2626" : "#1F1D1A",
            color: "white", border: "none", borderRadius: 9,
            padding: "10px 20px", fontSize: 14, fontWeight: 600,
            cursor: actionLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: actionLoading ? 0.6 : 1,
          }}
        >
          {actionLoading ? "…" : isClockedIn ? "Pointer la sortie" : "Pointer l'arrivée"}
        </button>
      </div>

      {/* Historique */}
      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1F1D1A", margin: "0 0 14px" }}>Historique récent</h3>
        {entries.length === 0 && <p style={{ color: "#A8A398", fontSize: 13 }}>Aucun pointage enregistré pour le moment.</p>}
        {entries.map((entry) => (
          <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F0EEE9" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{formatDate(entry.clock_in)}</div>
              <div style={{ fontSize: 12.5, color: "#8A8578" }}>
                {formatTime(entry.clock_in)} → {formatTime(entry.clock_out)}
              </div>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: entry.clock_out ? "#1F1D1A" : "#D97706" }}>
              {hoursWorked(entry)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const pageStyle = { maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
