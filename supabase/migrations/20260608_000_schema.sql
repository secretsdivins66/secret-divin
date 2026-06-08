-- Secret Divin : schéma initial des tables applicatives
-- À exécuter AVANT 20260608_security_rls.sql (ordre alphabétique : 000 < security_rls)
-- Couvre toutes les tables référencées par le frontend (src/**/*.tsx)

-- Extension pour gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- profiles : 1 ligne par utilisateur, clé = auth.uid()
-- (la colonne user_id est un alias généré pour compatibilité
--  avec les écrans qui filtrent par user_id au lieu de id)
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  user_id       uuid GENERATED ALWAYS AS (id) STORED,
  email         text,
  display_name  text,
  first_name    text,
  mother_name   text,
  gender        text,
  religion      text,
  language      text DEFAULT 'fr',
  credits       integer NOT NULL DEFAULT 10,
  is_unlimited  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON profiles (user_id);

-- =========================================================
-- user_credits : solde de crédits par utilisateur
-- =========================================================
CREATE TABLE IF NOT EXISTS user_credits (
  user_id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  balance          integer NOT NULL DEFAULT 10,
  total_purchased  integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- user_roles : rôles applicatifs (admin, etc.)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- =========================================================
-- subscriptions : abonnements premium / illimité
-- =========================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan        text NOT NULL,
  price       integer,
  started_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);

-- =========================================================
-- credit_transactions : historique des mouvements de crédits
-- =========================================================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type           text NOT NULL,
  amount         integer NOT NULL,
  tool           text,
  description    text,
  balance_after  integer,
  pack           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions (created_at DESC);

-- =========================================================
-- saved_rituals : résultats de consultations sauvegardés
-- (content/data et page_source/tool coexistent : les écrans
--  de l'app n'utilisent pas tous le même nom de colonne)
-- =========================================================
CREATE TABLE IF NOT EXISTS saved_rituals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title         text,
  content       jsonb,
  data          jsonb,
  page_source   text,
  tool          text,
  first_name    text,
  mother_name   text,
  gender        text,
  pm            text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_rituals_user_id_idx ON saved_rituals (user_id);
CREATE INDEX IF NOT EXISTS saved_rituals_created_at_idx ON saved_rituals (created_at DESC);

-- =========================================================
-- formation_progress : avancement global dans la formation
-- =========================================================
CREATE TABLE IF NOT EXISTS formation_progress (
  user_id            uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  completed_lessons  jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- formation_modules : score par module de formation
-- =========================================================
CREATE TABLE IF NOT EXISTS formation_modules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  module_id     integer NOT NULL,
  is_completed  boolean NOT NULL DEFAULT false,
  best_score    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

-- =========================================================
-- blog_articles : articles de blog (gérés par l'admin)
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_articles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  slug        text NOT NULL UNIQUE,
  category    text,
  excerpt     text,
  content     text,
  views       integer NOT NULL DEFAULT 0,
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- contact_messages : messages du formulaire de contact
-- =========================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  subject     text,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Trigger : à la création d'un compte auth, on initialise
-- automatiquement profiles + user_credits (10 crédits offerts)
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 10)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 10)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
