import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/client";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

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

export default function MySchedulePage() {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekStart = useMemo(() => toDateInputValue(weekStartDate), [weekStartDate]);

  useEffect(() => {
    load();
  }, [weekStart]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.mySchedule(weekStart);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function findEntry(dayOfWeek) {
    return entries.find((e) => e.day_of_week === dayOfWeek);
  }

  function formatWeekLabel() {
    const end = addDays(weekStartDate, 6);
    return `${weekStartDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Mon planning</h2>
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

      {!loading && (
        <div style={{ background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 6 }}>
          {DAYS.map((dayName, dayIndex) => {
            const entry = findEntry(dayIndex);
            return (
              <div key={dayIndex} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #F0EEE9" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1F1D1A" }}>{dayName}</span>
                {entry?.is_off ? (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", padding: "4px 10px", borderRadius: 100 }}>Repos</span>
                ) : entry ? (
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#1F1D1A", background: "#F0EEE9", padding: "4px 10px", borderRadius: 100 }}>
                    {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                  </span>
                ) : (
                  <span style={{ fontSize: 12.5, color: "#A8A398" }}>Non renseigné</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 560, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const navBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#605C52" };