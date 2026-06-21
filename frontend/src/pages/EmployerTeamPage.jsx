import React, { useState, useEffect } from "react";
import { api } from "../api/client";

export default function EmployerTeamPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const [form, setForm] = useState({ name: "", role_title: "", team: "", email: "" });

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await api.listEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.role_title || !form.team || !form.email) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const created = await api.createEmployee(form);
      setForm({ name: "", role_title: "", team: "", email: "" });
      setShowForm(false);
      setSuccessMsg(
        created.emailSent
          ? `${created.name} a été ajouté(e) et a reçu ses identifiants par email.`
          : `${created.name} a été ajouté(e), mais l'envoi de l'email a échoué — vérifie l'adresse.`
      );
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer ce salarié ? Son compte de connexion sera aussi désactivé.")) return;
    setError(null);
    try {
      await api.deleteEmployee(id);
      await loadEmployees();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Équipe</h2>
        <button
          onClick={() => { setShowForm((s) => !s); setSuccessMsg(null); }}
          style={{
            background: "#1F1D1A", color: "white", border: "none", borderRadius: 9,
            padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {showForm ? "Annuler" : "+ Ajouter un salarié"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: "#F0FDF4", color: "#16A34A", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <input
              placeholder="Nom complet"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Email du salarié"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Poste (ex: Comptable)"
              value={form.role_title}
              onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Équipe (ex: Finance)"
              value={form.team}
              onChange={(e) => setForm({ ...form, team: e.target.value })}
              style={inputStyle}
            />
          </div>
          <p style={{ fontSize: 12, color: "#8A8578", margin: "0 0 12px" }}>
            Un compte sera créé automatiquement et les identifiants envoyés par email à cette adresse.
          </p>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: "#1F1D1A", color: "white", border: "none", borderRadius: 9,
              padding: "9px 18px", fontSize: 13.5, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Création…" : "Créer le compte et envoyer l'email"}
          </button>
        </form>
      )}

      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
        {loading && <p style={{ color: "#8A8578", fontSize: 13, padding: 14 }}>Chargement…</p>}
        {!loading && employees.length === 0 && (
          <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucun salarié pour le moment.</p>
        )}
        {employees.map((emp) => (
          <div
            key={emp.id}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: "1px solid #F0EEE9" }}
          >
            <div
              style={{
                width: 34, height: 34, borderRadius: 10, background: emp.color || "#2563EB",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}
            >
              {emp.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{emp.name}</div>
              <div style={{ fontSize: 12.5, color: "#8A8578" }}>{emp.role_title} · {emp.team}{emp.email ? ` · ${emp.email}` : ""}</div>
            </div>
            <div style={{ fontSize: 12.5, color: "#8A8578" }}>
              {emp.leave_quota}j congés
            </div>
            <button
              onClick={() => handleDelete(emp.id)}
              style={{
                background: "none", border: "1px solid #FCA5A5", color: "#DC2626",
                borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const pageStyle = { maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const inputStyle = {
  padding: "9px 12px", borderRadius: 9, border: "1px solid #D8D4CC",
  fontSize: 13.5, fontFamily: "inherit", outline: "none",
};