-- Create AI Prediction History table
CREATE TABLE IF NOT EXISTS ai_prediction_history (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    fuel_level DOUBLE PRECISION,
    battery_voltage DOUBLE PRECISION,
    load_power DOUBLE PRECISION,
    rpm DOUBLE PRECISION,
    generator_frequency DOUBLE PRECISION,
    rule_based_prediction DOUBLE PRECISION,
    ai_corrected_prediction DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    actual_value DOUBLE PRECISION,
    actual_value_timestamp TIMESTAMP,
    CONSTRAINT fk_prediction_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX idx_device_timestamp ON ai_prediction_history(device_id, timestamp);
CREATE INDEX idx_prediction_type ON ai_prediction_history(prediction_type, timestamp);

-- Create AI Model State table
CREATE TABLE IF NOT EXISTS ai_model_state (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    coefficient0 DOUBLE PRECISION,
    coefficient1 DOUBLE PRECISION,
    coefficient2 DOUBLE PRECISION,
    coefficient3 DOUBLE PRECISION,
    training_data_count INTEGER,
    mean_absolute_error DOUBLE PRECISION,
    r_squared DOUBLE PRECISION,
    last_trained_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_model_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Create index for faster model lookups
CREATE INDEX idx_model_device_type ON ai_model_state(device_id, model_type);

-- Add unique constraint to ensure one model per device per type
CREATE UNIQUE INDEX idx_unique_model ON ai_model_state(device_id, model_type);
