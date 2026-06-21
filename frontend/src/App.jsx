import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import TimeclockPage from "./pages/TimeclockPage";
import EmployerTeamPage from "./pages/EmployerTeamPage";
import { getToken, clearToken } from "./api/client";

// On vérifie si un token est déjà présent dans le localStorage
// (l'utilisateur était déjà connecté d'une session précédente).
// On stocke aussi le profil minimal pour savoir quel rôle afficher.
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

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const saved = getSavedUser();
    if (token && saved) {
      setUser(saved); // session existante, on restaure le profil
    }
    setReady(true);
  }, []);

  function handleLoggedIn(userData) {
    saveUser(userData);
    setUser(userData);
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem("equipe_rh_user");
    setUser(null);
  }

  if (!ready) return null; // bref instant avant de savoir si l'utilisateur est connecté

  if (!user) {
    return <LoginPage onLoggedIn={handleLoggedIn} />;
  }

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
        <button
          onClick={handleLogout}
          style={{ background: "none", border: "1px solid #D8D4CC", borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#605C52", fontFamily: "inherit" }}
        >
          Déconnexion
        </button>
      </div>

      {/* Contenu principal (à enrichir avec un vrai routeur une fois qu'on ajoute d'autres pages) */}
      {user.role === "employee" && <TimeclockPage user={user} />}
      {user.role === "employer" && <EmployerTeamPage />}
    </div>
  );
}