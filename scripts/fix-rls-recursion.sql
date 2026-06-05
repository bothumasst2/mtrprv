-- ==============================================================
-- HOTFIX: RLS recursion — policies querying users from users
-- Solution: SECURITY DEFINER function to bypass RLS for role check
-- ==============================================================

-- 1. Create a SECURITY DEFINER function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = uid;
$$;

-- 2. Drop all coach/admin policies that cause recursion
DROP POLICY IF EXISTS "Coaches can view all users" ON users;
DROP POLICY IF EXISTS "Coaches can update any user" ON users;
DROP POLICY IF EXISTS "Coaches can view all training_log" ON training_log;
DROP POLICY IF EXISTS "Coaches can view all training_assignments" ON training_assignments;
DROP POLICY IF EXISTS "Coaches can insert training_assignments" ON training_assignments;
DROP POLICY IF EXISTS "Coaches can delete training_assignments" ON training_assignments;
DROP POLICY IF EXISTS "Coaches can update training_assignments" ON training_assignments;
DROP POLICY IF EXISTS "Coaches and admins can reset ranking" ON ranking_reset;
DROP POLICY IF EXISTS "Coaches and admins can update ranking_reset" ON ranking_reset;
DROP POLICY IF EXISTS "Coaches and admins can insert kelas" ON kelas;
DROP POLICY IF EXISTS "Coaches and admins can update kelas" ON kelas;
DROP POLICY IF EXISTS "Coaches and admins can delete kelas" ON kelas;

-- 3. Re-create all policies using the SECURITY DEFINER function

-- users table
CREATE POLICY "Coaches can view all users" ON users
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = id
  );

CREATE POLICY "Coaches can update any user" ON users
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = id
  );

-- training_log
CREATE POLICY "Coaches can view all training_log" ON training_log
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = user_id
  );

-- training_assignments
CREATE POLICY "Coaches can view all training_assignments" ON training_assignments
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = user_id
    OR auth.uid() = coach_id
  );

CREATE POLICY "Coaches can insert training_assignments" ON training_assignments
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );

CREATE POLICY "Coaches can delete training_assignments" ON training_assignments
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = coach_id
  );

CREATE POLICY "Coaches can update training_assignments" ON training_assignments
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
    OR auth.uid() = user_id
    OR auth.uid() = coach_id
  );

-- ranking_reset
CREATE POLICY "Coaches and admins can reset ranking" ON ranking_reset
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );

CREATE POLICY "Coaches and admins can update ranking_reset" ON ranking_reset
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );

-- kelas
CREATE POLICY "Coaches and admins can insert kelas" ON kelas
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );

CREATE POLICY "Coaches and admins can update kelas" ON kelas
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );

CREATE POLICY "Coaches and admins can delete kelas" ON kelas
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('coach', 'admin')
  );
