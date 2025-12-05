# Fixing RLS (Row Level Security) Issues

If you're seeing "Setup Required" errors when scanning QR codes, it's likely because Supabase has Row Level Security (RLS) enabled by default, which blocks all access unless policies are set.

## Quick Fix: Disable RLS

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL:

```sql
-- Disable RLS for all tables
ALTER TABLE garages DISABLE ROW LEVEL SECURITY;
ALTER TABLE buses DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_snapshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;
```

## Alternative: Use the Migration File

You can also run the migration file `supabase/migrations/002_rls_policies.sql` in the Supabase SQL Editor.

## Verify Service Role Key

Make sure your `.env.local` file has the `SUPABASE_SERVICE_ROLE_KEY` set. This key bypasses RLS, so if it's set correctly, you shouldn't have RLS issues.

```env
NEXT_PUBLIC_SUPABASE_URL="your-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # This is important!
```

## After Fixing RLS

1. Restart your dev server: `npm run dev`
2. Try scanning a QR code again
3. The garages should now be accessible

