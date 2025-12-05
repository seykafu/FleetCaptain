-- Maintenance Users table
CREATE TABLE maintenance_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for name search
CREATE INDEX idx_maintenance_users_name ON maintenance_users(name);

-- Add trigger for updated_at
CREATE TRIGGER update_maintenance_users_updated_at BEFORE UPDATE ON maintenance_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS for maintenance_users (internal data)
ALTER TABLE maintenance_users DISABLE ROW LEVEL SECURITY;

-- Insert some sample maintenance users
INSERT INTO maintenance_users (name, email) VALUES
  ('John Smith', 'john.smith@fleetcaptain.com'),
  ('Jane Doe', 'jane.doe@fleetcaptain.com'),
  ('Mike Johnson', 'mike.johnson@fleetcaptain.com'),
  ('Sarah Williams', 'sarah.williams@fleetcaptain.com'),
  ('Tom Brown', 'tom.brown@fleetcaptain.com'),
  ('Emily Davis', 'emily.davis@fleetcaptain.com'),
  ('Robert Wilson', 'robert.wilson@fleetcaptain.com'),
  ('Lisa Anderson', 'lisa.anderson@fleetcaptain.com')
ON CONFLICT (email) DO NOTHING;

