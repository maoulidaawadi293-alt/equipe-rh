// Module d'authentification.
//
// Principe :
// 1. À l'inscription, on chiffre le mot de passe avec bcrypt (jamais en clair).
// 2. À la connexion, on vérifie le mot de passe puis on délivre un "token" JWT :
//    une chaîne signée que le frontend renverra à chaque requête pour prouver
//    son identité, sans avoir à renvoyer le mot de passe.
// 3. Le token expire après 7 jours ; l'utilisateur doit alors se reconnecter.

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db/pool");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "7d";
const SALT_ROUNDS = 10; // coût du chiffrement : plus haut = plus sûr mais plus lent

if (!JWT_SECRET) {
  // On préfère planter au démarrage plutôt que de tourner avec une clé de
  // signature absente ou faible — c'est une faille de sécurité critique.
  throw new Error("JWT_SECRET manquant : définis-le dans le fichier .env avant de démarrer le serveur.");
}

async function registerUser({ email, password, role }) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    throw new Error("Un compte existe déjà avec cet email.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
    [email, passwordHash, role]
  );
  return result.rows[0];
}

async function loginUser({ email, password }) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  // Message volontairement identique que l'email existe ou non,
  // pour ne pas révéler à un attaquant quels emails sont enregistrés.
  if (!user) {
    throw new Error("Email ou mot de passe incorrect.");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new Error("Email ou mot de passe incorrect.");
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET); // lève une erreur si invalide/expiré
}

module.exports = { registerUser, loginUser, verifyToken };
