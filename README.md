# Generator Monitoring System

A comprehensive MVP-level monitoring system for generators with real-time telemetry data, alarm management, and threshold configuration.

## Architecture Overview

### Backend (Spring Boot)
- **Authentication**: JWT-based security with HttpOnly cookies
- **MQTT Integration**: Eclipse Paho client for Mosquitto broker
- **WebSocket**: Real-time data streaming to frontend
- **Database**: H2 (embedded for MVP, easily replaceable with PostgreSQL/MySQL)
- **Data Flow**: MQTT → Threshold Evaluation → WebSocket → Frontend

### Frontend (Next.js)
- **Public Dashboard**: Real-time telemetry display (no authentication)
- **Protected Settings**: JWT-required threshold configuration
- **WebSocket**: Live updates using STOMP over SockJS
- **State Management**: React Context API for authentication

## Features

### Core Features
✅ Real-time telemetry data monitoring
✅ Automatic device registration
✅ Dual alarm system (device + backend-generated)
✅ Configurable thresholds per device
✅ JWT authentication with HttpOnly cookies
✅ WebSocket for live updates
✅ Responsive UI with Tailwind CSS

### Security Features
✅ JWT-based authentication
✅ HttpOnly cookies (XSS protection)
✅ Protected API endpoints
✅ CORS configuration
✅ Password encryption (BCrypt)

## Project Structure

```
Generate-monitoring-system-1-18/
├── Back end/                 # Spring Boot backend
│   ├── src/
│   │   └── main/
│   │       ├── java/com/generator/monitoring/
│   │       │   ├── config/           # MQTT, WebSocket, Security config
│   │       │   ├── controller/       # REST API controllers
│   │       │   ├── dto/              # Data Transfer Objects
│   │       │   ├── entity/           # JPA entities
│   │       │   ├── enums/            # Threshold parameters
│   │       │   ├── repository/       # Data repositories
│   │       │   ├── security/         # JWT utilities & filters
│   │       │   └── service/          # Business logic
│   │       └── resources/
│   │           └── application.properties
│   └── pom.xml
│
└── Front_end/                # Next.js frontend
    ├── src/
    │   ├── app/              # Pages (Next.js App Router)
    │   │   ├── device/[deviceId]/
    │   │   │   ├── dashboard/    # Public dashboard
    │   │   │   └── settings/     # Protected settings
    │   │   ├── devices/          # Device listing
    │   │   ├── login/            # Login page
    │   │   └── register/         # Registration page
    │   ├── components/       # Reusable components
    │   ├── context/          # Auth context
    │   └── lib/              # API utilities & WebSocket hook
    └── package.json
```

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Maven 3.6+
- Mosquitto MQTT Broker

### 1. Setup Mosquitto MQTT Broker

#### Linux/Mac:
```bash
# Install Mosquitto
sudo apt-get install mosquitto mosquitto-clients  # Ubuntu/Debian
# or
brew install mosquitto  # macOS

# Create mosquitto config
cat > /etc/mosquitto/conf.d/default.conf <<EOF
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF

# Create MQTT user
sudo mosquitto_passwd -c /etc/mosquitto/passwd mqtt_user

# Restart Mosquitto
sudo systemctl restart mosquitto
```

#### Windows:
Download from https://mosquitto.org/download/ and configure similarly.

### 2. Backend Setup

```bash
cd "Back end"

# Configure environment variables (optional)
export MOSQUITTO_HOST=localhost
export MOSQUITTO_PORT=1883
export MOSQUITTO_USERNAME=mqtt_user
export MOSQUITTO_PASSWORD=your_password

# Build and run
mvn clean install
mvn spring-boot:run
```

Backend will start on http://localhost:8080

### 3. Frontend Setup

```bash
cd Front_end

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will start on http://localhost:3000

## Configuration

### Backend Configuration
Edit `Back end/src/main/resources/application.properties`:

```properties
# Server
server.port=8080

# JWT
jwt.secret=YourSuperSecretKey
jwt.expiration=86400000

