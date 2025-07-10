-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  profile_photo TEXT,
  strava_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training_log table
CREATE TABLE IF NOT EXISTS training_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  training_type TEXT NOT NULL,
  distance DECIMAL(5,2) NOT NULL,
  strava_link TEXT,
  status TEXT CHECK (status IN ('completed', 'pending', 'missed')) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create training_agenda table
CREATE TABLE IF NOT EXISTS training_agenda (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  training_type TEXT NOT NULL,
  target_distance DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_agenda ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own training logs" ON training_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training logs" ON training_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training logs" ON training_log
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training logs" ON training_log
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own training agenda" ON training_agenda
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training agenda" ON training_agenda
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training agenda" ON training_agenda
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own training agenda" ON training_agenda
  FOR DELETE USING (auth.uid() = user_id);

-- Allow users to view all users for ranking (but only basic info)
CREATE POLICY "Users can view all users for ranking" ON users
  FOR SELECT USING (true);

-- Allow users to view all training logs for ranking
CREATE POLICY "Users can view all training logs for ranking" ON training_log
  FOR SELECT USING (true);
