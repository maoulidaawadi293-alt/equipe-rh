import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

export default function EmployerMessagesPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [tab, setTab] = useState("direct"); // "direct" ou "broadcast"
  const [conversation, setConversation] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEmployees();
    loadBroadcasts();
    const interval = setInterval(() => {
      if (tab === "direct" && selectedEmployeeId) loadConversation();
      if (tab === "broadcast") loadBroadcasts();
    }, 15000);
    return () => clearInterval(interval);
  }, [tab, selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId) loadConversation();
  }, [selectedEmployeeId]);

  async function loadEmployees() {
    try {
      const data = await api.listEmployees();
      const withAccount = data.filter((e) => e.user_id);
      setEmployees(withAccount);
      if (withAccount.length > 0) setSelectedEmployeeId(withAccount[0].user_id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadConversation() {
    try {
      const data = await api.getConversation(selectedEmployeeId);
      setConversation(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadBroadcasts() {
    try {
      const data = await api.getBroadcastMessages();
      setBroadcasts(data);
    } catch (err) {
      // silencieux
    }
  }

  async function sendPayload(formData) {
    setSending(true);
    setError(null);
    try {
      if (tab === "direct") {
        formData.append("type", "direct");
        formData.append("recipient_id", selectedEmployeeId);
      } else {
        formData.append("type", "broadcast");
      }
      await api.sendMessage(formData);
      setText("");
      if (tab === "direct") await loadConversation();
      else await loadBroadcasts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleSendText(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const formData = new FormData();
    formData.append("content", text.trim());
    await sendPayload(formData);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("attachment", file);
    await sendPayload(formData);
    e.target.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("attachment", blob, "message-vocal.webm");
        await sendPayload(formData);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError("Impossible d'accéder au microphone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function renderAttachment(msg) {
    if (!msg.attachment_url) return null;
    if (msg.attachment_kind === "image") {
      return <img src={msg.attachment_url} alt="pièce jointe" style={{ maxWidth: 200, borderRadius: 8, marginTop: 6 }} />;
    }
    if (msg.attachment_kind === "audio") {
      return <audio controls src={msg.attachment_url} style={{ marginTop: 6, maxWidth: 240 }} />;
    }
    return (
      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, fontSize: 12.5, color: "#2563EB" }}>
        📎 Voir le fichier joint
      </a>
    );
  }

  const selectedEmployee = employees.find((e) => e.user_id === selectedEmployeeId);

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        <button onClick={() => setTab("direct")} style={tabBtnStyle(tab === "direct")}>Messages individuels</button>
        <button onClick={() => setTab("broadcast")} style={tabBtnStyle(tab === "broadcast")}>Annonce à toute l'équipe</button>
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tab === "direct" && employees.length === 0 && (
        <p style={{ color: "#A8A398", fontSize: 13 }}>Aucun salarié avec un compte de connexion pour le moment.</p>
      )}

      {tab === "direct" && employees.length > 0 && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Salarié</label>
            <select
              value={selectedEmployeeId || ""}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
              style={{ ...inputStyle, width: 240 }}
            >
              {employees.map((emp) => (
                <option key={emp.user_id} value={emp.user_id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div style={messagesBoxStyle}>
            {conversation.length === 0 && <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucun message avec {selectedEmployee?.name} pour le moment.</p>}
            {conversation.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_id === selectedEmployeeId ? "flex-start" : "flex-end", marginBottom: 10 }}>
                <div style={bubbleStyle(msg.sender_id !== selectedEmployeeId)}>
                  {msg.content && <div style={{ fontSize: 13 }}>{msg.content}</div>}
                  {renderAttachment(msg)}
                  <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 4 }}>{formatTime(msg.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "broadcast" && (
        <div style={messagesBoxStyle}>
          {broadcasts.length === 0 && <p style={{ color: "#A8A398", fontSize: 13, padding: 14 }}>Aucune annonce envoyée pour le moment.</p>}
          {broadcasts.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 12, padding: "10px 12px", background: "#F8F7F4", borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8578", marginBottom: 4 }}>📣 {formatTime(msg.created_at)}</div>
              {msg.content && <div style={{ fontSize: 13, color: "#1F1D1A" }}>{msg.content}</div>}
              {renderAttachment(msg)}
            </div>
          ))}
        </div>
      )}

      {(tab === "broadcast" || (tab === "direct" && employees.length > 0)) && (
        <form onSubmit={handleSendText} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === "broadcast" ? "Écrire une annonce pour toute l'équipe…" : "Écrire un message…"}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={iconBtnStyle} title="Joindre un fichier">📎</button>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            style={{ ...iconBtnStyle, background: recording ? "#DC2626" : "white", color: recording ? "white" : "#605C52" }}
            title="Message vocal"
          >
            {recording ? "⏹" : "🎤"}
          </button>
          <button type="submit" disabled={sending || !text.trim()} style={sendBtnStyle}>Envoyer</button>
        </form>
      )}
    </div>
  );
}

const pageStyle = { maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" };
const messagesBoxStyle = { background: "white", border: "1px solid #E7E5E1", borderRadius: 14, padding: 16, minHeight: 320, maxHeight: 440, overflowY: "auto" };
const labelStyle = { fontSize: 12, fontWeight: 600, color: "#8A8578", display: "block", marginBottom: 5 };
const inputStyle = { padding: "9px 12px", borderRadius: 9, border: "1px solid #D8D4CC", fontSize: 13.5, fontFamily: "inherit", outline: "none" };
const iconBtnStyle = { background: "white", border: "1px solid #D8D4CC", borderRadius: 9, width: 38, height: 38, cursor: "pointer", fontSize: 15 };
const sendBtnStyle = { background: "#1F1D1A", color: "white", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
function tabBtnStyle(active) {
  return {
    background: active ? "#1F1D1A" : "white", color: active ? "white" : "#605C52",
    border: "1px solid #D8D4CC", borderRadius: 9, padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };
}
function bubbleStyle(isMine) {
  return {
    background: isMine ? "#1F1D1A" : "#F0EEE9", color: isMine ? "white" : "#1F1D1A",
    borderRadius: 12, padding: "8px 12px", maxWidth: 280,
  };
}