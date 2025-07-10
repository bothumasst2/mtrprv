-- Insert sample users (you'll need to create these users in Supabase Auth first)
-- This is just example data structure

-- Sample training agenda
INSERT INTO training_agenda (user_id, date, training_type, target_distance) VALUES
  ('your-user-id-here', '2025-01-15', 'Easy Run', 5.0),
  ('your-user-id-here', '2025-01-17', 'Long Run', 10.0),
  ('your-user-id-here', '2025-01-20', 'Speed Work', 3.0);

-- Sample training logs
INSERT INTO training_log (user_id, date, training_type, distance, status) VALUES
  ('your-user-id-here', '2025-01-10', 'Easy Run Zone 2', 5.2, 'completed'),
  ('your-user-id-here', '2025-01-12', 'Long Run', 8.5, 'completed'),
  ('your-user-id-here', '2025-01-14', 'Medium Run (Speed)', 4.0, 'missed'),
  ('your-user-id-here', '2025-01-16', 'Fartlek Run (Speed)', 6.0, 'completed');
