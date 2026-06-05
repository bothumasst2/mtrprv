-- ==============================================================
-- Migration: Add ranking_reset table & dynamic kelas management
-- ==============================================================

-- 1. Create ranking_reset table (single-row; id=true is always the row)
CREATE TABLE IF NOT EXISTS ranking_reset (
  id           BOOLEAN PRIMARY KEY DEFAULT true,
  cutoff_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reset_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create kelas table (dynamic class management)
CREATE TABLE IF NOT EXISTS kelas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Seed default classes (matches existing users.kelas CHECK values)
INSERT INTO kelas (name, sort_order) VALUES
  ('42', 1),
  ('21', 2),
  ('10', 3),
  ('No-Race', 4)
ON CONFLICT (name) DO NOTHING;

-- 4. Relax users.kelas constraint — drop hardcoded CHECK so
--    classes can be managed dynamically via the kelas table.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_kelas_check;
-- (The column itself stays TEXT, default 'No-Race')

-- 5. Enable RLS on new tables
ALTER TABLE ranking_reset ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for ranking_reset
--    Everyone can READ the cutoff date (shown on ranking page)
CREATE POLICY "Anyone can view ranking_reset" ON ranking_reset
  FOR SELECT USING (true);

--    Only coaches and admins can UPSERT (reset ranking)
--    Service-role key is used server-side, but for safety:
CREATE POLICY "Coaches and admins can reset ranking" ON ranking_reset
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

CREATE POLICY "Coaches and admins can update ranking_reset" ON ranking_reset
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- 7. RLS policies for kelas table
--    Everyone can READ the kelas list (used in drop-downs)
CREATE POLICY "Anyone can view kelas" ON kelas
  FOR SELECT USING (true);

--    Coaches and admins can INSERT (add new class)
CREATE POLICY "Coaches and admins can insert kelas" ON kelas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

--    Coaches and admins can UPDATE (edit class name / sort_order)
CREATE POLICY "Coaches and admins can update kelas" ON kelas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

--    Coaches and admins can DELETE
CREATE POLICY "Coaches and admins can delete kelas" ON kelas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- 8. Grant coach/admin full access to users table for athlete management
--    (These handle the coach CRUD use cases)

CREATE POLICY "Coaches can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

CREATE POLICY "Coaches can update any user" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- 9. Allow coaches/admins to view all training data
CREATE POLICY "Coaches can view all training_log" ON training_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- (training_assignments already exists from previous migrations,
--  but ensure it has RLS enabled and policies)
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing if any, re-create cleanly
DROP POLICY IF EXISTS "Coaches can view all training_assignments" ON training_assignments;
CREATE POLICY "Coaches can view all training_assignments" ON training_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

DROP POLICY IF EXISTS "Coaches can insert training_assignments" ON training_assignments;
CREATE POLICY "Coaches can insert training_assignments" ON training_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

DROP POLICY IF EXISTS "Coaches can delete training_assignments" ON training_assignments;
CREATE POLICY "Coaches can delete training_assignments" ON training_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

DROP POLICY IF EXISTS "Coaches can update training_assignments" ON training_assignments;
CREATE POLICY "Coaches can update training_assignments" ON training_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );
