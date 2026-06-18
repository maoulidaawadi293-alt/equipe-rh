// Routes de pointage. Toutes nécessitent d'être connecté (requireAuth).
//
// Logique :
// - POST /clock-in   : crée une nouvelle entrée avec l'heure actuelle, si aucune n'est déjà ouverte
// - POST /clock-out  : ferme l'entrée ouverte la plus récente du salarié connecté
// - GET  /me         : historique des pointages du salarié connecté
// - GET  /team       : historique de toute l'équipe (employeur uniquement)

const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

// Petite fonction utilitaire : retrouve la fiche salarié liée à l'utilisateur connecté.
async function getEmployeeForUser(userId) {
  const result = await pool.query("SELECT * FROM employees WHERE user_id = $1", [userId]);
  return result.rows[0] || null;
}

router.post("/clock-in", requireAuth, async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({ error: "Aucune fiche salarié n'est associée à ce compte." });
    }

    // Empêche un double pointage : on vérifie qu'il n'y a pas déjà une entrée ouverte.
    const openEntry = await pool.query(
      "SELECT id FROM time_entries WHERE employee_id = $1 AND clock_out IS NULL",
      [employee.id]
    );
    if (openEntry.rows.length > 0) {
      return res.status(400).json({ error: "Tu es déjà pointé. Pointe d'abord ta sortie." });
    }

    const result = await pool.query(
      "INSERT INTO time_entries (employee_id, clock_in) VALUES ($1, NOW()) RETURNING *",
      [employee.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors du pointage d'arrivée." });
  }
});

router.post("/clock-out", requireAuth, async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({ error: "Aucune fiche salarié n'est associée à ce compte." });
    }

    const result = await pool.query(
      `UPDATE time_entries
       SET clock_out = NOW()
       WHERE employee_id = $1 AND clock_out IS NULL
       RETURNING *`,
      [employee.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Aucun pointage d'arrivée en cours à clôturer." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors du pointage de sortie." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const employee = await getEmployeeForUser(req.user.userId);
    if (!employee) {
      return res.status(404).json({ error: "Aucune fiche salarié n'est associée à ce compte." });
    }

    const result = await pool.query(
      "SELECT * FROM time_entries WHERE employee_id = $1 ORDER BY clock_in DESC LIMIT 50",
      [employee.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des pointages." });
  }
});

router.get("/team", requireEmployer, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*, e.name AS employee_name
       FROM time_entries te
       JOIN employees e ON e.id = te.employee_id
       ORDER BY te.clock_in DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des pointages de l'équipe." });
  }
});

module.exports = router;
