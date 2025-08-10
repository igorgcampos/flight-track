# Docker Deployment Guide

## Quick Start

### Building the Image
```bash
# Node.js only
docker build -t aviationstack-app:latest --target app .

# With Nginx (single container)
docker build -t aviationstack-app:nginx --target production .
```

### Running with Docker Compose (Recommended)
```bash
# Production with Nginx reverse proxy
docker-compose up -d

# Development with hot reload
docker-compose --profile dev up aviationstack-app-dev
```

### Running with Docker
```bash
# Production
docker run -d --name aviationstack-app -p 3000:3000 --env-file .env aviationstack-app:latest

# With custom port
docker run -d --name aviationstack-app -p 8080:3000 --env-file .env aviationstack-app:latest
```

## Environment Variables

Create a `.env` file with:
```
AVIATIONSTACK_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=production
```

## Health Checks

The application includes health monitoring:
- Health endpoint: `GET /health`
- Docker health checks enabled
- Kubernetes readiness/liveness probes configured

## Security Features

- Non-root user execution (uid: 1001)
- Read-only root filesystem
- Dropped capabilities
- Security policies enforced
- Minimal attack surface with Alpine base

## Kubernetes Deployment

```bash
kubectl apply -f k8s-deployment.yaml
```

Update the Ingress host in `k8s-deployment.yaml` before deploying.

## Nginx Integration

The application uses Nginx as a reverse proxy for:
- Static file serving with caching
- Rate limiting (10 req/s for API, 50 req/s general)
- Security headers (X-Frame-Options, CSP, etc.)
- Gzip compression
- Load balancing and connection pooling

Access via: http://localhost:8080 (or port 80 in production)

## Container Size Optimization

The multi-stage build reduces image size by:
- Using Alpine Linux base images
- Only including production dependencies
- Minifying static assets
- Excluding development files

## Monitoring

Access application logs:
```bash
docker logs aviationstack-app
```

Monitor container health:
```bash
docker inspect --format='{{.State.Health.Status}}' aviationstack-app
```