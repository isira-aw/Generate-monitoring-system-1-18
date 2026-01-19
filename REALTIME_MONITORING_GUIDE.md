# Real-time Data Monitoring System - Implementation Guide

## Overview

This implementation enhances the generator monitoring system with comprehensive real-time data capture, threshold monitoring, and visualization capabilities.

## Key Features

### 1. **Expanded MQTT Data Capture (46 Parameters)**

The system now captures and monitors 46 different parameters from the MQTT broker:

- **RPM**: Engine speed
- **Generator Power**: Real (P), Reactive (Q), and Apparent (S) power for all three phases
- **Generator Voltage**: Line-to-Neutral and Line-to-Line voltages for all phases
- **Generator Current**: All three phase currents
- **Generator Power Factor & Frequency**
- **Mains/Bus Parameters**: Frequency, voltages, current, power, and power factor
- **Protection Parameters**: Earth Fault Current, ROCOF, Max ROCOF, Max Vector Shift
- **Load Parameters**: Real power, reactive power, and power factor
- **Engine Parameters**: Oil pressure, oil temperature, fuel level
- **Electrical Parameters**: Battery voltage, D+ voltage
- **Safety**: E-STOP status
- **Alarms**: Device-generated alarm strings

### 2. **18 Threshold Configuration Groups**

Thresholds can be configured for the following parameter groups:

1. **RPM** (rpm)
2. **Generator Frequency** (Hz)
3. **Mains/Bus Frequency** (Hz)
4. **Generator Voltage L-N** (V) - monitors L1-N, L2-N, L3-N
5. **Generator Voltage L-L** (V) - monitors L1-L2, L2-L3, L3-L1
6. **Mains/Bus Voltage L-N** (V) - monitors L1-N, L2-N, L3-N
7. **Mains/Bus Voltage L-L** (V) - monitors L1-L2, L2-L3, L3-L1
8. **Generator Current** (A) - monitors L1, L2, L3
9. **Real Power (P)** (kW) - monitors Generator P and Load P
10. **Reactive Power (Q)** (kVAr) - monitors Generator Q and Load Q
11. **Power Factor** - monitors Generator PF, Mains PF, Load PF
12. **Earth Fault Current** (A)
13. **ROCOF** (Hz/s) - monitors ROCOF and Max ROCOF
14. **Oil Pressure** (Bar)
15. **Oil Temperature** (°C)
16. **Fuel Level** (%)
17. **Battery Voltage** (V) - monitors Battery Volts and D+
18. **E-STOP** - Emergency stop status

### 3. **Default Threshold Values**

When a device is registered, the following default thresholds are automatically configured:

```
RPM: 1400-1600 rpm
Generator Frequency: 49-51 Hz
Mains/Bus Frequency: 49-51 Hz
Generator Voltage L-N: 200-250 V
Generator Voltage L-L: 380-420 V
Mains/Bus Voltage L-N: 200-250 V
Mains/Bus Voltage L-L: 380-420 V
Generator Current: 0-100 A
Real Power: 0-500 kW
Reactive Power: -100 to 100 kVAr
Power Factor: 0.8-1.0
Earth Fault Current: 0-1 A
ROCOF: -2 to 2 Hz/s
Oil Pressure: 2-6 Bar
Oil Temperature: 0-120 °C
Fuel Level: 10-100 %
Battery Voltage: 22-28 V
E-STOP: 0-0 (should always be inactive)
```

### 4. **Enhanced Dashboard Visualization**

The dashboard (`/device/{deviceId}/dashboard`) now includes:

#### **Notification Bar**
- Displays all system alerts (both device-generated and backend threshold violations)
- Color-coded by severity (WARNING: yellow, CRITICAL: red)
- Shows alarm source (Device or Backend)
- Scrollable for multiple alerts

#### **Real-time MQTT Data Table**
- Comprehensive table showing all 46 parameters
- Three columns: Parameter Name, Value, Unit
- Real-time updates via WebSocket
- Last update timestamp display
- Alternating row colors for readability

