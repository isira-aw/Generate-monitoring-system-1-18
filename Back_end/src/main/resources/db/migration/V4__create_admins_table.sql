-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add license_enabled column to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS license_enabled BOOLEAN DEFAULT TRUE;

-- Update any existing NULL values to TRUE
UPDATE devices SET license_enabled = TRUE WHERE license_enabled IS NULL;
