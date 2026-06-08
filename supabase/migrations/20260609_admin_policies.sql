-- Secret Divin : politiques RLS pour le rôle admin (table user_roles, role = 'admin')
-- S'exécute après 20260608_security_rls.sql (RLS déjà activé sur toutes les tables sensibles)

-- Fonction utilitaire : l'utilisateur courant a-t-il le rôle admin ?
-- SECURITY DEFINER pour pouvoir lire user_roles sans dépendre des policies de cette table.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  );
$$;

-- profiles : lecture/écriture complète pour l'admin (tableau de bord)
CREATE POLICY "admin_full_profiles" ON profiles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- user_roles : gestion des rôles (attribution/retrait)
CREATE POLICY "admin_full_user_roles" ON user_roles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- saved_rituals : lecture pour les statistiques admin
CREATE POLICY "admin_read_saved_rituals" ON saved_rituals
  FOR SELECT USING (is_admin());

-- formation_modules : lecture pour les statistiques admin
CREATE POLICY "admin_read_formation_modules" ON formation_modules
  FOR SELECT USING (is_admin());

-- credit_transactions : lecture + création (octroi de crédits/achats)
CREATE POLICY "admin_read_credit_transactions" ON credit_transactions
  FOR SELECT USING (is_admin());
CREATE POLICY "admin_insert_credit_transactions" ON credit_transactions
  FOR INSERT WITH CHECK (is_admin());

-- user_credits : lecture + ajustement de solde
CREATE POLICY "admin_full_user_credits" ON user_credits
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- subscriptions : lecture + création d'abonnements
CREATE POLICY "admin_full_subscriptions" ON subscriptions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- blog_articles : gestion complète (création, édition, publication, suppression)
CREATE POLICY "admin_full_blog_articles" ON blog_articles
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- contact_messages : lecture des messages reçus
CREATE POLICY "admin_read_contact_messages" ON contact_messages
  FOR SELECT USING (is_admin());
