import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // rafraîchit toutes les 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function load() {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
    } catch (err) {
      // silencieux : ne casse pas l'interface si ça échoue
    }
  }

  async function handleOpen() {
    setOpen((o) => !o);
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch (err) {
      // silencieux
    }
  }

  async function handleClickNotification(id) {
    try {
      await api.markNotificationRead(id);
      await load();
    } catch (err) {
      // silencieux
    }
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          background: "none", border: "1px solid #D8D4CC", borderRadius: 9,
          width: 36, height: 36, cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute", top: -4, right: -4, background: "#DC2626", color: "white",
              borderRadius: 100, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: 44, right: 0, width: 320, maxHeight: 360, overflowY: "auto",
            background: "white", border: "1px solid #E7E5E1", borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #F0EEE9" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1F1D1A" }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{ background: "none", border: "none", color: "#2563EB", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Tout marquer lu
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p style={{ fontSize: 12.5, color: "#A8A398", padding: 16, margin: 0 }}>Aucune notification.</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClickNotification(n.id)}
              style={{
                padding: "10px 14px", borderBottom: "1px solid #F8F7F4", cursor: "pointer",
                background: n.is_read ? "white" : "#EFF6FF",
              }}
            >
              <div style={{ fontSize: 12.5, color: "#1F1D1A", marginBottom: 3 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: "#A8A398" }}>{formatTime(n.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}