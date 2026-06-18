// Routes publiques d'authentification : /api/auth/register et /api/auth/login.
// Pas de middleware requireAuth ici, puisque c'est justement le point d'entrée
// pour obtenir un token.

const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../auth");

router.post("/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Email, mot de passe et rôle sont requis." });
  }
  if (!["employer", "employee"].includes(role)) {
    return res.status(400).json({ error: "Le rôle doit être 'employer' ou 'employee'." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
  }

  try {
    const user = await registerUser({ email, password, role });
    res.status(201).json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe sont requis." });
  }

  try {
    const { token, user } = await loginUser({ email, password });
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

module.exports = router;
