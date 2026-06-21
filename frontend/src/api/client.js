// Client API centralisé : tous les appels au backend passent par ici.
// Avantage : si l'URL du backend change, ou si on veut ajouter une logique
// commune (gestion des erreurs, ajout automatique du token...), on ne modifie
// qu'un seul fichier.

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("equipe_rh_token");
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue.");
  }
  return data;
}

// Variante pour l'upload de fichiers (FormData, pas de JSON.stringify, pas de Content-Type manuel)
async function apiUpload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue.");
  }
  return data;
}

export const api = {
  // Authentification
  register: (email, password, role) => apiRequest("/auth/register", { method: "POST", body: { email, password, role } }),
  login: (email, password) => apiRequest("/auth/login", { method: "POST", body: { email, password } }),

  // Pointage
  clockIn: () => apiRequest("/time-entries/clock-in", { method: "POST" }),
  clockOut: () => apiRequest("/time-entries/clock-out", { method: "POST" }),
  myTimeEntries: () => apiRequest("/time-entries/me"),
  teamTimeEntries: () => apiRequest("/time-entries/team"),

  // Salariés (équipe)
  listEmployees: () => apiRequest("/employees"),
  myEmployeeProfile: () => apiRequest("/employees/me"),
  createEmployee: (employee) => apiRequest("/employees", { method: "POST", body: employee }),
  updateEmployee: (id, employee) => apiRequest(`/employees/${id}`, { method: "PUT", body: employee }),
  deleteEmployee: (id) => apiRequest(`/employees/${id}`, { method: "DELETE" }),

  // Congés
  myLeaveRequests: () => apiRequest("/leave-requests/me"),
  createLeaveRequest: (request) => apiRequest("/leave-requests", { method: "POST", body: request }),
  teamLeaveRequests: () => apiRequest("/leave-requests/team"),
  updateLeaveRequestStatus: (id, status) => apiRequest(`/leave-requests/${id}/status`, { method: "PUT", body: { status } }),

  // Notifications
  listNotifications: () => apiRequest("/notifications"),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => apiRequest("/notifications/read-all", { method: "PUT" }),

  // Plannings
  teamSchedule: (weekStart) => apiRequest(`/schedules/team?week_start=${weekStart}`),
  mySchedule: (weekStart) => apiRequest(`/schedules/me?week_start=${weekStart}`),
  createScheduleSlot: (slot) => apiRequest("/schedules", { method: "POST", body: slot }),
  updateScheduleSlot: (id, slot) => apiRequest(`/schedules/${id}`, { method: "PUT", body: slot }),
  deleteScheduleSlot: (id) => apiRequest(`/schedules/${id}`, { method: "DELETE" }),

  // Documents
  listDocuments: (employeeId) => apiRequest(employeeId ? `/documents?employee_id=${employeeId}` : "/documents"),
  uploadDocument: (formData) => apiUpload("/documents", formData),
  deleteDocument: (id) => apiRequest(`/documents/${id}`, { method: "DELETE" }),

  // Messagerie
  getConversation: (withUserId) => apiRequest(withUserId ? `/messages/conversation?with=${withUserId}` : "/messages/conversation"),
  getBroadcastMessages: () => apiRequest("/messages/broadcast"),
  sendMessage: (formData) => apiUpload("/messages", formData),
};

export function saveToken(token) {
  localStorage.setItem("equipe_rh_token", token);
}

export function clearToken() {
  localStorage.removeItem("equipe_rh_token");
}

export { getToken };