-- ============================================================================
-- SCRIPT SQL POUR CONFIGURER LA BASE DE DONNÉES SUPABASE
-- ============================================================================
-- Ce script crée toutes les tables nécessaires pour QASHGO
-- Exécutez ces commandes dans l'éditeur SQL de votre projet Supabase
-- ============================================================================

-- 1. VÉRIFIER/COMPLÉTER LA TABLE USERS
-- ----------------------------------------------------------------------------
-- Ajouter les colonnes manquantes à la table users si elles n'existent pas déjà

ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bonus DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawable_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(50) DEFAULT 'benin';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. CRÉER LA TABLE BONUS_SETTINGS
-- ----------------------------------------------------------------------------
-- Cette table stocke tous les paramètres modifiables par l'admin

CREATE TABLE IF NOT EXISTS bonus_settings (
  id SERIAL PRIMARY KEY,
  welcome_bonus_amount DECIMAL(15,2) DEFAULT 700,
  referral_target INTEGER DEFAULT 15,
  bonus_enabled BOOLEAN DEFAULT true,
  affiliation_fee_fcfa DECIMAL(15,2) DEFAULT 4000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CRÉER LA TABLE CLAIMED_BONUSES
-- ----------------------------------------------------------------------------
-- Cette table suit les bonus réclamés par les utilisateurs

CREATE TABLE IF NOT EXISTS claimed_bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. CRÉER LA TABLE REFERRALS
-- ----------------------------------------------------------------------------
-- Cette table gère le système de parrainage à 3 niveaux

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  commission DECIMAL(15,2) DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. INSÉRER LES PARAMÈTRES PAR DÉFAUT
-- ----------------------------------------------------------------------------
-- Paramètres par défaut pour le système de bonus

INSERT INTO bonus_settings (
  welcome_bonus_amount, 
  referral_target, 
  bonus_enabled, 
  affiliation_fee_fcfa
) VALUES (
  700,    -- Bonus de bienvenue : 700 FCFA
  15,     -- Parrainages requis : 15 personnes
  true,   -- Système activé
  4000    -- Frais d'affiliation : 4000 FCFA
) ON CONFLICT DO NOTHING;

-- 6. CRÉER LES INDEX POUR LES PERFORMANCES
-- ----------------------------------------------------------------------------
-- Index pour améliorer les performances des requêtes

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_code ON users(referred_by_code);
CREATE INDEX IF NOT EXISTS idx_users_account_active ON users(account_active);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_claimed_bonuses_user_id ON claimed_bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_bonuses_type ON claimed_bonuses(type);

-- 7. POLITIQUE DE SÉCURITÉ RLS (Row Level Security)
-- ----------------------------------------------------------------------------
-- Activer RLS sur les tables sensibles

ALTER TABLE bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE claimed_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Politique pour bonus_settings : lecture pour tous, écriture pour admins seulement
CREATE POLICY "bonus_settings_read" ON bonus_settings FOR SELECT USING (true);

-- Politique pour claimed_bonuses : utilisateurs voient seulement leurs bonus
CREATE POLICY "claimed_bonuses_user" ON claimed_bonuses 
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Politique pour referrals : utilisateurs voient leurs parrainages
CREATE POLICY "referrals_user" ON referrals 
  FOR ALL USING (
    auth.uid()::text = referrer_id::text OR 
    auth.uid()::text = referred_id::text
  );

-- ============================================================================
-- SCRIPT TERMINÉ
-- ============================================================================
-- Après exécution de ce script, votre base Supabase sera complètement configurée
-- pour supporter tous les systèmes de QASHGO :
-- - Système de bonus modifiable par admin
-- - Frais d'activation modifiables
-- - Système de parrainage à 3 niveaux
-- - Suivi des bonus réclamés
-- - Sécurité et permissions appropriées
-- ============================================================================