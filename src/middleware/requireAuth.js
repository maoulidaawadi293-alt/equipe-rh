// Middleware Express : intercepte les requêtes avant qu'elles n'atteignent
// les routes protégées, et vérifie que la personne a bien un token valide.
//
// Utilisation dans une route : router.get("/quelque-chose", requireAuth, (req, res) => { ... })
// Si le token est valide, req.user contient { userId, role } pour le reste de la requête.

const { verifyToken } = require("../auth");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // attendu : "Bearer <token>"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session invalide ou expirée, reconnecte-toi." });
  }
}

// Variante : vérifie en plus que l'utilisateur a le rôle "employer".
// Utile pour les routes réservées à l'employeur (ex. ajouter un salarié).
function requireEmployer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "employer") {
      return res.status(403).json({ error: "Accès réservé à l'employeur." });
    }
    next();
  });
}

module.exports = { requireAuth, requireEmployer };
