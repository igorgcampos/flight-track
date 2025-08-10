# Arquitetura de Containers e Deployment

## 🐳 Visão Geral da Containerização

A aplicação utiliza uma estratégia de containerização multi-estágio com Docker para otimizar o tamanho das imagens e separar ambientes de desenvolvimento e produção.

## 🏗️ Estratégia Multi-Stage Build

### Estágio 1: Dependencies
```dockerfile
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
```
**Propósito**: Instalar apenas dependências de produção para otimizar a imagem final.

### Estágio 2: Build
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```
**Propósito**: Compilar e otimizar assets para produção (minificação JS/CSS/HTML).

### Estágio 3: Application Runtime
```dockerfile
FROM node:20-alpine AS app
RUN addgroup -g 1001 -S nodejs && adduser -S aviationapp -u 1001 -G nodejs
WORKDIR /app
COPY --from=dependencies --chown=aviationapp:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=aviationapp:nodejs /app/dist ./dist
USER aviationapp
ENV NODE_ENV=production
CMD ["node", "index.js"]
```
**Propósito**: Imagem mínima para produção com usuário não-root e apenas arquivos necessários.

### Estágio 4: Production (Nginx + Node.js)
```dockerfile
FROM nginx:1.25-alpine AS production
RUN apk add --no-cache nodejs npm supervisor curl
# Configuração do supervisor para executar Nginx + Node.js
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
```
**Propósito**: Imagem all-in-one com proxy reverso Nginx e aplicação Node.js.

## 🏢 Arquitetura de Serviços (Docker Compose)

```yaml
# Estrutura dos serviços orquestrados
services:
  aviationstack-app:      # Aplicação principal
    ├── Target: app stage
    ├── Environment: production
    ├── Network: aviation-network
    ├── Health check: wget /health
    └── Restart: unless-stopped

  aviationstack-nginx:    # Proxy reverso
    ├── Image: nginx:1.25-alpine
    ├── Port mapping: 8080:80
    ├── Config: ./nginx/nginx.conf
    ├── Depends on: aviationstack-app
    └── Health check: wget /health

  aviationstack-app-dev:  # Override para desenvolvimento
    ├── Profile: dev
    ├── Target: build stage
    ├── Port mapping: 3000:3000
    ├── Volume mount: código fonte
    └── Command: npm run dev
```

## 🌐 Configuração de Rede

### Network: aviation-network
```yaml
networks:
  aviation-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Características**:
- **Isolamento**: Rede dedicada para os serviços da aplicação
- **Comunicação interna**: Resolução de DNS por nome do serviço
- **Segurança**: Tráfego isolado do host e outras aplicações

### Mapeamento de Portas

| Serviço | Porta Interna | Porta Externa | Protocolo |
|---------|---------------|---------------|-----------|
| **nginx** | 80 | 8080 | HTTP |
| **app** (prod) | 3000 | - | HTTP (interno) |
| **app** (dev) | 3000 | 3000 | HTTP |

## 🚀 Estratégias de Deployment

### 1. Desenvolvimento Local
```bash
# Iniciar em modo desenvolvimento
docker-compose --profile dev up -d

# Características:
# - Hot reload ativo
# - Volume mount do código fonte
# - Logs em tempo real
# - Debug habilitado
```

### 2. Produção Simples
```bash
# Iniciar em modo produção
docker-compose up -d

# Características:
# - Nginx como proxy reverso
# - Assets otimizados (minificados)
# - Health checks ativos
# - Restart automático
```

### 3. Kubernetes (Disponível)
```yaml
# k8s-deployment.yaml configurado para:
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aviationstack-app
spec:
  replicas: 2
  # ... configuração completa disponível
```

## 🔧 Configuração do Nginx

### nginx.conf - Estratégias Implementadas

```nginx
# Principais configurações:
upstream app {
    server aviationstack-app:3000;  # Backend pool
}

server {
    listen 80;
    
    # Proxy para API
    location /api/ {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Servir arquivos estáticos
    location / {
        proxy_pass http://app;
    }
    
    # Health check
    location /health {
        proxy_pass http://app/health;
    }
}
```

