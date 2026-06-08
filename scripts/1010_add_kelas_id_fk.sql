-- ============================================
-- Migration: Add kelas_id FK to users table
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Tambah kolom kelas_id (nullable UUID, FK ke kelas)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL;

-- 2. Migrasi data existing: cocokkan users.kelas (text) → kelas.id
UPDATE public.users u
SET kelas_id = k.id
FROM public.kelas k
WHERE u.kelas IS NOT NULL AND u.kelas = k.name;

-- 3. Verifikasi hasil migrasi
SELECT
  u.id,
  u.username,
  u.kelas AS old_kelas_text,
  k.name AS new_kelas_name,
  u.kelas_id
FROM public.users u
LEFT JOIN public.kelas k ON k.id = u.kelas_id
ORDER BY u.username;

-- ============================================
-- JALANKAN INI CUMA SETELAH VERIFIKASI OK:
-- ============================================
-- ALTER TABLE public.users DROP COLUMN IF EXISTS kelas;
-- ⚠️ Hapus kolom lama hanya setelah yakin data benar!
