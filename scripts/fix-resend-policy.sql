-- =====================================================
-- FIX: Add RLS Policy for Coach to UPDATE training_assignments
-- =====================================================
-- Run this script in Supabase SQL Editor
-- =====================================================

-- Step 1: Update status column to include 'missed' status
-- First, drop the existing constraint if it exists
ALTER TABLE training_assignments DROP CONSTRAINT IF EXISTS training_assignments_status_check;

-- Add new constraint with 'missed' status included
ALTER TABLE training_assignments 
ADD CONSTRAINT training_assignments_status_check 
CHECK (status IN ('pending', 'completed', 'missed'));

-- Step 2: Add UPDATE policy for Coaches
-- This allows coaches to update their own assignments (for Re-send feature)
DROP POLICY IF EXISTS "Coaches can update their assignments" ON training_assignments;

CREATE POLICY "Coaches can update their assignments" ON training_assignments
  FOR UPDATE 
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Step 3: Add DELETE policy for Coaches (for Delete feature)
DROP POLICY IF EXISTS "Coaches can delete their assignments" ON training_assignments;

CREATE POLICY "Coaches can delete their assignments" ON training_assignments
  FOR DELETE 
  USING (auth.uid() = coach_id);

-- =====================================================
-- VERIFICATION: Check policies after running
-- =====================================================
-- Run this to verify policies are created:
-- SELECT * FROM pg_policies WHERE tablename = 'training_assignments';
