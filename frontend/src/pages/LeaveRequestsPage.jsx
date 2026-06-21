import React, { useState, useEffect } from "react";
import { api } from "../api/client";

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [balance, setBalance] = useState(null);
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", type: "conges", reason: "" });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.myLeaveRequests();
      setRequests(data.requests);
      setBalance(data.balance);
      setQuota(data.quota);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) return;
    setSaving(true);
    setError(null);
    try {
      await api.createLeaveRequest(form);
      setForm({ start_date: "", end_date: "", type: "conges", reason: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Mes congés</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{ background: "#1F1D1A", color: "white", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          {showForm ? "Annuler" : "+ Nouvelle demande"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {balance !== null && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1D4ED8", marginBottom: 4 }}>Solde de congés payés</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1F1D1A" }}>{balance}j <span style={{ fontSize: 13, fontWeight: 500, color: "#8A8578" }}>/ {quota}j</span></div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <label style={labelStyle}>Date de début</label>
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Date de fin</label>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="conges">Congés payés</option>
              <option value="rtt">RTT</option>
              <option value="maladie">Maladie</option>
              <option value="sans_solde">Sans solde</option>
            </select>
            <label style={labelStyle}>Motif (optionnel)</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={inputStyle} placeholder="Ex: Vacances en famille" />
          </div>
          <button type="submit" disabled={saving} style={{ background: "#1F1D1A", color: "white", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Envoi…" : "Envoyer la demande"}
          </button>
        </form>
      )}

      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
        {loading && <p style={{ color: "#8A8578", fontSize: 13, padding: 14 }}>Chargement…</p>}
        {!loading && requests.length === 0 && <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucune demande pour le moment.</p>}
        {requests.map((r) => {
          const s = statusLabel(r.status);
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: "1px solid #F0EEE9" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{formatDate(r.start_date)} → {formatDate(r.end_date)}</div>
                <div style={{ fontSize: 12.5, color: "#8A8578" }}>{r.type}{r.reason ? ` · ${r.reason}` : ""}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, padding: "4px 10px", borderRadius: 100 }}>{s.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const pageStyle = { maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#8A8578", marginTop: 2 };
const inputStyle = { padding: "9px 12px", borderRadius: 9, border: "1px solid #D8D4CC", fontSize: 13.5, fontFamily: "inherit", outline: "none" };