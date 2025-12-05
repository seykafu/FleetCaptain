-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE bus_status AS ENUM ('AVAILABLE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE');
CREATE TYPE maintenance_type AS ENUM ('INCIDENT', 'PREVENTIVE', 'REPAIR', 'INSPECTION');
CREATE TYPE severity AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE maintenance_status AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE notification_type AS ENUM ('INCIDENT', 'BUS_IN_GARAGE', 'REPAIR_COMPLETED', 'FORECAST_UPDATE');
CREATE TYPE notification_status AS ENUM ('SENT', 'FAILED');

-- Garages table
CREATE TABLE garages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buses table
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fleet_number TEXT UNIQUE NOT NULL,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
  status bus_status DEFAULT 'AVAILABLE',
  mileage INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance events table
CREATE TABLE maintenance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
  mechanic_name TEXT NOT NULL,
  type maintenance_type NOT NULL,
  severity severity NOT NULL,
  description TEXT NOT NULL,
  parts_used TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status maintenance_status DEFAULT 'NEW',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
  reported_by TEXT NOT NULL,
  severity severity NOT NULL,
  description TEXT NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_maintenance_event_id UUID REFERENCES maintenance_events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  part_number TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE RESTRICT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forecast snapshots table
CREATE TABLE forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_generated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  target_date TIMESTAMP WITH TIME ZONE NOT NULL,
  available_bus_count INTEGER NOT NULL,
  unavailable_bus_count INTEGER NOT NULL,
  high_risk_bus_count INTEGER NOT NULL,
  metadata JSONB
);

-- Notification logs table
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type notification_type NOT NULL,
  bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  sent_to TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status notification_status DEFAULT 'SENT'
);

-- Create indexes
CREATE INDEX idx_buses_garage_id ON buses(garage_id);
CREATE INDEX idx_buses_fleet_number ON buses(fleet_number);
CREATE INDEX idx_buses_status ON buses(status);
CREATE INDEX idx_maintenance_events_bus_id ON maintenance_events(bus_id);
CREATE INDEX idx_maintenance_events_garage_id ON maintenance_events(garage_id);
CREATE INDEX idx_maintenance_events_status ON maintenance_events(status);
CREATE INDEX idx_incidents_bus_id ON incidents(bus_id);
CREATE INDEX idx_incidents_garage_id ON incidents(garage_id);
CREATE INDEX idx_inventory_items_garage_id ON inventory_items(garage_id);
CREATE INDEX idx_forecast_snapshots_target_date ON forecast_snapshots(target_date);
CREATE INDEX idx_forecast_snapshots_date_generated ON forecast_snapshots(date_generated);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_garages_updated_at BEFORE UPDATE ON garages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_events_updated_at BEFORE UPDATE ON maintenance_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

