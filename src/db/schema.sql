-- ============================================================================
-- Schéma de base de données — EquipeRH
-- PostgreSQL 14+
-- ============================================================================

-- Table des utilisateurs (comptes de connexion).
-- Un utilisateur peut être employeur ou salarié (colonne "role").
-- Le mot de passe n'est JAMAIS stocké en clair : on stocke un hash bcrypt.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('employer', 'employee')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des salariés (fiche RH, distincte du compte de connexion).
-- Un salarié est rattaché à un utilisateur (celui qui se connecte),
-- sauf si son compte n'a pas encore été créé (employeur peut créer
-- la fiche avant que le salarié n'active son compte).
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255) NOT NULL,        -- intitulé du poste (ex. "Développeuse")
  team VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#2563EB',
  leave_quota INTEGER NOT NULL DEFAULT 25, -- jours de congés payés / an
  rtt_quota INTEGER NOT NULL DEFAULT 10,   -- jours de RTT / an
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des pointages (heures travaillées).
-- Chaque pointage a une entrée (clock_in) et éventuellement une sortie (clock_out).
-- Tant que clock_out est NULL, le salarié est considéré "en poste".
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour accélérer les recherches fréquentes
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_employees_user ON employees(user_id);

-- ============================================================================
-- Notes pour la suite (tables à ajouter quand on enrichira le projet) :
-- - leave_requests (demandes de congés)
-- - notifications
-- - documents
-- - schedules (plannings)
-- On les ajoutera avec le même principe une fois ce socle validé.
-- ============================================================================