# MQTT
mqtt.host=localhost
mqtt.port=1883
mqtt.username=mqtt_user
mqtt.password=mqtt_password

# CORS
cors.allowed.origins=http://localhost:3000
```

### Frontend Configuration
Edit `Front_end/next.config.js` or use `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
```

## MQTT Data Format

Devices should publish to: `generator/{deviceId}/data`

**Payload Example:**
```json
{
  "voltage": 230.5,
  "current": 45.2,
  "frequency": 50.0,
  "power": 85.3,
  "temperature": 72.5,
  "fuelLevel": 65.0,
  "oilPressure": 55.0,
  "rpm": 1500,
  "device_alarms": ["Low fuel warning", "High temperature"]
}
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (sets JWT cookie)
- `POST /api/auth/logout` - Logout (clears cookie)
- `GET /api/auth/me` - Get current user (protected)

### Devices
- `GET /api/devices` - List all devices (public)
- `GET /api/devices/{deviceId}/dashboard` - Get device info (public)
- `GET /api/devices/{deviceId}/thresholds` - Get thresholds (protected)
- `PUT /api/devices/{deviceId}/thresholds/{parameter}` - Update threshold (protected)
- `POST /api/devices` - Create device (protected)

### WebSocket
- Connect to: `ws://localhost:8080/ws`
- Subscribe to: `/topic/device/{deviceId}`

## Usage Guide

### 1. Register & Login
1. Navigate to http://localhost:3000/register
2. Create an account
3. Login at http://localhost:3000/login

### 2. View Devices
- Go to http://localhost:3000/devices
- Devices auto-register when they send MQTT data

### 3. Monitor Dashboard (Public)
- Click "Dashboard" on any device
- View real-time telemetry and alarms
- No authentication required

### 4. Configure Thresholds (Protected)
1. Click "Settings" on a device
2. Login if not authenticated
3. Adjust min/max values for each parameter
4. Backend generates alarms when thresholds are exceeded

## Testing with MQTT

### Publish Test Data:
```bash
mosquitto_pub -h localhost -t "generator/GEN001/data" \
  -u mqtt_user -P mqtt_password \
  -m '{
    "voltage": 235.0,
    "current": 50.0,
    "frequency": 50.1,
    "power": 90.0,
    "temperature": 85.0,
    "fuelLevel": 45.0,
    "oilPressure": 60.0,
    "rpm": 1520,
    "device_alarms": ["High temperature"]
  }'
```

## Deployment

### Production Checklist
- [ ] Change `jwt.secret` to a strong random value
- [ ] Use production database (PostgreSQL/MySQL)
- [ ] Enable HTTPS
- [ ] Set `cookie.secure=true` for JWT cookies
- [ ] Configure proper CORS origins
- [ ] Use environment variables for secrets
- [ ] Set up proper MQTT authentication
- [ ] Configure firewall rules
- [ ] Set up logging and monitoring

### Docker Deployment (Optional)

**Backend Dockerfile:**
```dockerfile
FROM openjdk:17-slim
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### MQTT Connection Failed
- Check Mosquitto is running: `sudo systemctl status mosquitto`
- Verify credentials in application.properties
- Check firewall: `sudo ufw allow 1883`

### WebSocket Not Connecting
- Verify backend is running on port 8080
- Check CORS configuration
- Ensure frontend is connecting to correct WS_URL

### Authentication Issues
- Clear browser cookies
- Check JWT secret matches in application.properties
- Verify database has user data

## Technology Stack

**Backend:**
- Spring Boot 3.2.1
- Spring Security
- Spring WebSocket
- Eclipse Paho MQTT Client
- H2 Database
- JWT (jjwt 0.12.3)

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- STOMP.js
- SockJS
- Axios

## License

MIT License - Use freely for commercial or personal projects.

## Support

For issues and questions, please check:
- Backend logs: `tail -f logs/spring-boot.log`
- Frontend console: Browser DevTools
- MQTT broker: `mosquitto_sub -h localhost -t '#' -v -u mqtt_user -P mqtt_password`
