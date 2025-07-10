-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user', 'coach', 'admin')) DEFAULT 'user';

-- Update existing users to have 'user' role by default
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create training_assignments table for coach-to-user assignments
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  training_type TEXT NOT NULL,
  training_details TEXT,
  assigned_date DATE NOT NULL,
  target_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for training_assignments
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for training_assignments
CREATE POLICY "Coaches can view their assignments" ON training_assignments
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can create assignments" ON training_assignments
  FOR INSERT WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Users can view their assignments" ON training_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update assignment status" ON training_assignments
  FOR UPDATE USING (auth.uid() = user_id);
