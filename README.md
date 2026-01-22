# URL Shortener Microservices

A modern URL shortener application built with microservices architecture.

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | Next.js | 16.1.3 |
| Backend | Golang | 1.24 |
| Cache/Storage | Redis | 8.x |
| Reverse Proxy | Nginx | Alpine |
| Container | Docker Compose | - |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (Port 80)                       │
│  example.local  │  api.example.local  │  s.example.local    │
└────────┬────────┴──────────┬──────────┴─────────┬───────────┘
         │                   │                    │
    ┌────▼────┐        ┌─────▼─────┐        ┌─────▼─────┐
    │Frontend │        │URL Service│        │URL Service│
    │ :3000   │        │  :8080    │        │  (redirect)│
    └─────────┘        └─────┬─────┘        └───────────┘
                             │
                       ┌─────▼─────┐
                       │Analytics  │
                       │ Service   │
                       │  :8081    │
                       └─────┬─────┘
                             │
                       ┌─────▼─────┐
                       │  Redis    │
                       │  :6379    │
                       └───────────┘
```

## Quick Start

### Development (In-Memory Storage)

```bash
docker compose up -d --build
```

Access: http://localhost:3000

### Production (With Nginx + Redis)

```bash
# PowerShell
$env:STORAGE_TYPE="redis"; docker compose -f docker-compose.prod.yml up -d --build

# Linux/Mac
STORAGE_TYPE=redis docker compose -f docker-compose.prod.yml up -d --build
```

## Domain Configuration

| Domain | Purpose |
|--------|---------|
| `example.local` | Frontend website |
| `api.example.local` | Backend API (shorten, stats) |
| `s.example.local` | Short URL redirects |

## API Endpoints

### URL Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /shorten | Create short URL |
| GET | /{shortCode} | Redirect to original URL |
| GET | /urls | List all URLs |
| GET | /health | Health check |

### Analytics Service

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /track | Track click event |
| GET | /stats/{shortCode} | Get stats for URL |
| GET | /stats | Get all stats |
| GET | /health | Health check |

## Project Structure

```
go-url-shortener/
├── docker-compose.yml          # Development config
├── docker-compose.prod.yml     # Production with Nginx
├── .env.example                # Environment variables
├── nginx/
│   ├── nginx.conf              # Multi-subdomain config
│   └── nginx.simple.conf       # Single domain config
├── k6/
│   ├── smoke-test.js           # Quick verification
│   ├── load-test.js            # Realistic traffic
│   └── stress-test.js          # Breaking point test
├── frontend/                   # Next.js 16
│   ├── src/app/
│   │   ├── page.tsx            # URL shortening form
│   │   └── analytics/page.tsx  # Analytics dashboard
│   └── Dockerfile
├── url-service/                # Go 1.24
│   ├── handlers/
│   ├── models/
│   ├── storage/
│   │   ├── memory.go           # In-memory storage
│   │   └── redis.go            # Redis storage
│   └── Dockerfile
└── analytics-service/          # Go 1.24
    ├── handlers/
    ├── models/
    ├── storage/
    │   ├── memory.go
    │   └── redis.go
    └── Dockerfile
```

## Storage Options

### In-Memory (Default)
- Fast, no setup required
- Data lost on container restart

### Redis (Recommended for Production)
- Persistent data storage
- Built-in data structures
- High performance

```bash
# Enable Redis
STORAGE_TYPE=redis docker compose -f docker-compose.prod.yml up -d
```

## Load Testing with k6

```bash
# Smoke test (30s)
docker run --rm -i --network=host -v ${PWD}/k6:/scripts grafana/k6 run /scripts/smoke-test.js

# Full load test (4 min)
docker run --rm -i --network=host -v ${PWD}/k6:/scripts grafana/k6 run /scripts/load-test.js

# Stress test (8 min, up to 1000 VUs)
docker run --rm -i --network=host -v ${PWD}/k6:/scripts grafana/k6 run /scripts/stress-test.js
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | `memory` or `redis` | `memory` |
| `REDIS_URL` | Redis server address | `redis:6379` |
| `PUBLIC_URL_SERVICE` | API endpoint URL | `http://api.example.local` |
| `PUBLIC_ANALYTICS_SERVICE` | Analytics API URL | `http://api.example.local` |
| `PUBLIC_SHORT_URL_DOMAIN` | Short URL display domain | `http://s.example.local` |

## Production Deployment

### Option 1: Multi-Subdomain Setup (Recommended)

Separate subdomains for each service:

| Subdomain | Purpose |
|-----------|---------|
| `example.com` | Frontend website |
| `api.example.com` | Backend API |
| `s.example.com` | Short URL redirects |

```bash
# 1. Update nginx/nginx.conf with your domains
# 2. Configure DNS records for all subdomains
# 3. Run:
docker compose -f docker-compose.prod.yml up -d --build
```

### Option 2: Single Domain Setup

All services on one domain with path-based routing:

| Path | Purpose |
|------|---------|
| `/` | Frontend website |
| `/api/shorten`, `/api/urls`, `/api/stats` | API endpoints |
| `/{shortCode}` | Short URL redirects |

```bash
# 1. Copy simple nginx config
cp nginx/nginx.simple.conf nginx/nginx.conf

# 2. Update domain in nginx/nginx.conf
# 3. Update environment variables:
PUBLIC_URL_SERVICE=https://example.com/api
PUBLIC_ANALYTICS_SERVICE=https://example.com/api
PUBLIC_SHORT_URL_DOMAIN=https://example.com

# 4. Run:
docker compose -f docker-compose.prod.yml up -d --build
```

### Adding SSL (HTTPS)

1. Get SSL certificates (Let's Encrypt recommended)
2. Place certificates in `nginx/ssl/`
3. Uncomment SSL section in `nginx/nginx.conf`
4. Rebuild nginx container

### Kubernetes Deployment

Deploy to Kubernetes cluster:

```bash
# Apply all manifests
kubectl apply -f kubernetes-manifests/

# Verify deployment
kubectl get pods -n linkshort
kubectl get ingress -n linkshort
```

Features included:
- Horizontal Pod Autoscaler (auto-scaling)
- Health checks (liveness & readiness)
- Ingress for multi-subdomain routing

See `kubernetes-manifests/README.md` for detailed instructions.

## Extending Storage

Implement these interfaces to add new storage backends:

```go
// url-service/storage/
type URLStorage interface {
    Save(url *models.URL) error
    FindByShortCode(shortCode string) (*models.URL, error)
    FindAll() ([]*models.URL, error)
    Exists(shortCode string) bool
}

// analytics-service/storage/
type AnalyticsStorage interface {
    SaveClick(event *models.ClickEvent) error
    GetStatsByShortCode(shortCode string) (*models.Stats, error)
    GetAllStats() ([]*models.Stats, error)
}
```

## License

MIT
