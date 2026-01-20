-- =====================================================
-- Database Migration: Update Threshold Parameters
-- =====================================================
-- This script updates the device_thresholds table to support
-- the new 18 threshold parameter groups.
--
-- Run this script on your PostgreSQL database before starting
-- the application with the new threshold features.
-- =====================================================

-- Step 1: Drop the old check constraint
ALTER TABLE device_thresholds DROP CONSTRAINT IF EXISTS device_thresholds_parameter_check;

-- Step 2: Add new check constraint with all 18 threshold parameters
ALTER TABLE device_thresholds ADD CONSTRAINT device_thresholds_parameter_check
CHECK (parameter IN (
    'RPM',
    'GENERATOR_FREQUENCY',
    'MAINS_BUS_FREQUENCY',
    'GENERATOR_VOLTAGE_LN',
    'GENERATOR_VOLTAGE_LL',
    'MAINS_BUS_VOLTAGE_LN',
    'MAINS_BUS_VOLTAGE_LL',
    'GENERATOR_CURRENT',
    'REAL_POWER',
    'REACTIVE_POWER',
    'POWER_FACTOR',
    'EARTH_FAULT_CURRENT',
    'ROCOF',
    'OIL_PRESSURE',
    'OIL_TEMPERATURE',
    'FUEL_LEVEL',
    'BATTERY_VOLTAGE',
    'E_STOP'
));

-- Step 3: (Optional) Delete old threshold records if you want to start fresh
-- Uncomment the line below if you want to remove old thresholds
-- DELETE FROM device_thresholds;

-- Verify the constraint was created successfully
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'device_thresholds'::regclass
AND conname = 'device_thresholds_parameter_check';

-- Done! You should see the new constraint definition above.
