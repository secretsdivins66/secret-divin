-- Sécurité Secret Divin : activation du Row Level Security (RLS)
-- À coller dans l'éditeur SQL Supabase.
-- Note : adapté aux tables et colonnes réellement utilisées par l'app
-- (profiles.id = auth.uid() ; les autres tables utilisent user_id).

-- Activer RLS sur toutes les tables sensibles
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_rituals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_modules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages     ENABLE ROW LEVEL SECURITY;

-- Politiques profiles (clé primaire = auth.uid())
CREATE POLICY "user_own_profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Politiques user_credits
CREATE POLICY "user_own_credits" ON user_credits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques saved_rituals
CREATE POLICY "user_own_rituals" ON saved_rituals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques formation_modules
CREATE POLICY "user_own_modules" ON formation_modules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques formation_progress
CREATE POLICY "user_own_progress" ON formation_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques credit_transactions (lecture seule pour l'utilisateur)
CREATE POLICY "user_own_transactions" ON credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politiques subscriptions
CREATE POLICY "user_own_subscription" ON subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politiques blog_articles (lecture publique des articles publiés)
CREATE POLICY "public_read_blog" ON blog_articles
  FOR SELECT
  USING (published = true);

-- Politiques user_roles (lecture de son propre rôle uniquement)
CREATE POLICY "user_read_own_role" ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politiques contact_messages (un utilisateur peut créer un message, pas le relire)
CREATE POLICY "user_insert_contact" ON contact_messages
  FOR INSERT
  WITH CHECK (true);

-- Note : les accès admin (lecture/écriture sur toutes les lignes) doivent être
-- gérés via des politiques supplémentaires côté Supabase basées sur la table
-- user_roles (role = 'admin'), à ajouter manuellement selon vos besoins exacts,
-- par exemple :
--
-- CREATE POLICY "admin_full_access_profiles" ON profiles
--   FOR ALL
--   USING (EXISTS (
--     SELECT 1 FROM user_roles
--     WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
--   ));
