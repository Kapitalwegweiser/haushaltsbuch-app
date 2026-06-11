-- ============================================================
-- Haushaltsbuch App – Supabase Datenbankschema
-- Ausführen in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Fixkosten
CREATE TABLE IF NOT EXISTS fixkosten (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  betrag NUMERIC NOT NULL,
  intervall TEXT NOT NULL DEFAULT 'monatlich',
  kategorie TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fixkosten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixkosten_policy" ON fixkosten FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Variable Kosten
CREATE TABLE IF NOT EXISTS variable_kosten (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  betrag NUMERIC NOT NULL,
  datum TEXT NOT NULL,
  kategorie TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE variable_kosten ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variable_kosten_policy" ON variable_kosten FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Einnahmen
CREATE TABLE IF NOT EXISTS einnahmen (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  betrag NUMERIC NOT NULL,
  intervall TEXT NOT NULL DEFAULT 'monatlich',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE einnahmen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "einnahmen_policy" ON einnahmen FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kategorie TEXT NOT NULL,
  betrag NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_policy" ON budgets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Eigene Schnelleingaben
CREATE TABLE IF NOT EXISTS eigene_schnelleingaben (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  kategorie TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE eigene_schnelleingaben ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schnelleingaben_policy" ON eigene_schnelleingaben FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime für alle Tabellen aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE fixkosten;
ALTER PUBLICATION supabase_realtime ADD TABLE variable_kosten;
ALTER PUBLICATION supabase_realtime ADD TABLE einnahmen;
ALTER PUBLICATION supabase_realtime ADD TABLE budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE eigene_schnelleingaben;
