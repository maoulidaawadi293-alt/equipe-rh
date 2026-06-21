const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();

// Récupère le planning de toute l'équipe pour une semaine donnée (employeur)
// GET /api/schedules/team?week_start=2026-06-22
router.get("/team", requireEmployer, async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) {
    return res.status(400).json({ error: "Paramètre week_start requis (format AAAA-MM-JJ, date du lundi)" });
  }
  try {
    const employeesResult = await pool.query(
      `SELECT id, name, role_title, team, color FROM employees ORDER BY name ASC`
    );
    const scheduleResult = await pool.query(
      `SELECT * FROM schedules WHERE week_start = $1`,
      [week_start]
    );
    res.json({ employees: employeesResult.rows, entries: scheduleResult.rows });
  } catch (err) {
    console.error("Erreur planning equipe:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupère le planning du salarié connecté pour une semaine donnée
// GET /api/schedules/me?week_start=2026-06-22
router.get("/me", requireAuth, async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) {
    return res.status(400).json({ error: "Paramètre week_start requis" });
  }
  try {
    const employeeResult = await pool.query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [req.user.userId]
    );
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    const employeeId = employeeResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM schedules WHERE employee_id = $1 AND week_start = $2 ORDER BY day_of_week ASC`,
      [employeeId, week_start]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur planning salarie:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Enregistre/met à jour un créneau pour un salarié, un jour, une semaine (employeur)
router.put("/", requireEmployer, async (req, res) => {
  const { employee_id, week_start, day_of_week, start_time, end_time, is_off } = req.body;
  if (!employee_id || !week_start || day_of_week === undefined) {
    return res.status(400).json({ error: "employee_id, week_start et day_of_week sont requis" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO schedules (employee_id, week_start, day_of_week, start_time, end_time, is_off)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, FALSE))
       ON CONFLICT (employee_id, week_start, day_of_week)
       DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_off = EXCLUDED.is_off
       RETURNING *`,
      [employee_id, week_start, day_of_week, start_time || null, end_time || null, is_off]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur enregistrement creneau:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;