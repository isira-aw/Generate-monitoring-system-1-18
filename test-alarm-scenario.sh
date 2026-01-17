#!/bin/bash

# MQTT Alarm Test Publisher
# This script publishes data that should trigger alarms

MQTT_HOST=${MOSQUITTO_HOST:-localhost}
MQTT_PORT=${MOSQUITTO_PORT:-1883}
MQTT_USER=${MOSQUITTO_USERNAME:-mqtt_user}
MQTT_PASS=${MOSQUITTO_PASSWORD:-mqtt_password}
DEVICE_ID=${1:-GEN001}

echo "Testing alarm scenarios for device: $DEVICE_ID"
echo "---"

# Test 1: High Temperature (should exceed 95°C threshold)
echo "Test 1: High Temperature Alarm"
PAYLOAD_1='{
  "voltage": 230.0,
  "current": 50.0,
  "frequency": 50.0,
  "power": 85.0,
  "temperature": 98.5,
  "fuelLevel": 60.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": ["High temperature detected"]
}'

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
    -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "generator/$DEVICE_ID/data" \
    -m "$PAYLOAD_1"
echo "Published: Temperature = 98.5°C (Should trigger CRITICAL alarm)"
sleep 3

# Test 2: Low Fuel Level (should go below 10% threshold)
echo ""
echo "Test 2: Low Fuel Level Alarm"
PAYLOAD_2='{
  "voltage": 230.0,
  "current": 50.0,
  "frequency": 50.0,
  "power": 85.0,
  "temperature": 75.0,
  "fuelLevel": 8.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": ["Low fuel warning"]
}'

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
    -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "generator/$DEVICE_ID/data" \
    -m "$PAYLOAD_2"
echo "Published: Fuel Level = 8.0% (Should trigger WARNING alarm)"
sleep 3

# Test 3: High Voltage (should exceed 250V threshold)
echo ""
echo "Test 3: High Voltage Alarm"
PAYLOAD_3='{
  "voltage": 255.0,
  "current": 50.0,
  "frequency": 50.0,
  "power": 85.0,
  "temperature": 75.0,
  "fuelLevel": 60.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": []
}'

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
    -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "generator/$DEVICE_ID/data" \
    -m "$PAYLOAD_3"
echo "Published: Voltage = 255.0V (Should trigger CRITICAL alarm)"
sleep 3

# Test 4: Low Frequency (below 49Hz)
echo ""
echo "Test 4: Low Frequency Alarm"
PAYLOAD_4='{
  "voltage": 230.0,
  "current": 50.0,
  "frequency": 48.5,
  "power": 85.0,
  "temperature": 75.0,
  "fuelLevel": 60.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": []
}'

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
    -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "generator/$DEVICE_ID/data" \
    -m "$PAYLOAD_4"
echo "Published: Frequency = 48.5Hz (Should trigger WARNING alarm)"
sleep 3

# Test 5: Multiple Alarms
echo ""
echo "Test 5: Multiple Alarms (Temperature + Fuel + Device Alarm)"
PAYLOAD_5='{
  "voltage": 230.0,
  "current": 50.0,
  "frequency": 50.0,
  "power": 85.0,
  "temperature": 97.0,
  "fuelLevel": 5.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": ["Engine vibration detected", "Overload warning"]
}'

mosquitto_pub -h "$MQTT_HOST" -p "$MQTT_PORT" \
    -u "$MQTT_USER" -P "$MQTT_PASS" \
    -t "generator/$DEVICE_ID/data" \
    -m "$PAYLOAD_5"
echo "Published: Multiple alarm conditions (Should trigger multiple alarms)"

echo ""
echo "---"
echo "Alarm tests completed. Check the dashboard for alarm displays."
