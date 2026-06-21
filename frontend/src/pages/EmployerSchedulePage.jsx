import React, { useState, useEffect, useMemo } from "react";
import { api } from "../api/client";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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

const EMPTY_FORM = { start_time: "09:00", end_time: "17:00", mission: "", break_start: "12:00", break_end: "13:00", is_off: false };

export default function EmployerSchedulePage() {
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { employeeId, dayOfWeek }
  const [editingSlotId, setEditingSlotId] = useState(null); // null = nouveau créneau
  const [editForm, setEditForm] = useState(EMPTY_FORM);

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

  function findEntries(employeeId, dayOfWeek) {
    return entries.filter((e) => e.employee_id === employeeId && e.day_of_week === dayOfWeek);
  }

  function openNewSlot(employeeId, dayOfWeek) {
    setEditForm(EMPTY_FORM);
    setEditingSlotId(null);
    setEditingCell({ employeeId, dayOfWeek });
  }

  function openExistingSlot(slot) {
    setEditForm({
      start_time: slot.start_time?.slice(0, 5) || "09:00",
      end_time: slot.end_time?.slice(0, 5) || "17:00",
      mission: slot.mission || "",
      break_start: slot.break_start?.slice(0, 5) || "",
      break_end: slot.break_end?.slice(0, 5) || "",
      is_off: slot.is_off,
    });
    setEditingSlotId(slot.id);
    setEditingCell({ employeeId: slot.employee_id, dayOfWeek: slot.day_of_week });
  }

  async function handleSave() {
    if (!editingCell) return;
    const payload = {
      employee_id: editingCell.employeeId,
      week_start: weekStart,
      day_of_week: editingCell.dayOfWeek,
      start_time: editForm.is_off ? null : editForm.start_time,
      end_time: editForm.is_off ? null : editForm.end_time,
      mission: editForm.is_off ? null : editForm.mission,
      break_start: editForm.is_off || !editForm.break_start ? null : editForm.break_start,
      break_end: editForm.is_off || !editForm.break_end ? null : editForm.break_end,
      is_off: editForm.is_off,
    };
    try {
      if (editingSlotId) {
        await api.updateScheduleSlot(editingSlotId, payload);
      } else {
        await api.createScheduleSlot(payload);
      }
      closeEditor();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!editingSlotId) return;
    if (!window.confirm("Supprimer ce créneau ?")) return;
    try {
      await api.deleteScheduleSlot(editingSlotId);
      closeEditor();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeEditor() {
    setEditingCell(null);
    setEditingSlotId(null);
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

      <p style={{ fontSize: 12, color: "#8A8578", marginBottom: 14 }}>
        Clique sur un créneau pour le modifier, ou sur "+" pour en ajouter un autre le même jour.
      </p>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#8A8578", fontSize: 13 }}>Chargement…</p>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820 }}>
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
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap", verticalAlign: "top" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 100, background: emp.color, marginRight: 6 }} />
                    {emp.name}
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const dayEntries = findEntries(emp.id, dayIndex);
                    return (
                      <td key={dayIndex} style={{ ...tdStyle, verticalAlign: "top", minWidth: 120 }}>
                        {dayEntries.map((slot) => (
                          <div
                            key={slot.id}
                            onClick={() => openExistingSlot(slot)}
                            style={{
                              cursor: "pointer", padding: "5px 7px", borderRadius: 6, marginBottom: 4,
                              background: slot.is_off ? "#FEF2F2" : "#EFF6FF",
                            }}
                          >
                            {slot.is_off ? (
                              <span style={{ color: "#DC2626", fontSize: 11 }}>Repos</span>
                            ) : (
                              <>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#1F1D1A" }}>
                                  {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                                </div>
                                {slot.mission && <div style={{ fontSize: 10.5, color: "#605C52" }}>{slot.mission}</div>}
                              </>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => openNewSlot(emp.id, dayIndex)}
                          style={{ background: "none", border: "1px dashed #D8D4CC", borderRadius: 6, width: "100%", padding: "3px 0", fontSize: 11, color: "#A8A398", cursor: "pointer" }}
                        >
                          +
                        </button>
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
        <div style={overlayStyle} onClick={closeEditor}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>
              {editingSlotId ? "Modifier le créneau" : "Nouveau créneau"}
            </h3>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
              <input type="checkbox" checked={editForm.is_off} onChange={(e) => setEditForm({ ...editForm, is_off: e.target.checked })} />
              Jour de repos
            </label>
            {!editForm.is_off && (
              <>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Début</label>
                    <input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fin</label>
                    <input type="time" value={editForm.end_time} onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Mission du jour (optionnel)</label>
                  <input
                    value={editForm.mission}
                    onChange={(e) => setEditForm({ ...editForm, mission: e.target.value })}
                    placeholder="Ex: Visite client à Lyon"
                    style={{ ...inputStyle, width: 220 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Pause début</label>
                    <input type="time" value={editForm.break_start} onChange={(e) => setEditForm({ ...editForm, break_start: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pause fin</label>
                    <input type="time" value={editForm.break_end} onChange={(e) => setEditForm({ ...editForm, break_end: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              {editingSlotId ? (
                <button onClick={handleDelete} style={{ background: "none", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Supprimer
                </button>
              ) : <span />}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={closeEditor} style={{ ...navBtnStyle, padding: "8px 14px" }}>Annuler</button>
                <button onClick={handleSave} style={{ background: "#1F1D1A", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const thStyle = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#8A8578", padding: "8px 10px", borderBottom: "2px solid #E7E5E1", textTransform: "uppercase" };
const tdStyle = { fontSize: 12.5, color: "#1F1D1A", padding: "8px", borderBottom: "1px solid #F0EEE9" };
const navBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: "#605C52" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalStyle = { background: "white", borderRadius: 14, padding: 20, width: 300, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" };
const labelStyle = { fontSize: 11, fontWeight: 600, color: "#8A8578", display: "block", marginBottom: 4 };
const inputStyle = { padding: "7px 9px", borderRadius: 7, border: "1px solid #D8D4CC", fontSize: 13, fontFamily: "inherit", outline: "none", width: 90 };