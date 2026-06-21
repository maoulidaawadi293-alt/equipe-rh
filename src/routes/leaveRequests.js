const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();

// Liste les demandes du salarié connecté
router.get("/me", requireAuth, async (req, res) => {
  try {
    const employeeResult = await pool.query(
      `SELECT id, leave_quota, rtt_quota FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    const employee = employeeResult.rows[0];

    const requestsResult = await pool.query(
      `SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employee.id]
    );

    const usedDaysResult = await pool.query(
      `SELECT COALESCE(SUM((end_date - start_date) + 1), 0) AS used
       FROM leave_requests
       WHERE employee_id = $1 AND type = 'conges' AND status IN ('approved', 'pending')`,
      [employee.id]
    );
    const usedDays = parseInt(usedDaysResult.rows[0].used, 10);
    const balance = employee.leave_quota - usedDays;

    res.json({ requests: requestsResult.rows, balance, quota: employee.leave_quota });
  } catch (err) {
    console.error("Erreur leave requests me:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Crée une nouvelle demande de congé (salarié) + notifie l'employeur
router.post("/", requireAuth, async (req, res) => {
  const { start_date, end_date, type, reason } = req.body;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Dates de début et de fin requises" });
  }
  try {
    const employeeResult = await pool.query(
      `SELECT id, name FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    const employee = employeeResult.rows[0];

    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, start_date, end_date, type, reason)
       VALUES ($1, $2, $3, COALESCE($4, 'conges'), $5)
       RETURNING *`,
      [employee.id, start_date, end_date, type, reason]
    );

    // Notification pour l'employeur
    await pool.query(
      `INSERT INTO notifications (audience, message) VALUES ('employer', $1)`,
      [`${employee.name} a fait une demande de congé du ${start_date} au ${end_date}.`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur creation leave request:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste toutes les demandes de l'équipe (employeur)
router.get("/team", requireEmployer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, e.name AS employee_name, e.team AS employee_team
       FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       ORDER BY lr.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur leave requests team:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Valide ou refuse une demande (employeur) + notifie le salarié
router.put("/:id/status", requireEmployer, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Statut invalide" });
  }
  try {
    const result = await pool.query(
      `UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Demande introuvable" });
    }
    const updated = result.rows[0];

    // On retrouve l'utilisateur (user_id) lié à ce salarié pour le notifier
    const employeeResult = await pool.query(
      `SELECT user_id FROM employees WHERE id = $1`,
      [updated.employee_id]
    );
    const userId = employeeResult.rows[0]?.user_id;

    if (userId) {
      const statusText = status === "approved" ? "validée" : "refusée";
      await pool.query(
        `INSERT INTO notifications (user_id, audience, message) VALUES ($1, 'user', $2)`,
        [userId, `Votre demande de congé du ${updated.start_date} au ${updated.end_date} a été ${statusText}.`]
      );
    }

    res.json(updated);
  } catch (err) {
    console.error("Erreur update leave request:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;