import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/client";

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export default function EmployerWeeklyReportsPage() {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({}); // { reportId: text }
  const [savingId, setSavingId] = useState(null);

  const weekStart = useMemo(() => toDateInputValue(weekStartDate), [weekStartDate]);

  useEffect(() => {
    load();
  }, [weekStart]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.teamWeeklyReports(weekStart);
      setReports(data);
      const drafts = {};
      data.forEach((r) => { drafts[r.id] = r.employer_comment || ""; });
      setCommentDrafts(drafts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveComment(reportId) {
    setSavingId(reportId);
    setError(null);
    try {
      await api.commentWeeklyReport(reportId, commentDrafts[reportId] || "");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  function formatWeekLabel() {
    const end = addDays(weekStartDate, 6);
    return `${weekStartDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Bilans de la semaine</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekStartDate(addDays(weekStartDate, -7))} style={navBtnStyle}>←</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#605C52", minWidth: 170, textAlign: "center" }}>{formatWeekLabel()}</span>
          <button onClick={() => setWeekStartDate(addDays(weekStartDate, 7))} style={navBtnStyle}>→</button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#8A8578", fontSize: 13 }}>Chargement…</p>}
      {!loading && reports.length === 0 && (
        <p style={{ color: "#A8A398", fontSize: 13 }}>Aucun bilan rempli par l'équipe pour cette semaine.</p>
      )}

      {reports.map((report) => (
        <div key={report.id} style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "#1F1D1A", margin: "0 0 12px" }}>{report.employee_name}</h3>

          {report.entries.length === 0 && <p style={{ color: "#A8A398", fontSize: 12.5 }}>Aucune entrée.</p>}
          {report.entries.map((entry) => (
            <div key={entry.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #F0EEE9" }}>
              <div style={{ fontSize: 11, color: "#A8A398", marginBottom: 3 }}>{formatDate(entry.created_at)}</div>
              <div style={{ fontSize: 13, color: "#1F1D1A" }}>{entry.content}</div>
              {entry.attachment_url && (
                <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563EB", display: "block", marginTop: 4 }}>
                  📎 Voir la pièce jointe
                </a>
              )}
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: "#8A8578", display: "block", marginBottom: 5 }}>Ton commentaire</label>
            <textarea
              value={commentDrafts[report.id] || ""}
              onChange={(e) => setCommentDrafts({ ...commentDrafts, [report.id]: e.target.value })}
              rows={2}
              placeholder="Ex : Bien reçu, merci pour le travail cette semaine."
              style={{ width: "100%", padding: "8px 11px", borderRadius: 9, border: "1px solid #D8D4CC", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 8 }}
            />
            <button
              onClick={() => handleSaveComment(report.id)}
              disabled={savingId === report.id}
              style={{ background: "#1F1D1A", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              {savingId === report.id ? "Enregistrement…" : "Enregistrer le commentaire"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const pageStyle = { maxWidth: 700, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const navBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#605C52" };