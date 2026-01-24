# 🚀 Generator Monitoring System - Deployment Guide

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start

### Local Development with Docker Compose

```bash
# 1. Clone the repository
git clone <repository-url>
cd Generate-monitoring-system-1-18

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker-compose up -d

# 4. Check service status
docker-compose ps

# 5. View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost/api
# Health Check: http://localhost/health
```

---

## 📦 Prerequisites

### Required Software
- **Docker**: 24.0+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.20+ (included with Docker Desktop)
- **Git**: Latest version

### For Local Development (Optional)
- **Frontend**: Node.js 18+, npm 9+
- **Backend**: Java 17+, Maven 3.6+

---

## 🔧 Environment Configuration

### 1. Root Environment (.env)

```bash
cp .env.example .env
```

Configure the following **required** variables:
- `DATABASE_PASSWORD` - Secure PostgreSQL password
- `JWT_SECRET` - Generate: `openssl rand -base64 64`
- `MAIL_USERNAME` - Email for notifications
- `MAIL_PASSWORD` - Gmail App Password

### 2. Frontend Environment

```bash
cd Front_end
cp .env.example .env.local
```

Update API URLs for production:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
```

### 3. Backend Environment

```bash
cd Back_end
cp .env.example .env
```

Ensure database and MQTT configurations match docker-compose settings.

---

## 🐳 Docker Deployment

### Architecture Overview

```
┌─────────────────────────────────────────┐
│            NGINX (Port 80)              │
│         Reverse Proxy + Router          │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴─────────┐
    │                │
┌───▼────┐      ┌───▼────┐
│Frontend│      │Backend │
│:3000   │      │:8080   │
└────────┘      └───┬────┘
                    │
          ┌─────────┴────────┐
          │                  │
     ┌────▼─────┐      ┌────▼────┐
     │PostgreSQL│      │Mosquitto│
     │:5432     │      │:1883    │
     └──────────┘      └─────────┘
```

### Service Breakdown

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| NGINX | generator-nginx | 80 | Reverse proxy & load balancer |
| Frontend | generator-frontend | 3000 | Next.js application |
| Backend | generator-backend | 8080 | Spring Boot API |
| PostgreSQL | generator-postgres | 5432 | Database |
| Mosquitto | generator-mosquitto | 1883 | MQTT broker |

### Docker Commands

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up -d --build [service-name]

# Remove all containers and volumes (CAUTION: Data loss)
docker-compose down -v
```

### Resource Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB

**Recommended**:
- CPU: 4 cores
- RAM: 8GB
- Disk: 50GB SSD

---

## 🌐 Production Deployment

### 1. Cloud Provider Setup (AWS Example)

#### EC2 Instance Configuration
```bash
# Instance type: t3.medium or larger
# OS: Ubuntu 22.04 LTS
# Security Groups:
#   - Port 80 (HTTP)
#   - Port 443 (HTTPS)
#   - Port 22 (SSH - restricted IP)
#   - Port 1883 (MQTT - internal only)
```

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### 2. SSL/TLS Configuration (Production)

Update `nginx/nginx.conf` for HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### 3. Database Backup Strategy

```bash
# Automated daily backup script
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec generator-postgres pg_dump -U postgres generator_db | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/backup-db.sh" | crontab -
```

### 4. Environment Variables (Production)

**NEVER** commit `.env` files. Use secrets management:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret --name generator-monitoring/prod \
  --secret-string file://.env

# Retrieve secrets in deployment
aws secretsmanager get-secret-value --secret-id generator-monitoring/prod \
  --query SecretString --output text > .env
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

**Frontend Pipeline** (`.github/workflows/frontend-ci-cd.yml`)
1. ✅ Checkout code
2. 🔧 Setup Node.js & cache
3. 📦 Install dependencies
4. 🧹 Lint code
5. 🏗️ Build application
6. 🐳 Build & push Docker image

**Backend Pipeline** (`.github/workflows/backend-ci-cd.yml`)
1. ✅ Checkout code
2. ☕ Setup Java & Maven cache
3. 🏗️ Build with Maven
4. 🧪 Run tests
5. 📦 Package JAR
6. 🔒 Security scan (OWASP)
7. 🐳 Build & push Docker image

### Required GitHub Secrets

```
GITHUB_TOKEN (automatic)
NEXT_PUBLIC_API_URL (optional, for build-time config)
NEXT_PUBLIC_WS_URL (optional)
```

### Manual Deployment

```bash
# Pull latest images
docker-compose pull

# Restart services with new images
docker-compose up -d --no-build

# Zero-downtime deployment (if using orchestration)
docker-compose up -d --scale backend=2
docker-compose up -d --scale backend=1 --no-recreate
```

---

## 📊 Monitoring & Health Checks

### Health Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| NGINX | `http://localhost/health` | 200 OK "healthy" |
| Frontend | `http://localhost:3000` | 200 OK |
| Backend | `http://localhost:8080/actuator/health` | 200 OK {"status":"UP"} |
| PostgreSQL | `docker exec generator-postgres pg_isready` | accepting connections |

### Monitoring Commands

```bash
# Check all container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Monitor resource usage
docker stats

# Check service logs
docker-compose logs --tail=100 -f backend

# Database connections
docker exec generator-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Application Metrics

Access Spring Boot Actuator endpoints:
- `/actuator/health` - Application health
- `/actuator/metrics` - JVM and application metrics
- `/actuator/info` - Application info

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Frontend can't connect to backend
```bash
# Check network connectivity
docker exec generator-frontend ping backend

# Verify environment variables
docker exec generator-frontend env | grep NEXT_PUBLIC

# Check NGINX routing
docker logs generator-nginx | grep error
```

#### 2. Database connection errors
```bash
# Verify PostgreSQL is running
docker exec generator-postgres pg_isready

# Check database credentials
docker exec generator-backend env | grep DATABASE

# View backend logs
docker-compose logs backend | grep -i database
```

#### 3. MQTT connection failures
```bash
# Check Mosquitto is running
docker exec generator-mosquitto mosquitto_sub -t '$SYS/#' -C 1

# Test MQTT connectivity
docker exec generator-backend nc -zv mosquitto 1883

# View MQTT logs
docker-compose logs mosquitto
```

#### 4. Build failures

**Frontend**:
```bash
# Clear cache
rm -rf Front_end/node_modules Front_end/.next
docker-compose build --no-cache frontend
```

**Backend**:
```bash
# Clear Maven cache
rm -rf Back_end/target
docker-compose build --no-cache backend
```

### Performance Tuning

#### PostgreSQL
```sql
-- Increase connection pool (application.properties)
spring.datasource.hikari.maximum-pool-size=20

-- Tune PostgreSQL (docker-compose.yml)
command: postgres -c max_connections=200 -c shared_buffers=256MB
```

#### Java JVM
```dockerfile
# Increase heap size (Back_end/Dockerfile)
ENV JAVA_OPTS="-Xmx2g -Xms1g"
```

#### NGINX
```nginx
# Increase worker processes (nginx/nginx.conf)
worker_processes 4;
worker_connections 4096;
```

---

## 📞 Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs: `docker-compose logs [service]`
3. Create an issue in the repository

---

## 📝 License

[Your License Here]
