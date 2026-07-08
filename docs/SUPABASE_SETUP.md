# Supabase Setup

## Apply The Migration

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/0001_initial_schema.sql` from this repository.
4. Copy the full SQL file into a new SQL Editor query.
5. Run it once on a new project.
6. Run each later migration in order, starting with `supabase/migrations/0002_auth_membership_onboarding.sql`.
7. If the app reports that `get_current_user_shop_memberships` is missing from the schema cache, run `supabase/migrations/0003_current_user_active_shop_memberships.sql` in the SQL Editor. It includes the PostgREST schema reload notification.

Do not run `0001_initial_schema.sql` twice on the same project. After production use, later schema changes must be new sequential migrations.

## Authentication

Use Supabase email-and-password authentication. Create the first Supabase Auth user manually in the dashboard, then sign in through the app and complete onboarding. The frontend must only receive:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Never expose the Supabase service-role key, legacy secret key, or any server-only credential in a Vite environment variable.

Recommended Auth settings:

- Enable email/password sign-in.
- Keep phone provider/OTP disabled for this project.
- Set **Site URL** to the deployed Cloudflare Pages URL in production.
- Add local redirect URLs for development:
  - `http://localhost:5173`
  - `http://localhost:5173/reset-password`
- Add production redirect URLs:
  - `https://your-cloudflare-pages-domain.pages.dev`
  - `https://your-cloudflare-pages-domain.pages.dev/reset-password`
- If using a custom domain, add the custom domain and `/reset-password` URL too.
- Configure password recovery emails to use the Supabase recovery link that redirects to `/reset-password`.

## First Shop Creation

After the first manually created user signs in, the app calls the RPC from `/onboarding`:

```ts
await supabase.rpc('create_shop_with_owner', {
  owner_full_name: 'Owner Name',
  owner_phone: '01700000000',
  shop_name: 'Example Tailors',
  shop_phone: '01700000000',
  shop_address: 'Shop address',
  shop_logo_url: null,
});
```

The RPC creates the profile, shop, owner membership, counters, default garment types, default measurement fields, and default style fields.

The browser must not insert directly into `shops` or `shop_members`. Onboarding is complete only after `create_shop_with_owner` succeeds and the active owner membership reloads through `get_current_user_shop_memberships`.

## Recommended Supabase Settings

- Keep Row-Level Security enabled on all exposed tables.
- Disable anonymous business-table access.
- Use email confirmation according to the shop's operational needs.
- Back up the database before applying future migrations.
- Use Supabase Free limits carefully with pagination and date-filtered queries.

## Local Development

Set `.env.local` from `.env.example`, then run:

```bash
npm run dev
```

The migration is not applied automatically by this repository.