**Benefícios**:
- **Load balancing**: Preparado para múltiplas instâncias
- **Caching**: Headers otimizados para cache
- **Compression**: Gzip ativo para reduzir bandwidth
- **Security**: Headers de segurança configurados

## 📊 Health Checks e Monitoramento

### Health Check da Aplicação
```javascript
// index.js:26-32
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Health Check do Container
```yaml
# Docker Compose health check
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Nginx Health Check
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## 🔄 Estratégias de Restart e Recovery

### Políticas de Restart
```yaml
restart: unless-stopped
```
- **unless-stopped**: Reinicia automaticamente, exceto quando parado manualmente
- **Aplicável a**: Todos os serviços de produção
- **Benefício**: Alta disponibilidade com mínima intervenção manual

### Graceful Shutdown
```javascript
// Implementação recomendada (não presente atualmente)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
```

## 🎯 Otimizações de Performance

### Build Optimization (build.js:1-86)
```javascript
// Minificação de assets
await minifyJS('./public/js/app.js', './dist/js/app.js');
await minifyJS('./public/js/autocomplete.js', './dist/js/autocomplete.js');
await minifyCSS('./public/css/styles.css', './dist/css/styles.css');
await minifyHTML('./public/index.html', './dist/index.html');
```

### Compression Middleware
```javascript
// index.js:16
app.use(compression());
```

### Static File Caching
```javascript
// index.js:19-23
app.use(express.static(staticPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));
```

## 🚦 Ambientes e Perfis

### Desenvolvimento
- **Profile**: `dev`
- **Port**: 3000 (exposto)
- **Features**: Hot reload, volume mount, debug logs
- **Build target**: `build` (inclui dev dependencies)

### Produção
- **Profile**: default
- **Port**: 8080 (via Nginx)
- **Features**: Assets minificados, cache agressivo, health checks
- **Build target**: `app` (produção otimizada)

### Staging/Testing
- **Recomendação**: Usar perfil de produção com variáveis de ambiente específicas
- **Diferenças**: API keys de test, logs mais verbosos

## 📦 Estrutura de Volumes

### Volume Strategy
```yaml
# Desenvolvimento
volumes:
  - .:/app                    # Source code mount
  - /app/node_modules         # Prevent overwrite

# Produção
# Sem volumes - tudo empacotado na imagem
```

### Dados Persistentes
- **Cache**: Em memória (não persistente)
- **Logs**: Container logs via Docker
- **Configuração**: Via environment variables

## 🔧 Comandos de Operação

### Build e Deploy
```bash
# Build completo
docker-compose build

# Iniciar produção
docker-compose up -d

# Iniciar desenvolvimento
docker-compose --profile dev up -d

# Logs em tempo real
docker-compose logs -f

# Verificar saúde dos containers
docker-compose ps
```

### Troubleshooting
```bash
# Verificar health checks
docker inspect aviationstack-app | grep -A5 Health

# Acessar container para debug
docker exec -it aviationstack-app sh

# Verificar logs específicos
docker-compose logs aviationstack-app
docker-compose logs aviationstack-nginx
```

## 🎯 Próximos Passos e Melhorias

### Recomendações de Arquitetura

1. **Implementar Graceful Shutdown**
   - Adicionar handlers para SIGTERM/SIGINT
   - Finalizar conexões HTTP adequadamente

2. **Configurar Logging Estruturado**
   - Implementar Winston ou Pino
   - Logs em formato JSON para análise

3. **Adicionar Métricas**
   - Prometheus metrics endpoint
   - Métricas de performance e uso

4. **Implementar Cache Persistente**
   - Redis para cache distribuído
   - Persistence entre restarts

5. **Security Headers**
   - Helmet.js para security headers
   - Rate limiting por IP

6. **Environment-Specific Configs**
   - Configurações por ambiente
   - Secrets management

---
*Documentação gerada em: 2024-01-15*