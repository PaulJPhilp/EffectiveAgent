-- Migration: 0000_initial
-- Description: Sets up the migration tracking table and base repository functions

-- Enable UUID extension for ID generation if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS drizzle_migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function for initializing timestamps
CREATE OR REPLACE FUNCTION initialize_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql'; 