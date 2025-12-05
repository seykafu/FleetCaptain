-- RLS Policies for FleetCaptain
-- These policies allow full access for internal use
-- In production, you may want to restrict these based on user roles

-- Disable RLS for garages (internal reference data)
ALTER TABLE garages DISABLE ROW LEVEL SECURITY;

-- Disable RLS for buses (internal data)
ALTER TABLE buses DISABLE ROW LEVEL SECURITY;

-- Disable RLS for maintenance_events (internal data)
ALTER TABLE maintenance_events DISABLE ROW LEVEL SECURITY;

-- Disable RLS for incidents (internal data)
ALTER TABLE incidents DISABLE ROW LEVEL SECURITY;

-- Disable RLS for inventory_items (internal data)
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS for forecast_snapshots (internal data)
ALTER TABLE forecast_snapshots DISABLE ROW LEVEL SECURITY;

-- Disable RLS for notification_logs (internal data)
ALTER TABLE notification_logs DISABLE ROW LEVEL SECURITY;

-- Alternative: If you prefer to keep RLS enabled, use these policies instead:
-- (Comment out the DISABLE statements above and uncomment these)

-- ALTER TABLE garages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on garages" ON garages
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on buses" ON buses
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on maintenance_events" ON maintenance_events
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on incidents" ON incidents
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on inventory_items" ON inventory_items
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on forecast_snapshots" ON forecast_snapshots
--   FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations on notification_logs" ON notification_logs
--   FOR ALL USING (true) WITH CHECK (true);