### 5. **Settings Page**

The settings page (`/device/{deviceId}/settings`) allows users to:
- Configure all 18 threshold groups
- Set minimum and maximum values for each parameter group
- Update device password
- Requires email verification for security

## Technical Implementation

### Backend Changes

#### 1. **TelemetryData DTO** (`Back_end/src/main/java/.../dto/TelemetryData.java`)
- Extended to include all 46 MQTT parameters
- Uses `@JsonProperty` annotations for proper JSON mapping
- Supports both numeric and boolean data types

#### 2. **ThresholdParameter Enum** (`Back_end/src/main/java/.../enums/ThresholdParameter.java`)
- Updated with 18 threshold groups
- Each enum value has a display name and unit

#### 3. **ThresholdService** (`Back_end/src/main/java/.../service/ThresholdService.java`)
- Enhanced evaluation logic to handle grouped parameters
- Checks multiple related values for each threshold group
- Generates specific alarm messages for each violation
- Supports default threshold initialization

#### 4. **MqttService** (`Back_end/src/main/java/.../service/MqttService.java`)
- No changes required (uses Jackson for automatic JSON parsing)

### Frontend Changes

#### 1. **Dashboard Page** (`Front_end/src/app/device/[deviceId]/dashboard/page.tsx`)
- Enhanced notification bar for system alerts
- Comprehensive data table for all MQTT parameters
- Improved UI with gradients and better styling

#### 2. **Settings Page** (`Front_end/src/app/device/[deviceId]/settings/page.tsx`)
- Improved parameter name formatting
- Supports all 18 threshold groups
- Dynamic threshold editor for each parameter

#### 3. **WebSocket Types** (`Front_end/src/lib/useWebSocket.ts`)
- Updated TelemetryData interface with all 46 parameters
- All fields are optional (marked with `?`)

## MQTT Integration

### MQTT Topic Structure
```
generator/{deviceId}/data
```

### Sample MQTT Payload

See `MQTT_SAMPLE_PAYLOAD.json` for a complete example. The payload should be a JSON object with all 46 parameters.

### Testing with MQTT

#### Using mosquitto_pub:
```bash
mosquitto_pub -h trolley.proxy.rlwy.net -p 26703 \
  -u generatorMQTT -P Gen2024Secure! \
  -t "generator/TEST001/data" \
  -f MQTT_SAMPLE_PAYLOAD.json
```

#### Using Node.js:
```javascript
const mqtt = require('mqtt');
const fs = require('fs');

const client = mqtt.connect('mqtt://trolley.proxy.rlwy.net:26703', {
  username: 'generatorMQTT',
  password: 'Gen2024Secure!'
});

client.on('connect', () => {
  const payload = JSON.parse(fs.readFileSync('MQTT_SAMPLE_PAYLOAD.json'));

  setInterval(() => {
    // Add some random variation to simulate real data
    payload.RPM = 1500 + Math.random() * 50 - 25;
    payload.Generator_Frequency = 50.0 + Math.random() * 0.4 - 0.2;

    client.publish('generator/TEST001/data', JSON.stringify(payload));
    console.log('Published telemetry data');
  }, 5000); // Publish every 5 seconds
});
```

#### Using Python:
```python
import paho.mqtt.client as mqtt
import json
import time
import random

broker = "trolley.proxy.rlwy.net"
port = 26703
username = "generatorMQTT"
password = "Gen2024Secure!"

client = mqtt.Client()
client.username_pw_set(username, password)
client.connect(broker, port)

with open('MQTT_SAMPLE_PAYLOAD.json') as f:
    payload = json.load(f)

while True:
    # Add random variation
    payload['RPM'] = 1500 + random.uniform(-25, 25)
    payload['Generator_Frequency'] = 50.0 + random.uniform(-0.2, 0.2)

    client.publish('generator/TEST001/data', json.dumps(payload))
    print('Published telemetry data')
    time.sleep(5)
```

## Alarm System

### Alarm Types

