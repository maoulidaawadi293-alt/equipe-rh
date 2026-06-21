// Point d'entrée du serveur backend.
// Lance avec : npm run dev (voir package.json)

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const timeEntryRoutes = require("./routes/timeEntries");
const employeesRoutes = require("./routes/employees");
const leaveRequestsRoutes = require("./routes/leaveRequests");
const notificationsRoutes = require("./routes/notifications");
const schedulesRoutes = require("./routes/schedules");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // autorise le frontend (autre origine) à appeler cette API
app.use(express.json()); // permet de lire le JSON envoyé dans le corps des requêtes

app.use("/api/auth", authRoutes);
app.use("/api/time-entries", timeEntryRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/leave-requests", leaveRequestsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/schedules", schedulesRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Serveur EquipeRH démarré sur http://localhost:${PORT}`);
});