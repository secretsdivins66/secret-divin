-- Secret Divin : suppression des crédits offerts à l'inscription
-- (seuls les outils marqués gratuits, ex. Poids Mystique avec cost = 0,
-- restent accessibles sans crédit — décision : aucun crédit de bienvenue)
-- À exécuter après 20260608_000_schema.sql si celui-ci a déjà tourné
-- avec l'ancienne valeur par défaut de 10.

ALTER TABLE profiles     ALTER COLUMN credits SET DEFAULT 0;
ALTER TABLE user_credits ALTER COLUMN balance  SET DEFAULT 0;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (NEW.id, NEW.email, 0)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_credits (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
