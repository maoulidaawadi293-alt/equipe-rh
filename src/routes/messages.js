const express = require("express");
const multer = require("multer");
const pool = require("../db/pool");
const cloudinary = require("../cloudinary");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15 Mo max

function uploadToCloudinary(buffer, filename, resourceType) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: "equipe-rh-messages" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// Trouve l'ID utilisateur "employeur" (on suppose un seul employeur pour l'instant)
async function getEmployerUserId() {
  const result = await pool.query(`SELECT id FROM users WHERE role = 'employer' LIMIT 1`);
  return result.rows[0]?.id;
}

// Liste la conversation directe entre le compte connecté et l'employeur (ou un salarié si on est employeur)
// GET /api/messages/conversation?with=<userId>  (utilisé par l'employeur pour choisir le salarié)
router.get("/conversation", requireAuth, async (req, res) => {
  try {
    let otherUserId;
    if (req.user.role === "employer") {
      otherUserId = req.query.with;
      if (!otherUserId) return res.status(400).json({ error: "Paramètre 'with' requis (id du salarié)" });
    } else {
      otherUserId = await getEmployerUserId();
    }

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE type = 'direct'
       AND ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
       ORDER BY created_at ASC`,
      [req.user.userId, otherUserId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur conversation:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Liste les messages de groupe (broadcast)
router.get("/broadcast", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.email AS sender_email FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.type = 'broadcast'
       ORDER BY m.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur broadcast:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Envoie un message direct ou broadcast, avec pièce jointe optionnelle (texte, image, fichier, audio)
router.post("/", requireAuth, upload.single("attachment"), async (req, res) => {
  const { content, type, recipient_id } = req.body;
  const messageType = type === "broadcast" ? "broadcast" : "direct";

  if (messageType === "broadcast" && req.user.role !== "employer") {
    return res.status(403).json({ error: "Seul l'employeur peut envoyer un message à toute l'équipe" });
  }
  if (!content && !req.file) {
    return res.status(400).json({ error: "Un message texte ou une pièce jointe est requis" });
  }

  try {
    let attachmentUrl = null;
    let attachmentKind = null;

    if (req.file) {
      const isAudio = req.file.mimetype.startsWith("audio/");
      const isImage = req.file.mimetype.startsWith("image/");
      attachmentKind = isAudio ? "audio" : isImage ? "image" : "file";
      const resourceType = isAudio ? "video" : "auto"; // Cloudinary traite l'audio via "video"
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname, resourceType);
      attachmentUrl = uploadResult.secure_url;
    }

    let finalRecipientId = null;
    if (messageType === "direct") {
      finalRecipientId = req.user.role === "employer" ? recipient_id : await getEmployerUserId();
      if (!finalRecipientId) return res.status(400).json({ error: "Destinataire introuvable" });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, type, content, attachment_url, attachment_kind)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, finalRecipientId, messageType, content || null, attachmentUrl, attachmentKind]
    );

    // Notification pour le(s) destinataire(s)
    if (messageType === "direct") {
      await pool.query(
        `INSERT INTO notifications (user_id, audience, message) VALUES ($1, 'user', $2)`,
        [finalRecipientId, `Nouveau message reçu.`]
      );
    } else {
      await pool.query(`INSERT INTO notifications (audience, message) VALUES ('employer', $1)`, [`Message envoyé à toute l'équipe.`]);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erreur envoi message:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;