# Iuran Athlete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan sistem iuran bulanan ActiveFit ke mtrprv dengan block login mulai tanggal 5.

**Architecture:** Supabase menyimpan `iuran_payments` per bulan dan `user_blocks` tetap menjadi sumber block. `lib/iuran.ts` memusatkan status, lazy pending record, dan aturan deadline; `AuthProvider` menegakkan aturan saat session/login. UI memakai halaman login, dashboard, dan profile yang sudah ada.

**Tech Stack:** Next.js 14, React, TypeScript, Supabase, Tailwind, existing Radix UI.

**Spec:** `docs/superpowers/specs/2026-11-25-iuran-athlete-design.md`

## Global Constraints

- Deadline tetap tanggal 5 setiap bulan.
- Status hanya `pending` atau `paid`.
- Coach/admin tidak terkena block iuran.
- Jangan menambah dependency.
- Jangan mengubah branding atau layout di luar kebutuhan fitur.

## Review Focus

- Tanggal 1–4: user belum bayar tetap bisa login; test pure deadline rule.
- Tanggal 5+: user tanpa record atau `pending` diblokir; test both states.
- Role coach/admin: tidak diblokir; test role bypass.
- Konfirmasi dengan user ID kosong atau service key hilang: return error, tanpa mutasi.
- Payment update gagal: jangan menghapus `user_blocks` sebelum upsert berhasil.

### Task 1: Payment schema and pure iuran rules

**Files:**
- Create: `scripts/20261125_iuran_payments.sql`
- Create: `lib/iuran.ts`
- Create: `scripts/test-iuran.mjs`

**Interfaces:**
- Produces `getIuranStatus(userId)`, `ensureIuranRecord(userId, month?, year?)`, `shouldBlockForIuran(userId)`.
- Produces pure `isPastIuranDeadline(dayOfMonth)` for assert-based regression checks.

- [ ] Add SQL table, checks, index, RLS policies for `iuran_payments`.
- [ ] Write failing assert checks for days 4/5 and statuses `paid`/`pending`.
- [ ] Run `node scripts/test-iuran.mjs`; verify failure before implementation.
- [ ] Implement helper using current-month queries and role bypass.
- [ ] Run `node scripts/test-iuran.mjs`; verify pass.

### Task 2: Auth block enforcement and login messaging

**Files:**
- Modify: `contexts/auth-context.tsx`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Auth check signs out blocked users and redirects to `/login?blocked=true` or `/login?iuran_blocked=true`.
- Login page renders Indonesian iuran message from query parameter.

- [ ] Add block-check test coverage through the pure helper contract before production edits.
- [ ] Extend auth provider with existing `user_blocks` check plus iuran check, preserving coach/admin bypass and retry-on-error behavior.
- [ ] Add login query parsing and accessible alert copy.
- [ ] Run TypeScript validation.

### Task 3: Dashboard notification

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Athlete dashboard lazily ensures current-month record and shows pending notification before deadline.

- [ ] Add pending-state render beside existing dashboard content without changing existing stats behavior.
- [ ] Verify paid state hides banner and pending/null state shows it.
- [ ] Run TypeScript validation.

### Task 4: Coach profile payment management

**Files:**
- Modify: `actions/coach.ts`
- Modify: `app/(dashboard)/profile/page.tsx`

**Interfaces:**
- `confirmIuranPayment(formData: FormData)` validates `user_id`, upserts current month as `paid`, then deletes that user block.
- Profile coach/admin section lists role `user` athletes with payment and block status and exposes confirmation action.

- [ ] Add server-action validation and failure ordering.
- [ ] Add profile state, parallel fetches, confirmation handler, loading/error/success states.
- [ ] Render compact table/cards using existing `Card`, `Button`, `Badge`, and toast patterns.
- [ ] Run TypeScript validation and inspect changed callers with CodeGraph.

### Task 5: Verification

**Files:**
- No new production files.

- [ ] Run `node scripts/test-iuran.mjs`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and inspect `git diff` for scope, secrets, and accidental data changes.

