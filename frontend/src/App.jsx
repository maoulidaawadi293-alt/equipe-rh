import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import TimeclockPage from "./pages/TimeclockPage";
import EmployerTeamPage from "./pages/EmployerTeamPage";
import LeaveRequestsPage from "./pages/LeaveRequestsPage";
import EmployerLeaveRequestsPage from "./pages/EmployerLeaveRequestsPage";
import EmployerSchedulePage from "./pages/EmployerSchedulePage";
import MySchedulePage from "./pages/MySchedulePage";
import EmployerDocumentsPage from "./pages/EmployerDocumentsPage";
import MyDocumentsPage from "./pages/MyDocumentsPage";
import EmployerMessagesPage from "./pages/EmployerMessagesPage";
import MyMessagesPage from "./pages/MyMessagesPage";
import NotificationBell from "./components/NotificationBell";
import { getToken, clearToken } from "./api/client";

function getSavedUser() {
  try {
    const raw = localStorage.getItem("equipe_rh_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem("equipe_rh_user", JSON.stringify(user));
}

const EMPLOYER_TABS = [
  { key: "team", label: "Équipe" },
  { key: "leave", label: "Congés" },
  { key: "schedule", label: "Planning" },
  { key: "documents", label: "Documents" },
  { key: "messages", label: "Messages" },
];

const EMPLOYEE_TABS = [
  { key: "clock", label: "Pointage" },
  { key: "leave", label: "Mes congés" },
  { key: "schedule", label: "Mon planning" },
  { key: "documents", label: "Mes documents" },
  { key: "messages", label: "Messages" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    const token = getToken();
    const saved = getSavedUser();
    if (token && saved) {
      setUser(saved);
      setActiveTab(saved.role === "employer" ? "team" : "clock");
    }
    setReady(true);
  }, []);

  function handleLoggedIn(userData) {
    saveUser(userData);
    setUser(userData);
    setActiveTab(userData.role === "employer" ? "team" : "clock");
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem("equipe_rh_user");
    setUser(null);
  }

  if (!ready) return null;

  if (!user) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

  const tabs = user.role === "employer" ? EMPLOYER_TABS : EMPLOYEE_TABS;

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F6", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* En-tête */}
      <div style={{ background: "white", borderBottom: "1px solid #E7E5E1", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#1F1D1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>RH</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15.5 }}>EquipeRH</span>
          <span style={{ fontSize: 12.5, color: "#A8A398", background: "#F0EEE9", padding: "3px 9px", borderRadius: 100, fontWeight: 600 }}>
            {user.role === "employer" ? "Espace employeur" : "Espace salarié"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NotificationBell />
          <button
            onClick={handleLogout}
            style={{ background: "none", border: "1px solid #D8D4CC", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#605C52", fontFamily: "inherit" }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Barre d'onglets */}
      <div style={{ background: "white", borderBottom: "1px solid #E7E5E1", padding: "0 24px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #1F1D1A" : "2px solid transparent",
              padding: "12px 14px",
              fontSize: 13.5,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#1F1D1A" : "#8A8578",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu principal */}
      {user.role === "employee" && activeTab === "clock" && <TimeclockPage user={user} />}
      {user.role === "employee" && activeTab === "leave" && <LeaveRequestsPage />}
      {user.role === "employee" && activeTab === "schedule" && <MySchedulePage />}
      {user.role === "employee" && activeTab === "documents" && <MyDocumentsPage />}
      {user.role === "employee" && activeTab === "messages" && <MyMessagesPage />}
      {user.role === "employer" && activeTab === "team" && <EmployerTeamPage />}
      {user.role === "employer" && activeTab === "leave" && <EmployerLeaveRequestsPage />}
      {user.role === "employer" && activeTab === "schedule" && <EmployerSchedulePage />}
      {user.role === "employer" && activeTab === "documents" && <EmployerDocumentsPage />}
      {user.role === "employer" && activeTab === "messages" && <EmployerMessagesPage />}
    </div>
  );
}