// Connexion à la base de données PostgreSQL.
// Toutes les requêtes du backend passent par ce module — un seul endroit
// à modifier si on change un jour de configuration de base de données.

const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "equipe_rh",
});

pool.on("error", (err) => {
  console.error("Erreur inattendue sur une connexion PostgreSQL inactive :", err);
});

module.exports = pool;
