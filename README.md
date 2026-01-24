# 🔌 Generator Monitoring System

**Production-ready real-time monitoring system for generators with telemetry tracking, predictive analytics, and alarm management.**

[![Frontend CI/CD](https://github.com/your-org/repo/actions/workflows/frontend-ci-cd.yml/badge.svg)](https://github.com/your-org/repo/actions)
[![Backend CI/CD](https://github.com/your-org/repo/actions/workflows/backend-ci-cd.yml/badge.svg)](https://github.com/your-org/repo/actions)

## 🚀 Quick Start

```bash
# Clone and start with Docker Compose
git clone <repository-url>
cd Generate-monitoring-system-1-18
cp .env.example .env
# Edit .env with your credentials
docker-compose up -d

# Access: http://localhost
```

📖 **[Full Deployment Guide](./DEPLOYMENT.md)**

---

## 🏗️ Architecture

### Production-Grade Microservices Architecture

```
┌─────────────────────────────────────────┐
│     NGINX Reverse Proxy (Port 80)      │
│   ├─ /         → Frontend (Next.js)    │
│   ├─ /api      → Backend (Spring Boot) │
│   └─ /ws       → WebSocket             │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴────────┐
    │               │
┌───▼────────┐  ┌──▼────────────┐
│  Frontend  │  │    Backend    │
│  Next.js   │  │  Spring Boot  │
│  Node 18   │  │    Java 17    │
└────────────┘  └───┬───────────┘
                    │
          ┌─────────┴────────┐
          │                  │
     ┌────▼─────┐      ┌────▼────────┐
     │PostgreSQL│      │  Mosquitto  │
     │ Database │      │ MQTT Broker │
     └──────────┘      └─────────────┘
```

### Technology Stack

**Frontend** (`Front_end/`)
- ⚛️ Next.js 14 (React 18) + TypeScript
- 🎨 Tailwind CSS
- 📊 ApexCharts for data visualization
- 🔌 STOMP.js + SockJS for real-time WebSocket
- 🔒 JWT-based authentication

**Backend** (`Back_end/`)
- ☕ Spring Boot 3.2.1 (Java 17)
- 🔐 Spring Security + JWT
- 📡 MQTT (Eclipse Paho) + WebSocket (STOMP)
- 🗄️ PostgreSQL + JPA/Hibernate
- 📧 Email notifications
- 📄 PDF report generation (iText7)
- 🔮 Predictive analytics (fuel/battery)

**Infrastructure**
- 🐳 Docker + Docker Compose
- 🌐 NGINX reverse proxy
- 🔄 GitHub Actions CI/CD
- 📊 Spring Boot Actuator for monitoring

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

## 📁 Project Structure

```
Generate-monitoring-system-1-18/
├── Front_end/                      # Frontend Service (Next.js)
│   ├── src/
│   │   ├── app/                   # Next.js 14 App Router
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/            # Authentication
│   │   │   ├── register/         # User registration
│   │   │   ├── devices/          # Device listing
│   │   │   ├── device/[id]/      # Device-specific pages
│   │   │   │   ├── dashboard/   # Real-time monitoring
│   │   │   │   ├── settings/    # Threshold config
│   │   │   │   └── history/     # Historical data
│   │   │   └── profile/         # User profile
│   │   ├── components/          # Reusable React components
│   │   ├── context/             # State management
│   │   └── lib/                 # API client & utilities
│   ├── Dockerfile              # Production Docker build
│   ├── .dockerignore
│   ├── package.json
│   └── .env.example
│
├── Back_end/                       # Backend Service (Spring Boot)
│   ├── src/main/
│   │   ├── java/com/generator/monitoring/
│   │   │   ├── config/           # Configuration (MQTT, WebSocket, Security)
│   │   │   ├── controller/       # REST API (5 controllers)
│   │   │   ├── service/          # Business logic (13 services)
│   │   │   ├── entity/           # JPA entities (8 tables)
│   │   │   ├── repository/       # Data access layer
│   │   │   ├── dto/              # Request/Response objects
│   │   │   ├── security/         # JWT & authentication
│   │   │   └── exception/        # Error handling
│   │   └── resources/
│   │       ├── application.properties
│   │       └── db/migration/     # Database migrations
│   ├── Dockerfile              # Production Docker build
│   ├── .dockerignore
│   ├── pom.xml
│   └── .env.example
│
├── nginx/                          # Reverse Proxy Configuration
│   ├── nginx.conf              # Production NGINX config
│   └── Dockerfile
│
├── mosquitto/                      # MQTT Broker Configuration
│   └── mosquitto.conf
│
├── .github/workflows/              # CI/CD Pipelines
│   ├── frontend-ci-cd.yml      # Frontend build & deploy
│   └── backend-ci-cd.yml       # Backend build & deploy
│
├── docker-compose.yml              # Full stack orchestration
├── .env.example                    # Environment template
├── DEPLOYMENT.md                   # Production deployment guide
└── README.md                       # This file
```

## 🎯 Quick Start

### Option 1: Docker (Recommended for Production)

**Prerequisites**: Docker 24.0+, Docker Compose 2.20+

```bash
# 1. Clone repository
git clone <repository-url>
cd Generate-monitoring-system-1-18

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with your credentials

# Required:
# - DATABASE_PASSWORD
# - JWT_SECRET (generate: openssl rand -base64 64)
# - MAIL_USERNAME & MAIL_PASSWORD

# 3. Start all services
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f

# Access the application
# → Frontend: http://localhost
# → Backend API: http://localhost/api
# → Health: http://localhost/health
```

**Services Started**:
- ✅ NGINX (Port 80) - Reverse proxy
- ✅ Frontend (Next.js) - User interface
- ✅ Backend (Spring Boot) - REST API
- ✅ PostgreSQL - Database
- ✅ Mosquitto - MQTT broker

---

### Option 2: Local Development

**Prerequisites**: Java 17+, Node.js 18+, Maven 3.6+, PostgreSQL, Mosquitto

#### Backend Setup
```bash
cd Back_end

# Configure environment
cp .env.example .env
nano .env

# Build and run
mvn clean install
mvn spring-boot:run

# Backend runs on: http://localhost:8080
```

#### Frontend Setup
```bash
cd Front_end

# Configure environment
cp .env.example .env.local
nano .env.local

# Install and run
npm install
npm run dev

# Frontend runs on: http://localhost:3000
```

#### MQTT Broker (Mosquitto)
```bash
# Ubuntu/Debian
sudo apt-get install mosquitto

# macOS
brew install mosquitto

# Start service
sudo systemctl start mosquitto
```

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

## 🚀 Deployment

### Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive production deployment guide including:
- ☁️ Cloud provider setup (AWS, GCP, Azure)
- 🔒 SSL/TLS configuration
- 📊 Monitoring and logging
- 🔄 CI/CD pipeline setup
- 💾 Database backup strategies
- 🔧 Performance tuning

### Quick Production Checklist

- [x] Multi-stage Docker builds (optimized images)
- [x] NGINX reverse proxy with security headers
- [x] Separate CI/CD pipelines for frontend/backend
- [x] Health checks on all services
- [ ] Configure SSL certificates (production domain)
- [ ] Set strong `JWT_SECRET` (min 64 chars)
- [ ] Configure production database backups
- [ ] Set up proper MQTT authentication
- [ ] Configure firewall rules
- [ ] Set up application monitoring (optional)

### Docker Images

Pre-built production Docker images:
- **Frontend**: Multi-stage build with Node.js 18 Alpine
- **Backend**: Multi-stage Maven build with Eclipse Temurin 17
- **NGINX**: Optimized reverse proxy with gzip, rate limiting, security headers

### Environment Variables

```bash
# Required for production
DATABASE_PASSWORD=<secure-password>
JWT_SECRET=<64-char-random-string>
MAIL_USERNAME=<email>
MAIL_PASSWORD=<app-password>

# Optional
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NGINX_PORT=80
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
