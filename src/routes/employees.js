const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db/pool");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();
const SALT_ROUNDS = 10;

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.user_id, e.name, e.role_title, e.team, e.color, e.leave_quota, e.rtt_quota, e.created_at, u.email
       FROM employees e
       LEFT JOIN users u ON u.id = e.user_id
       ORDER BY e.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste employees:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, name, role_title, team, color, leave_quota, rtt_quota
       FROM employees WHERE user_id = $1`,
      [req.user.userId]
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

router.post("/", requireEmployer, async (req, res) => {
  const { name, role_title, team, email, color, leave_quota, rtt_quota } = req.body;
  if (!name || !role_title || !team || !email) {
    return res.status(400).json({ error: "Nom, poste, équipe et email sont requis" });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe déjà avec cet email." });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'employee') RETURNING id`,
      [email, passwordHash]
    );
    const userId = userResult.rows[0].id;

    const employeeResult = await client.query(
      `INSERT INTO employees (user_id, name, role_title, team, color, leave_quota, rtt_quota)
       VALUES ($1, $2, $3, $4, COALESCE($5, '#2563EB'), COALESCE($6, 25), COALESCE($7, 10))
       RETURNING *`,
      [userId, name, role_title, team, color, leave_quota, rtt_quota]
    );

    await client.query("COMMIT");

    res.status(201).json({ ...employeeResult.rows[0], email, tempPassword });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur creation employee:", err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    client.release();
  }
});

router.put("/:id", requireEmployer, async (req, res) => {
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

router.delete("/:id", requireEmployer, async (req, res) => {
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