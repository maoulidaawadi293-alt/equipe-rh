import React, { useState, useEffect } from "react";
import { api } from "../api/client";

const TYPE_LABELS = {
  fiche_paie: "Fiche de paie",
  attestation: "Attestation",
  contrat: "Contrat",
  autre: "Autre",
};

export default function EmployerDocumentsPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", type: "fiche_paie", file: null });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) loadDocuments();
  }, [selectedEmployeeId]);

  async function loadEmployees() {
    try {
      const data = await api.listEmployees();
      setEmployees(data);
      if (data.length > 0) setSelectedEmployeeId(data[0].id);
      else setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments(selectedEmployeeId);
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!form.title || !form.file || !selectedEmployeeId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("employee_id", selectedEmployeeId);
      formData.append("title", form.title);
      formData.append("type", form.type);
      formData.append("file", form.file);
      await api.uploadDocument(formData);
      setForm({ title: "", type: "fiche_paie", file: null });
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await api.deleteDocument(id);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: "0 0 18px" }}>Documents</h2>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {employees.length === 0 ? (
        <p style={{ color: "#A8A398", fontSize: 13 }}>Ajoute d'abord un salarié dans l'onglet Équipe.</p>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Salarié</label>
            <select
              value={selectedEmployeeId || ""}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
              style={{ ...inputStyle, width: 240 }}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleUpload} style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 18, marginBottom: 20 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 700, margin: "0 0 12px" }}>Ajouter un document pour {selectedEmployee?.name}</h3>
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <input
                placeholder="Titre (ex: Fiche de paie - Juin 2026)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={inputStyle}
              />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="fiche_paie">Fiche de paie</option>
                <option value="attestation">Attestation</option>
                <option value="contrat">Contrat</option>
                <option value="autre">Autre</option>
              </select>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              style={{
                background: "#1F1D1A", color: "white", border: "none", borderRadius: 9,
                padding: "9px 18px", fontSize: 13.5, fontWeight: 600,
                cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Envoi…" : "Envoyer le document"}
            </button>
          </form>

          <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
            {loading && <p style={{ color: "#8A8578", fontSize: 13, padding: 14 }}>Chargement…</p>}
            {!loading && documents.length === 0 && (
              <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucun document pour ce salarié.</p>
            )}
            {documents.map((doc) => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", borderBottom: "1px solid #F0EEE9" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: "#8A8578" }}>{TYPE_LABELS[doc.type]} · {formatDate(doc.created_at)}</div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{ fontSize: 12.5, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}
                >
                  Télécharger
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  style={{ background: "none", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#8A8578", display: "block", marginBottom: 5 };
const inputStyle = { padding: "9px 12px", borderRadius: 9, border: "1px solid #D8D4CC", fontSize: 13.5, fontFamily: "inherit", outline: "none" };