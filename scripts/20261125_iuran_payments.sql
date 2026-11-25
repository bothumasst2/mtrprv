-- Monthly athlete payment tracking and login block records.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'coach', 'admin')) DEFAULT 'user';

CREATE TABLE IF NOT EXISTS user_blocks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blocked_by UUID,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iuran_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE iuran_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_iuran_payments_user_month_year
  ON iuran_payments(user_id, month, year);

CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.users WHERE id = uid;
$$;

DROP POLICY IF EXISTS "Users can view own block" ON user_blocks;
DROP POLICY IF EXISTS "Coaches can view blocks" ON user_blocks;
CREATE POLICY "Users can view own block" ON user_blocks
  FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('coach', 'admin'));
CREATE POLICY "Coaches can modify blocks" ON user_blocks
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('coach', 'admin'));

DROP POLICY IF EXISTS "Users can view iuran" ON iuran_payments;
DROP POLICY IF EXISTS "Coaches can modify iuran" ON iuran_payments;
CREATE POLICY "Users can view iuran" ON iuran_payments
  FOR SELECT USING (auth.uid() = user_id OR public.get_user_role(auth.uid()) IN ('coach', 'admin'));
CREATE POLICY "Coaches can modify iuran" ON iuran_payments
  FOR ALL USING (public.get_user_role(auth.uid()) IN ('coach', 'admin'));
CREATE POLICY "Users can create pending iuran" ON iuran_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
