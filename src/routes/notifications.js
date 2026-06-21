const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Liste les notifications du compte connecté
// - Si employer : notifications avec audience='employer'
// - Si employee : notifications avec audience='user' ET user_id = lui-même
router.get("/", requireAuth, async (req, res) => {
  try {
    let result;
    if (req.user.role === "employer") {
      result = await pool.query(
        `SELECT * FROM notifications WHERE audience = 'employer' ORDER BY created_at DESC LIMIT 50`
      );
    } else {
      result = await pool.query(
        `SELECT * FROM notifications WHERE audience = 'user' AND user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.user.userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste notifications:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Marque une notification comme lue
router.put("/:id/read", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur marquage notification:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Marque toutes les notifications du compte connecté comme lues
router.put("/read-all", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "employer") {
      await pool.query(`UPDATE notifications SET is_read = TRUE WHERE audience = 'employer'`);
    } else {
      await pool.query(`UPDATE notifications SET is_read = TRUE WHERE audience = 'user' AND user_id = $1`, [req.user.userId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur marquage notifications:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;