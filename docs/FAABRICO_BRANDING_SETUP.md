# Faabrico Branding Setup

Faabrico branding is resolved in this order:

1. `public.shops.logo_url` from Supabase.
2. Bundled app asset `/brand/faabrico-logo-140x47.png`.
3. Text fallback `Faabrico`.

The app uses the loaded Supabase shop profile at runtime. `VITE_APP_NAME` is only a pre-shop fallback and should remain `Faabrico`.

## Shop Profile SQL

Run this in Supabase SQL editor if the current shop profile still has old business details:

```sql
update public.shops
set
name = 'Faabrico',
phone = '+880 1714-793555',
address = '5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka',
updated_at = now()
where deleted_at is null;

NOTIFY pgrst, 'reload schema';
```

## Logo URL SQL

After uploading the official logo to a public Supabase Storage URL, run:

```sql
update public.shops
set
logo_url = 'PASTE_FAABRICO_LOGO_PUBLIC_URL_HERE',
updated_at = now()
where name = 'Faabrico';

NOTIFY pgrst, 'reload schema';
```

If no hosted logo URL is configured, the bundled Faabrico PNG is used automatically. The current schema does not include a tagline column, so the app uses the fixed tagline `Bespoke Tailoring Order & Production Desk`.