1. **Device Alarms**: Generated by the IoT device itself and sent in the MQTT payload
2. **Backend Alarms**: Generated by the backend when threshold violations are detected

### Alarm Severity Levels

- **WARNING**: Value is below minimum threshold
- **CRITICAL**: Value is above maximum threshold

### Alarm Message Format

Backend-generated alarms follow this format:
```
{Parameter Group} {Sub-parameter} is {below/above} {minimum/maximum} threshold ({value} {unit})
```

Examples:
- "Generator Voltage L-N L1-N is below minimum threshold (200.00 V)"
- "RPM is above maximum threshold (1600.00 rpm)"

## API Endpoints

### Get Device Thresholds
```
GET /api/devices/{deviceId}/thresholds
Authorization: Required
```

### Update Threshold
```
PUT /api/devices/{deviceId}/thresholds/{parameter}
Authorization: Required
Content-Type: application/json

{
  "minValue": 1400.0,
  "maxValue": 1600.0
}
```

Parameter values for the endpoint:
- RPM
- GENERATOR_FREQUENCY
- MAINS_BUS_FREQUENCY
- GENERATOR_VOLTAGE_LN
- GENERATOR_VOLTAGE_LL
- MAINS_BUS_VOLTAGE_LN
- MAINS_BUS_VOLTAGE_LL
- GENERATOR_CURRENT
- REAL_POWER
- REACTIVE_POWER
- POWER_FACTOR
- EARTH_FAULT_CURRENT
- ROCOF
- OIL_PRESSURE
- OIL_TEMPERATURE
- FUEL_LEVEL
- BATTERY_VOLTAGE
- E_STOP

## Database Schema

### Device Threshold Table

```sql
CREATE TABLE device_threshold (
    id BIGSERIAL PRIMARY KEY,
    device_id BIGINT REFERENCES device(id),
    parameter VARCHAR(50) NOT NULL,
    min_value DOUBLE PRECISION NOT NULL,
    max_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20)
);
```

## WebSocket Communication

### Connection
```
ws://localhost:8080/ws
```

### Subscribe to Device Data
```
/topic/device/{deviceId}
```

### Message Format
```json
{
  "telemetry": {
    "deviceId": "TEST001",
    "timestamp": "2024-01-19T10:30:00",
    "rpm": 1500.0,
    "generatorFrequency": 50.0,
    ...
  },
  "backendAlarms": [
    {
      "deviceId": "TEST001",
      "parameter": "RPM",
      "message": "RPM is above maximum threshold (1600.00 rpm)",
      "severity": "CRITICAL",
      "value": 1650.0,
      "timestamp": "2024-01-19T10:30:00"
    }
  ]
}
```

## Testing Checklist

- [ ] Start backend server
- [ ] Start frontend development server
- [ ] Register a test device (e.g., deviceId: TEST001)
- [ ] Attach device to user account
- [ ] Publish MQTT test data to `generator/TEST001/data`
- [ ] Verify data appears on dashboard in real-time
- [ ] Configure thresholds via settings page
- [ ] Publish data that violates thresholds
- [ ] Verify alarms appear in notification bar
- [ ] Check that alarms show correct severity and source

## Troubleshooting

### MQTT Data Not Appearing
1. Check backend logs for MQTT connection status
2. Verify MQTT broker credentials
3. Ensure device ID in topic matches registered device
4. Validate JSON payload format

### WebSocket Not Connecting
1. Check browser console for WebSocket errors
2. Verify backend WebSocket endpoint is running
3. Check CORS configuration

### Thresholds Not Generating Alarms
1. Verify thresholds are configured for the device
2. Check that values actually violate thresholds
3. Review backend logs for threshold evaluation

## Future Enhancements

- Historical data storage and visualization
- Alarm acknowledgment and logging
- Email/SMS notifications for critical alarms
- Customizable dashboard widgets
- Data export functionality
- Advanced analytics and reporting
- Predictive maintenance alerts

## Support

For issues or questions, please refer to the project repository or contact the development team.
