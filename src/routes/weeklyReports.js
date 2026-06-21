const express = require("express");
const multer = require("multer");
const pool = require("../db/pool");
const cloudinary = require("../cloudinary");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

function uploadToCloudinary(buffer, mimetype) {
  const isImage = mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "equipe-rh-weekly-reports" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Récupère (ou crée vide) le bilan du salarié connecté pour une semaine donnée, avec ses entrées
router.get("/me", requireAuth, async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: "Paramètre week_start requis" });
  try {
    const employeeResult = await pool.query(`SELECT id FROM employees WHERE user_id = $1`, [req.user.userId]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    const employeeId = employeeResult.rows[0].id;

    const reportResult = await pool.query(
      `SELECT * FROM weekly_reports WHERE employee_id = $1 AND week_start = $2`,
      [employeeId, week_start]
    );
    if (reportResult.rows.length === 0) {
      return res.json({ report: null, entries: [] });
    }
    const report = reportResult.rows[0];
    const entriesResult = await pool.query(
      `SELECT * FROM weekly_report_entries WHERE report_id = $1 ORDER BY created_at ASC`,
      [report.id]
    );
    res.json({ report, entries: entriesResult.rows });
  } catch (err) {
    console.error("Erreur bilan me:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajoute une entrée au bilan de la semaine (crée le bilan s'il n'existe pas encore)
router.post("/entries", requireAuth, upload.single("attachment"), async (req, res) => {
  const { week_start, content } = req.body;
  if (!week_start || !content) {
    return res.status(400).json({ error: "week_start et content sont requis" });
  }
  try {
    const employeeResult = await pool.query(`SELECT id FROM employees WHERE user_id = $1`, [req.user.userId]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: "Aucune fiche salarié associée" });
    }
    const employeeId = employeeResult.rows[0].id;

    let reportResult = await pool.query(
      `SELECT * FROM weekly_reports WHERE employee_id = $1 AND week_start = $2`,
      [employeeId, week_start]
    );
    let report;
    if (reportResult.rows.length === 0) {
      const created = await pool.query(
        `INSERT INTO weekly_reports (employee_id, week_start) VALUES ($1, $2) RETURNING *`,
        [employeeId, week_start]
      );
      report = created.rows[0];
    } else {
      report = reportResult.rows[0];
    }

    let attachmentUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      attachmentUrl = uploadResult.secure_url;
    }

    const entryResult = await pool.query(
      `INSERT INTO weekly_report_entries (report_id, content, attachment_url) VALUES ($1, $2, $3) RETURNING *`,
      [report.id, content, attachmentUrl]
    );

    res.status(201).json({ report, entry: entryResult.rows[0] });
  } catch (err) {
    console.error("Erreur ajout entree bilan:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste tous les bilans de l'équipe pour une semaine donnée (employeur)
router.get("/team", requireEmployer, async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) return res.status(400).json({ error: "Paramètre week_start requis" });
  try {
    const reportsResult = await pool.query(
      `SELECT wr.*, e.name AS employee_name FROM weekly_reports wr
       JOIN employees e ON e.id = wr.employee_id
       WHERE wr.week_start = $1
       ORDER BY e.name ASC`,
      [week_start]
    );
    const reports = reportsResult.rows;

    for (const report of reports) {
      const entriesResult = await pool.query(
        `SELECT * FROM weekly_report_entries WHERE report_id = $1 ORDER BY created_at ASC`,
        [report.id]
      );
      report.entries = entriesResult.rows;
    }

    res.json(reports);
  } catch (err) {
    console.error("Erreur bilans equipe:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// L'employeur ajoute/modifie son commentaire sur un bilan
router.put("/:id/comment", requireEmployer, async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  try {
    const result = await pool.query(
      `UPDATE weekly_reports SET employer_comment = $1 WHERE id = $2 RETURNING *`,
      [comment, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Bilan introuvable" });
    }

    const reportEmployee = await pool.query(`SELECT user_id FROM employees WHERE id = $1`, [result.rows[0].employee_id]);
    const userId = reportEmployee.rows[0]?.user_id;
    if (userId) {
      await pool.query(
        `INSERT INTO notifications (user_id, audience, message) VALUES ($1, 'user', $2)`,
        [userId, `L'employeur a commenté votre bilan de la semaine.`]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur commentaire bilan:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;