-- Add race class/category support to existing MTRPRV users.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kelas TEXT CHECK (kelas IN ('42', '21', '10', 'No-Race')) DEFAULT 'No-Race';

UPDATE users SET kelas = 'No-Race' WHERE kelas IS NULL;
