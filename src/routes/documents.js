const express = require("express");
const multer = require("multer");
const pool = require("../db/pool");
const cloudinary = require("../cloudinary");
const { requireAuth, requireEmployer } = require("../middleware/requireAuth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function uploadToCloudinary(buffer, originalname, mimetype) {
  const isImage = mimetype.startsWith("image/");
  const isPDF = mimetype === "application/pdf";
  const resourceType = isImage ? "image" : "raw";

  // On garde l'extension originale dans le public_id pour que l'URL soit correcte
  const ext = originalname.split(".").pop();
  const baseName = originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_");
  const publicId = `${baseName}_${Date.now()}.${ext}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "equipe-rh-documents",
        public_id: publicId,
        use_filename: true,
        unique_filename: false,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Liste les documents d'un salarié
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

    const result = await pool.query(
      `SELECT * FROM documents WHERE employee_id = $1 ORDER BY created_at DESC`,
      [employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur liste documents:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Upload d'un document (employeur uniquement)
router.post("/", requireEmployer, upload.single("file"), async (req, res) => {
  const { employee_id, title, type } = req.body;
  if (!employee_id || !title || !req.file) {
    return res.sta