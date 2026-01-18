#!/bin/bash

# MQTT Test Publisher for Generator Monitoring System
# This script publishes test telemetry data to the MQTT broker

# Configuration
MQTT_HOST=${MOSQUITTO_HOST:-localhost}
MQTT_PORT=${MOSQUITTO_PORT:-1883}
MQTT_USER=${MOSQUITTO_USERNAME:-mqtt_user}
MQTT_PASS=${MOSQUITTO_PASSWORD:-mqtt_password}
DEVICE_ID=${1:-GEN001}

echo "Publishing test data for device: $DEVICE_ID"
echo "MQTT Broker: $MQTT_HOST:$MQTT_PORT"
echo "---"

# Function to generate random value within range
random_value() {
    local min=$1
    local max=$2
    echo "scale=2; $min + ($RANDOM % ($max - $min))" | bc
}

# Continuous publishing loop
while true; do
    # Generate random but realistic values
    VOLTAGE=$(random_value 220 240)
    CURRENT=$(random_value 40 60)
    FREQUENCY=$(random_value 49 51)
    POWER=$(random_value 80 95)
    TEMPERATURE=$(random_value 60 90)
    FUEL_LEVEL=$(random_value 30 90)
    OIL_PRESSURE=$(random_value 45 70)
    RPM=$(random_value 1450 1550)

    # Create JSON payload
    PAYLOAD=$(cat <<EOF
{
  "voltage": $VOLTAGE,
  "current": $CURRENT,
  "frequency": $FREQUENCY,
  "power": $POWER,
  "temperature": $TEMPERATURE,
  "fuelLevel": $FUEL_LEVEL,
  "oilPressure": $OIL_PRESSURE,
  "rpm": $RPM,
  "device_alarms": []
}
EOF
)

    # Publish to MQTT
    mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
        -u "$MQTT_USER" -P "$MQTT_PASS" \
        -t "generator/$DEVICE_ID/data" \
        -m "$PAYLOAD"

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Published data for $DEVICE_ID"
    echo "  Voltage: ${VOLTAGE}V, Current: ${CURRENT}A, Frequency: ${FREQUENCY}Hz"
    echo "  Power: ${POWER}kW, Temp: ${TEMPERATURE}°C, Fuel: ${FUEL_LEVEL}%"
    echo "---"

    # Wait 5 seconds before next update
    sleep 5
done
