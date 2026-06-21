import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/client";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // ramène au lundi
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

export default function EmployerSchedulePage() {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, dayOfWeek }
  const [editForm, setEditForm] = useState({ start_time: "09:00", end_time: "17:00", is_off: false });

  const weekStart = useMemo(() => toDateInputValue(weekStartDate), [weekStartDate]);

  useEffect(() => {
    load();
  }, [weekStart]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.teamSchedule(weekStart);
      setEmployees(data.employees);
      setEntries(data.entries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function findEntry(employeeId, dayOfWeek) {
    return entries.find((e) => e.employee_id === employeeId && e.day_of_week === dayOfWeek);
  }

  function openEditor(employeeId, dayOfWeek) {
    const existing = findEntry(employeeId, dayOfWeek);
    setEditForm({
      start_time: existing?.start_time?.slice(0, 5) || "09:00",
      end_time: existing?.end_time?.slice(0, 5) || "17:00",
      is_off: existing?.is_off || false,
    });
    setEditingCell({ employeeId, dayOfWeek });
  }

  async function handleSave() {
    if (!editingCell) return;
    try {
      await api.saveScheduleSlot({
        employee_id: editingCell.employeeId,
        week_start: weekStart,
        day_of_week: editingCell.dayOfWeek,
        start_time: editForm.is_off ? null : editForm.start_time,
        end_time: editForm.is_off ? null : editForm.end_time,
        is_off: editForm.is_off,
      });
      setEditingCell(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function formatWeekLabel() {
    const end = addDays(weekStartDate, 6);
    return `${weekStartDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} → ${end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`;
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: 0 }}>Planning d'équipe</h2>
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
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
            <thead>
              <tr>
                <th style={thStyle}>Salarié</th>
                {DAYS.map((d) => (
                  <th key={d} style={thStyle}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 100, background: emp.color, marginRight: 6 }} />
                    {emp.name}
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const entry = findEntry(emp.id, dayIndex);
                    return (
                      <td
                        key={dayIndex}
                        onClick={() => openEditor(emp.id, dayIndex)}
                        style={{ ...tdStyle, cursor: "pointer", textAlign: "center", background: entry?.is_off ? "#FEF2F2" : "white" }}
                      >
                        {entry?.is_off
                          ? <span style={{ color: "#DC2626", fontSize: 11.5 }}>Repos</span>
                          : entry
                          ? <span style={{ fontSize: 11.5, color: "#1F1D1A" }}>{entry.start_time?.slice(0, 5)}–{entry.end_time?.slice(0, 5)}</span>
                          : <span style={{ color: "#D8D4CC", fontSize: 11.5 }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingCell && (
        <div style={overlayStyle} onClick={() => setEditingCell(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>Modifier le créneau</h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
              <input type="checkbox" checked={editForm.is_off} onChange={(e) => setEditForm({ ...editForm, is_off: e.target.checked })} />
              Jour de repos
            </label>
            {!editForm.is_off && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Début</label>
                  <input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fin</label>
                  <input type="time" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} style={inputStyle} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditingCell(null)} style={{ ...navBtnStyle, padding: "8px 14px" }}>Annuler</button>
              <button onClick={handleSave} style={{ background: "#1F1D1A", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const thStyle = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#8A8578", padding: "8px 10px", borderBottom: "2px solid #E7E5E1", textTransform: "uppercase" };
const tdStyle = { fontSize: 12.5, color: "#1F1D1A", padding: "10px", borderBottom: "1px solid #F0EEE9" };
const navBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#605C52" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalStyle = { background: "white", borderRadius: 14, padding: 20, width: 280, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" };
const labelStyle = { fontSize: 11, fontWeight: 600, color: "#8A8578", display: "block", marginBottom: 4 };
const inputStyle = { padding: "7px 9px", borderRadius: 7, border: "1px solid #D8D4CC", fontSize: 13, fontFamily: "inherit", outline: "none", width: 90 };