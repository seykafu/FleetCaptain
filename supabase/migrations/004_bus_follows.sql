-- Bus Follows table - tracks who follows which buses for notifications
CREATE TABLE bus_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References maintenance_users.id
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bus_id) -- Prevent duplicate follows
);

-- Create indexes for efficient lookups
CREATE INDEX idx_bus_follows_user_id ON bus_follows(user_id);
CREATE INDEX idx_bus_follows_bus_id ON bus_follows(bus_id);

-- Disable RLS for bus_follows (internal data)
ALTER TABLE bus_follows DISABLE ROW LEVEL SECURITY;

