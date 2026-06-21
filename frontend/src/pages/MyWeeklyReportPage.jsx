import React, { useState, useEffect, useMemo, useRef } from "react";
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

export default function MyWeeklyReportPage() {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [report, setReport] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);

  const weekStart = useMemo(() => toDateInputValue(weekStartDate), [weekStartDate]);

  useEffect(() => {
    load();
  }, [weekStart]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.myWeeklyReport(weekStart);
      setReport(data.report);
      setEntries(data.entries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEntry(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("week_start", weekStart);
      formData.append("content", text.trim());
      if (pendingFile) formData.append("attachment", pendingFile);
      await api.addWeeklyReportEntry(formData);
      setText("");
      setPendingFile(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Mon bilan de la semaine</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekStartDate(addDays(weekStartDate, -7))} style={navBtnStyle}>←</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#605C52", minWidth: 170, textAlign: "center" }}>{formatWeekLabel()}</span>
          <button onClick={() => setWeekStartDate(addDays(weekStartDate, 7))} style={navBtnStyle}>→</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#8A8578", marginBottom: 16 }}>
        Optionnel — ajoute une ou plusieurs entrées au fil de la semaine pour résumer ce que tu as fait.
      </p>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {report?.employer_comment && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1D4ED8", marginBottom: 4 }}>💬 Commentaire de l'employeur</div>
          <div style={{ fontSize: 13, color: "#1F1D1A" }}>{report.employer_comment}</div>
        </div>
      )}

      <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        {loading && <p style={{ color: "#8A8578", fontSize: 13 }}>Chargement…</p>}
        {!loading && entries.length === 0 && <p style={{ color: "#A8A398", fontSize: 13 }}>Aucune entrée pour cette semaine pour le moment.</p>}
        {entries.map((entry) => (
          <div key={entry.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F0EEE9" }}>
            <div style={{ fontSize: 11, color: "#A8A398", marginBottom: 3 }}>{formatDate(entry.created_at)}</div>
            <div style={{ fontSize: 13.5, color: "#1F1D1A" }}>{entry.content}</div>
            {entry.attachment_url && (
              <a href={entry.attachment_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563EB", display: "block", marginTop: 4 }}>
                📎 Voir la pièce jointe
              </a>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleAddEntry} style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 16 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex : Aujourd'hui j'ai avancé sur le dossier client X, réunion d'équipe ce matin…"
          rows={3}
          style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 10 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={iconBtnStyle} title="Joindre un justificatif">
              📎 {pendingFile ? pendingFile.name.slice(0, 18) : "Joindre un fichier"}
            </button>
            <input ref={fileInputRef} type="file" onChange={(e) => setPendingFile(e.target.files[0])} style={{ display: "none" }} />
          </div>
          <button type="submit" disabled={saving || !text.trim()} style={sendBtnStyle}>
            {saving ? "Envoi…" : "Ajouter au bilan"}
          </button>
        </div>
      </form>
    </div>
  );
}

const pageStyle = { maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const navBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#605C52" };
const inputStyle = { padding: "9px 12px", borderRadius: 9, border: "1px solid #D8D4CC", fontSize: 13.5, fontFamily: "inherit", outline: "none" };
const iconBtnStyle = { background: "none", border: "1px solid #D8D4CC", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, color: "#605C52", cursor: "pointer", fontFamily: "inherit" };
const sendBtnStyle = { background: "#1F1D1A", color: "white", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };