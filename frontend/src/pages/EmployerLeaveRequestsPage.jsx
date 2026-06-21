import React, { useState, useEffect } from "react";
import { api } from "../api/client";

export default function EmployerLeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.teamLeaveRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(id, status) {
    setActionLoadingId(id);
    setError(null);
    try {
      await api.updateLeaveRequestStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function statusLabel(status) {
    if (status === "approved") return { text: "Validé", color: "#16A34A", bg: "#F0FDF4" };
    if (status === "rejected") return { text: "Refusé", color: "#DC2626", bg: "#FEF2F2" };
    return { text: "En attente", color: "#D97706", bg: "#FFFBEB" };
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: "0 0 20px" }}>Congés de l'équipe</h2>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
        {loading && <p style={{ color: "#8A8578", fontSize: 13, padding: 14 }}>Chargement…</p>}
        {!loading && requests.length === 0 && <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucune demande pour le moment.</p>}
        {requests.map((r) => {
          const s = statusLabel(r.status);
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: "1px solid #F0EEE9" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{r.employee_name} <span style={{ fontWeight: 400, color: "#8A8578" }}>· {r.employee_team}</span></div>
                <div style={{ fontSize: 12.5, color: "#8A8578" }}>{formatDate(r.start_date)} → {formatDate(r.end_date)} · {r.type}{r.reason ? ` · ${r.reason}` : ""}</div>
              </div>
              {r.status === "pending" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => handleStatus(r.id, "approved")}
                    disabled={actionLoadingId === r.id}
                    style={{ background: "#16A34A", color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Valider
                  </button>
                  <button
                    onClick={() => handleStatus(r.id, "rejected")}
                    disabled={actionLoadingId === r.id}
                    style={{ background: "none", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Refuser
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, padding: "4px 10px", borderRadius: 100 }}>{s.text}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pageStyle = { maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };