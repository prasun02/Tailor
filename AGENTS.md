# Tailor Store Manager Project Instructions

## Objective

Build a secure, cost-effective, mobile-first tailor store management PWA for customers, measurements, garment styles, tailoring orders, production progress, payments, receipts, reports, and backups.

## Required Stack

Use React, Vite, TypeScript, Tailwind CSS, React Router, Supabase PostgreSQL, Supabase Auth, Supabase JavaScript client, TanStack Query, React Hook Form, Zod, Vitest, React Testing Library, Playwright, vite-plugin-pwa, Git/GitHub, and Cloudflare Pages.

Do not use Next.js, Firebase, Prisma, MongoDB, Express, a custom Node backend, paid APIs, AI APIs, phone OTP, SMS, WhatsApp API, online payments, or full offline database synchronization.

## Cost And Security

Design for Supabase Free, Cloudflare Pages Free, and GitHub Free. Use pagination and date filters. Do not fetch entire collections unnecessarily.

Only expose `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never expose service-role keys. Every business table must include `shop_id`, use RLS, and only allow access for active shop members.

Use secure PostgreSQL functions for atomic business operations. Every `SECURITY DEFINER` function must set `search_path`, validate `auth.uid()`, validate shop membership and inputs, avoid dynamic SQL, and grant execution only to appropriate roles.

## Business Rules

The app is multi-shop-ready. Roles are owner, manager, staff, cutter, tailor, and viewer. Display dates and times in Asia/Dhaka, use BDT, and default measurements to inches while supporting centimeters.

Separate physical measurements from garment style choices. Never overwrite historical measurements. Every order item must save immutable measurement and style snapshots. Production status lives at order-item level and every status change is recorded.

Payments are append-only. Voiding a payment must update status or create history rather than deleting financial records. Due amount must be calculated by the database.

## Development Method

At the beginning of every task, inspect the repository, read this file, explain intended changes, identify affected files, and identify database migration requirements.

After every task, run lint, TypeScript checking, relevant tests, and production build. Fix errors, summarize changed files, list manual steps, suggest a Git commit message, and stop for the next phase.

## Migration Rules

Store SQL migrations in `supabase/migrations/` using sequential names such as `0001_initial_schema.sql`. Never edit a production-applied migration; create a new migration for later database changes.
