const express = require("express");
const pool = require("../db/pool");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();

// Récupère le planning de toute l'équipe pour une semaine donnée (employeur)
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
      `SELECT * FROM schedules WHERE week_start = $1 ORDER BY day_of_week ASC, start_time ASC`,
      [week_start]
    );
    res.json({ employees: employeesResult.rows, entries: scheduleResult.rows });
  } catch (err) {
    console.error("Erreur planning equipe:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupère le planning du salarié connecté pour une semaine donnée
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
      `SELECT * FROM schedules WHERE employee_id = $1 AND week_start = $2 ORDER BY day_of_week ASC, start_time ASC`,
      [employeeId, week_start]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur planning salarie:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Crée un nouveau créneau (employeur)
router.post("/", requireEmployer, async (req, res) => {
  const { employee_id, week_start, day_of_week, start_time, end_time, mission, break_start, break_end, is_off } = req.body;
  if (!employee_id || !week_start || day_of_week === undefined) {
    return res.status(400).json({ error: "employee_id, week_start et day_of_week sont requis" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO schedules (employee_id, week_start, day_of_week, start_time, end_time, mission, break_start, break_end, is_off)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, FALSE))
       RETURNING *`,
      [employee_id, week_start, day_of_week, start_time || null, end_time || null, mission || null, break_start || null, break_end || null, is_off]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur creation creneau:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Modifie un créneau existant (employeur)
router.put("/:id", requireEmployer, async (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, mission, break_start, break_end, is_off } = req.body;
  try {
    const result = await pool.query(
      `UPDATE schedules
       SET start_time = $1, end_time = $2, mission = $3, break_start = $4, break_end = $5, is_off = COALESCE($6, FALSE)
       WHERE id = $7
       RETURNING *`,
      [start_time || null, end_time || null, mission || null, break_start || null, break_end || null, is_off, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Créneau introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur modification creneau:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprime un créneau (employeur)
router.delete("/:id", requireEmployer, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM schedules WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Créneau introuvable" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression creneau:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;