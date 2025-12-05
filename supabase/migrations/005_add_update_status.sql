-- Add 'UPDATE' status to maintenance_status enum
ALTER TYPE maintenance_status ADD VALUE IF NOT EXISTS 'UPDATE';

