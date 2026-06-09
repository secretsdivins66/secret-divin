-- Secret Divin : marketplace marabouts
-- 3 tables : marabouts, marabout_avis, marabout_abonnements + RLS

-- =========================================================
-- marabouts : profils des guides spirituels
-- =========================================================
CREATE TABLE IF NOT EXISTS marabouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nom                 text NOT NULL,
  photo_url           text,
  specialites         text[] NOT NULL DEFAULT '{}',
  localisation        text,
  biographie          text,
  tarif_consultation  integer,
  telephone_whatsapp  text,
  statut              text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','active','suspended')),
  is_verified         boolean NOT NULL DEFAULT false,
  is_featured         boolean NOT NULL DEFAULT false,
  abonne_jusqu_au     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS marabouts_statut_idx      ON marabouts (statut);
CREATE INDEX IF NOT EXISTS marabouts_featured_idx    ON marabouts (is_featured DESC);

-- =========================================================
-- marabout_avis : avis des utilisateurs
-- =========================================================
CREATE TABLE IF NOT EXISTS marabout_avis (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marabout_id  uuid NOT NULL REFERENCES marabouts (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  note         integer NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marabout_id, user_id)
);
CREATE INDEX IF NOT EXISTS marabout_avis_marabout_idx ON marabout_avis (marabout_id);

-- =========================================================
-- marabout_abonnements : suivi des paiements (5000 FCFA/mois)
-- =========================================================
CREATE TABLE IF NOT EXISTS marabout_abonnements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marabout_id  uuid NOT NULL REFERENCES marabouts (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  statut       text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending','active','expired')),
  montant      integer NOT NULL DEFAULT 5000,
  date_debut   timestamptz,
  date_fin     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marabout_abonnements_marabout_idx ON marabout_abonnements (marabout_id);

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE marabouts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE marabout_avis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marabout_abonnements ENABLE ROW LEVEL SECURITY;

-- Lecture publique des profils actifs + propriétaire voit le sien
CREATE POLICY "marabouts_select" ON marabouts
  FOR SELECT USING (statut = 'active' OR auth.uid() = user_id);

CREATE POLICY "marabouts_insert_own" ON marabouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "marabouts_update_own" ON marabouts
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin (is_admin() défini dans 20260609_admin_policies.sql)
CREATE POLICY "marabouts_admin" ON marabouts
  FOR ALL USING (is_admin());

CREATE POLICY "marabout_avis_admin" ON marabout_avis
  FOR ALL USING (is_admin());

CREATE POLICY "marabout_abonnements_admin" ON marabout_abonnements
  FOR ALL USING (is_admin());

-- Avis : lecture publique, écriture/modification/suppression par son auteur
CREATE POLICY "marabout_avis_select" ON marabout_avis
  FOR SELECT USING (true);

CREATE POLICY "marabout_avis_insert" ON marabout_avis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "marabout_avis_update_own" ON marabout_avis
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "marabout_avis_delete_own" ON marabout_avis
  FOR DELETE USING (auth.uid() = user_id);

-- Abonnements : propriétaire uniquement
CREATE POLICY "marabout_abonnements_select_own" ON marabout_abonnements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "marabout_abonnements_insert_own" ON marabout_abonnements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
