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

export default function EmployerDashboardPage() {
  const [employees, setEmployees] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekStart = useMemo(() => toDateInputValue(getMonday(new Date())), []);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [emps, leaves, reports, entries] = await Promise.all([
        api.listEmployees(),
        api.teamLeaveRequests(),
        api.teamWeeklyReports(weekStart),
        api.teamTimeEntries(),
      ]);
      setEmployees(emps);
      setLeaveRequests(leaves);
      setWeeklyReports(reports);
      setTimeEntries(entries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function weeklyHours(employeeId) {
    const weekStartDate = new Date(weekStart);
    const total = timeEntries
      .filter((e) => e.employee_id === employeeId && e.clock_out && new Date(e.clock_in) >= weekStartDate)
      .reduce((sum, e) => sum + (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000, 0);
    return total.toFixed(1);
  }

  function pendingLeaveCount(employeeId) {
    return leaveRequests.filter((r) => r.employee_id === employeeId && r.status === "pending").length;
  }

  function hasWeeklyReport(employeeId) {
    return weeklyReports.some((r) => r.employee_id === employeeId && r.entries?.length > 0);
  }

  const totalPending = leaveRequests.filter((r) => r.status === "pending").length;

  return (
    <div style={pageStyle}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1F1D1A", margin: "0 0 6px" }}>Vue d'ensemble</h2>
      <p style={{ fontSize: 12.5, color: "#8A8578", margin: "0 0 20px" }}>Synthèse de la semaine en cours, par salarié.</p>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={statCardStyle}>
          <div style={statValueStyle}>{employees.length}</div>
          <div style={statLabelStyle}>Salariés</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...statValueStyle, color: totalPending > 0 ? "#D97706" : "#1F1D1A" }}>{totalPending}</div>
          <div style={statLabelStyle}>Congés en attente</div>
        </div>
      </div>

      {loading && <p style={{ color: "#8A8578", fontSize: 13 }}>Chargement…</p>}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={thStyle}>Salarié</th>
                <th style={thStyle}>Heures (semaine)</th>
                <th style={thStyle}>Congés en attente</th>
                <th style={thStyle}>Bilan rempli</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const pending = pendingLeaveCount(emp.id);
                const reportDone = hasWeeklyReport(emp.id);
                return (
                  <tr key={emp.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 100, background: emp.color, marginRight: 6 }} />
                      {emp.name}
                    </td>
                    <td style={tdStyle}>{weeklyHours(emp.id)}h</td>
                    <td style={tdStyle}>
                      {pending > 0 ? (
                        <span style={{ color: "#D97706", fontWeight: 600 }}>{pending} en attente</span>
                      ) : (
                        <span style={{ color: "#A8A398" }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {reportDone ? (
                        <span style={{ color: "#16A34A", fontWeight: 600 }}>✓ Oui</span>
                      ) : (
                        <span style={{ color: "#A8A398" }}>Non</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const statCardStyle = { background: "white", border: "1px solid #E7E5E1", borderRadius: 12, padding: "14px 20px", flex: 1 };
const statValueStyle = { fontSize: 22, fontWeight: 800, color: "#1F1D1A" };
const statLabelStyle = { fontSize: 12, color: "#8A8578", marginTop: 2 };
const thStyle = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#8A8578", padding: "8px 10px", borderBottom: "2px solid #E7E5E1", textTransform: "uppercase" };
const tdStyle = { fontSize: 13, color: "#1F1D1A", padding: "10px", borderBottom: "1px solid #F0EEE9" };