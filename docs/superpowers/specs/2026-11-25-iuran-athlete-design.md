# Iuran Athlete Design

**Status:** Approved approach; implementation pending plan review

## Intent

Duplikasi alur iuran bulanan ActiveFit-App ke mtrprv: athlete menerima notifikasi pembayaran, coach/admin mengonfirmasi pembayaran dari profile, dan athlete yang belum lunas diblokir mulai tanggal 5.

## Goals

- Simpan status pembayaran per user, bulan, dan tahun.
- Buat record `pending` secara lazy.
- Blokir role `user` pada login mulai tanggal 5 jika status bukan `paid`.
- Tampilkan pesan block di login dan notifikasi iuran di dashboard.
- Tambahkan manajemen iuran athlete di profile coach/admin.
- Reuse `user_blocks` untuk unblock setelah pembayaran dikonfirmasi.

## Non-goals

- Payment gateway atau verifikasi transfer otomatis.
- Cron wajib; auto-block dijalankan saat login check, seperti ActiveFit.
- Perubahan visual besar di luar komponen yang sudah ada.

## Constraints

- Deadline tetap tanggal 5 setiap bulan.
- Status hanya `pending` atau `paid`.
- Coach/admin tidak terkena block iuran.
- Server action memakai service-role key yang sudah dipakai `actions/coach.ts`.
- Migration SQL dijalankan manual melalui Supabase SQL Editor atau migration workflow proyek.

## Approach

Duplikasi alur ActiveFit dengan komponen minimum mtrprv: migration, `lib/iuran.ts`, auth enforcement, login message, dashboard banner, profile management, dan server action. Gunakan query paralel di profile, validasi ID, serta error handling konsisten dengan kode yang sudah ada.

## Acceptance

- Athlete sebelum tanggal 5 dapat login meski belum bayar.
- Athlete pada/ setelah tanggal 5 tanpa status `paid` logout otomatis dan kembali ke `/login?iuran_blocked=true`.
- Coach/admin tetap dapat login.
- Coach mengonfirmasi pembayaran: upsert `paid`, isi `paid_at`, hapus block.
- Dashboard menampilkan notifikasi hanya untuk athlete yang belum `paid`.

