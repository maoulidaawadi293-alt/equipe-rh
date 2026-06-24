const express = require("express");
const multer = require("multer");
const pool = require("../db/pool");
const cloudinary = require("../cloudinary");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function uploadToCloudinary(buffer, originalname, mimetype) {
  const isImage = mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const ext = originalname.split(".").pop();
  const baseName = originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const publicId = `${baseName}_${Date.now()}.${ext}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "equipe-rh-documents", public_id: publicId },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

router.get("/", requireAuth, async (req, res) => {
  try {
    let employeeId;
    if (req.user.role === "employer" && req.query.employee_id) {
      employeeId = req.query.employee_id;
    } else {
      const employeeResult = await pool.query(`SELECT id FROM employees WHERE user_id = $1`, [req.user.userId]);
      if (employeeResult.rows.length === 0) {
        return res.status(404).json({ error: "Aucune fiche salarié associée" });
      }
      employeeId = employeeResult.rows[0].id;
    }
    const result = await pool.query(`SELECT * FROM documents WHERE employee_id = $1 ORDER BY created_at DESC`, [employeeId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste documents:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", requireEmployer, upload.single("file"), async (req, res) => {
  const { employee_id, title, type } = req.body;
  if (!employee_id || !title || !req.file) {
    return res.status(400).json({ error: "employee_id, title et un fichier sont requis" });
  }
  try {
    const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, req.file.mimetype);
    const result = await pool.query(
      `INSERT INTO documents (employee_id, title, type, file_url, uploaded_by) VALUES ($1, $2, COALESCE($3, 'autre'), $4, $5) RETURNING *`,
      [employee_id, title, type, uploadResult.secure_url, req.user.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur upload document:", err);
    res.status(500).json({ error: "Erreur lors de l'envoi du document" });
  }
});

router.delete("/:id", requireEmployer, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM documents WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document introuvable" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Erreur suppression document:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;