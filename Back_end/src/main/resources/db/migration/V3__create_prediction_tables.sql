-- Create table for fuel level prediction history
CREATE TABLE fuel_prediction_history (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    fuel_level DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_fuel_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_fuel_device_timestamp ON fuel_prediction_history(device_id, timestamp DESC);

-- Create table for battery prediction history
CREATE TABLE battery_prediction_history (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    battery_soc DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_battery_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_battery_device_timestamp ON battery_prediction_history(device_id, timestamp DESC);

-- Create table to store calculated decline rates
CREATE TABLE prediction_metrics (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL UNIQUE,
    fuel_decline_rate DOUBLE PRECISION,
    battery_decline_rate DOUBLE PRECISION,
    fuel_predicted_runtime_hours DOUBLE PRECISION,
    battery_predicted_runtime_hours DOUBLE PRECISION,
    last_updated TIMESTAMP NOT NULL,
    CONSTRAINT fk_prediction_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create index for device_id
CREATE INDEX idx_prediction_device ON prediction_metrics(device_id);
