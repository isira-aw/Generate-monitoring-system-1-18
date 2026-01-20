-- Migration to support new threshold parameters

-- Drop the old check constraint if it exists
ALTER TABLE device_thresholds DROP CONSTRAINT IF EXISTS device_thresholds_parameter_check;

-- Add new check constraint with all 18 threshold parameters
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
