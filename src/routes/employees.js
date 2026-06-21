const express = require("express");
const pool = require("../db/pool");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Liste tous les salariés (employeur uniquement)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, role_title, team, color, leave_quota, rtt_quota, created_at
       FROM employees ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste employees:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Récupère la fiche du salarié connecté
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, role_title, team, color, leave_quota, rtt_quota
       FROM employees WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur fiche employee:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Crée un nouveau salarié (employeur uniquement)
router.post("/", requireAuth, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Réservé à l'employeur" });
  }
  const { name, role_title, team, color, leave_quota, rtt_quota } = req.body;
  if (!name || !role_title || !team) {
    return res.status(400).json({ error: "Nom, poste et équipe sont requis" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO employees (name, role_title, team, color, leave_quota, rtt_quota)
       VALUES ($1, $2, $3, COALESCE($4, '#2563EB'), COALESCE($5, 25), COALESCE($6, 10))
       RETURNING *`,
      [name, role_title, team, color, leave_quota, rtt_quota]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur creation employee:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Modifie un salarié existant (employeur uniquement)
router.put("/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Réservé à l'employeur" });
  }
  const { id } = req.params;
  const { name, role_title, team, color, leave_quota, rtt_quota } = req.body;
  try {
    const result = await pool.query(
      `UPDATE employees
       SET name = COALESCE($1, name),
           role_title = COALESCE($2, role_title),
           team = COALESCE($3, team),
           color = COALESCE($4, color),
           leave_quota = COALESCE($5, leave_quota),
           rtt_quota = COALESCE($6, rtt_quota)
       WHERE id = $7
       RETURNING *`,
      [name, role_title, team, color, leave_quota, rtt_quota, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Salarié introuvable" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur modification employee:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Supprime un salarié (employeur uniquement)
router.delete("/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({ error: "Réservé à l'employeur" });
  }
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM employees WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Salarié introuvable" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression employee:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;