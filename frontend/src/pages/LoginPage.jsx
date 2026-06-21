import React, { useState } from "react";
import { api, saveToken } from "../api/client";

export default function LoginPage({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await api.register(email, password, role);
        // Une fois inscrit, on connecte directement la personne.
        const { token, user } = await api.login(email, password);
        saveToken(token);
        onLoggedIn(user);
      } else {
        const { token, user } = await api.login(email, password);
        saveToken(token);
        onLoggedIn(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAF9F6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif", padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380, background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1F1D1A", margin: "0 0 4px" }}>EquipeRH</h1>
        <p style={{ fontSize: 13.5, color: "#8A8578", margin: "0 0 22px" }}>
          {mode === "login" ? "Connecte-toi à ton espace." : "Crée ton compte."}
        </p>

        {error && (
          <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 10px", borderRadius: 8, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8578" }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8578" }}>Mot de passe</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {mode === "register" && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8A8578" }}>Je suis</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              <option value="employee">Salarié</option>
              <option value="employer">Employeur</option>
            </select>
          </>
        )}

        <button type="submit" disabled={loading} style={submitStyle}>
          {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ background: "none", border: "none", color: "#605C52", fontSize: 13, marginTop: 14, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
        >
          {mode === "login" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  display: "block", width: "100%", fontFamily: "inherit", fontSize: 14,
  padding: "9px 11px", borderRadius: 8, border: "1px solid #D8D4CC",
  outline: "none", color: "#1F1D1A", marginTop: 5, marginBottom: 14, boxSizing: "border-box",
};

const submitStyle = {
  width: "100%", background: "#1F1D1A", color: "white", border: "none",
  borderRadius: 9, padding: "11px", fontSize: 14, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
