-- Add 'UPDATE' status to maintenance_status enum
ALTER TYPE maintenance_status ADD VALUE IF NOT EXISTS 'UPDATE';

-- Add 'UPDATE' type to maintenance_type enum
ALTER TYPE maintenance_type ADD VALUE IF NOT EXISTS 'UPDATE';

