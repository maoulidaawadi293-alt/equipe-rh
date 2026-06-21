import React, { useState, useEffect } from "react";
import { api } from "../api/client";

const TYPE_LABELS = {
  fiche_paie: "Fiche de paie",
  attestation: "Attestation",
  contrat: "Contrat",
  autre: "Autre",
};

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments();
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: "0 0 18px" }}>Mes documents</h2>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
        {loading && <p style={{ color: "#8A8578", fontSize: 13, padding: 14 }}>Chargement…</p>}
        {!loading && documents.length === 0 && (
          <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucun document disponible pour le moment.</p>
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
              style={{
                fontSize: 12.5, fontWeight: 600, color: "white", background: "#1F1D1A",
                textDecoration: "none", padding: "6px 14px", borderRadius: 7,
              }}
            >
              Télécharger
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

const pageStyle = { maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };