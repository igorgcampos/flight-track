# Guia de Desenvolvimento - AviationStack App

## 🚀 Começando o Desenvolvimento

### Pré-requisitos
- Node.js 18+ ou Docker
- Git
- Editor de código (VS Code recomendado)
- Chave de API da AviationStack (gratuita)

### Setup Local Rápido
```bash
# 1. Clone e configure
git clone <repository>
cd teste-app
cp .env.example .env
# Edite .env com sua AVIATIONSTACK_API_KEY

# 2. Opção A: Node.js nativo
npm install
npm run dev

# 2. Opção B: Docker (recomendado)
docker-compose --profile dev up -d
```

### Verificação do Setup
```bash
# Verificar se está funcionando:
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

curl http://localhost:3000/api/cache/preload  
# Expected: {"message":"Cache precarregado com sucesso","airports_count":7700,...}
```

## 🏗️ Arquitetura de Desenvolvimento

### Estrutura de Código Recomendada

```
📁 teste-app/
├── 🎯 Core Application
│   ├── index.js              # Express server + routing
│   ├── aviationstack.js      # AviationStack API client
│   └── cache-manager.js      # Cache management
├── 🎨 Frontend Assets
│   └── public/
│       ├── index.html        # Main UI
│       ├── css/styles.css    # Custom styles
│       └── js/
│           ├── app.js        # Core frontend logic
│           └── autocomplete.js # Search functionality
├── 🔧 Build & Deploy
│   ├── build.js              # Production build script
│   ├── Dockerfile            # Multi-stage container
│   ├── docker-compose.yml    # Service orchestration
│   └── k8s-deployment.yaml   # Kubernetes config
├── 📚 Documentation
│   └── docs/arquitetura/     # This documentation
└── ⚙️ Configuration
    ├── .env.example          # Environment template
    ├── package.json          # Dependencies
    └── nginx/nginx.conf      # Proxy configuration
```

## 🧩 Padrões de Código

### 1. Módulos ES6
```javascript
// Padrão para novos módulos:
import requiredDependency from 'package';
import optionalDependency from './local-module.js';

class NewComponent {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  async publicMethod() {
    // Implementation
  }
  
  #privateMethod() {
    // Private implementation
  }
}

export default NewComponent;
```

### 2. Error Handling Consistente
```javascript
// Padrão para route handlers:
app.get('/api/new-endpoint', async (req, res) => {
  try {
    const params = req.query;
    const data = await service.getData(params);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro em /api/new-endpoint:', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Logging Consistente
```javascript
// Padrão de logging:
console.log('🔄 Iniciando operação...');         // Info
console.log('✅ Operação concluída com sucesso'); // Success  
console.error('❌ Erro na operação:', error);     // Error
console.log(`📊 Métricas: ${count} items`);      // Metrics
console.log(`⏰ Aguardando ${seconds}s...`);      // Timing
```

### 4. Configuração via Environment
```javascript
// Padrão para configurações:
const CONFIG = {
  port: process.env.PORT || 3000,
  apiKey: process.env.AVIATIONSTACK_API_KEY,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Valores com fallback seguro
};

// Validação de configuração obrigatória:
if (!CONFIG.apiKey) {
  throw new Error('AVIATIONSTACK_API_KEY é obrigatória');
}
```

## 🔧 Ferramentas de Desenvolvimento

### Scripts NPM Disponíveis
```json
{
  "scripts": {
    "start": "node index.js",           // Produção
    "dev": "node --watch index.js",     // Desenvolvimento com hot reload
    "build": "node build.js",           // Build otimizado
    "start:prod": "NODE_ENV=production node index.js"  // Produção local
  }
}
```

### Docker Profiles
```bash
# Desenvolvimento (com hot reload):
docker-compose --profile dev up -d

# Produção local (com Nginx):
docker-compose up -d

# Logs em tempo real:
docker-compose logs -f aviationstack-app

# Rebuild após mudanças:
docker-compose build aviationstack-app
```

### Debugging
```javascript
// Debug mode (set NODE_ENV=development):
if (process.env.NODE_ENV === 'development') {
  console.log('🐛 Debug mode ativo');
  console.log('📝 Parâmetros da requisição:', params);
  console.log('📊 Estado do cache:', cacheManager.getStats());
}
```

## 🧪 Testing Strategy

### Estrutura de Testes Recomendada
```
📁 tests/
├── 🧪 unit/
│   ├── aviationstack.test.js    # Testes do cliente API
│   ├── cache-manager.test.js    # Testes do cache
│   └── utils.test.js            # Testes de utilities
├── 🔗 integration/
│   ├── api-endpoints.test.js    # Testes dos endpoints
│   ├── cache-integration.test.js # Testes de integração cache
│   └── external-apis.test.js    # Testes de APIs externas
├── 🎭 e2e/
│   ├── user-workflows.test.js   # Fluxos completos de usuário
│   └── performance.test.js      # Testes de performance
└── 📊 fixtures/
    ├── sample-flights.json      # Dados de exemplo
    ├── sample-airports.csv      # CSV de teste
    └── api-responses/           # Respostas mockadas
```

### Testes Unitários (Exemplo)
```javascript
// tests/unit/cache-manager.test.js
import { describe, test, expect, beforeEach } from 'vitest';
import CacheManager from '../../cache-manager.js';

describe('CacheManager', () => {
  let cacheManager;
  
  beforeEach(() => {
    cacheManager = new CacheManager();
  });
  
  test('should parse CSV line correctly', () => {
    const line = '"1","Goroka Airport","Goroka","Papua New Guinea","GKA","AYGA",-6.081689834590001,145.391998291,5282,10,"U","Pacific/Port_Moresby","airport","OurAirports"';
    const fields = cacheManager.parseCSVLine(line);
    
    expect(fields[4]).toBe('GKA');
    expect(fields[1]).toBe('"Goroka Airport"');
  });
  
  test('should filter invalid airports', () => {
    const mockData = 'id,name,city,country,iata,icao\n1,"Test Airport","Test City","Test Country","TST","TEST"';
    const airports = cacheManager.parseAirportsData(mockData);
    
    expect(airports).toHaveLength(1);
    expect(airports[0].iata_code).toBe('TST');
  });
  
  test('should handle cache expiration', () => {
    cacheManager.setCacheData('test', { data: 'test' });
    expect(cacheManager.isExpired('test')).toBe(false);
    
    // Mock expired cache
    cacheManager.cache.get('test').timestamp = Date.now() - (25 * 60 * 60 * 1000);
    expect(cacheManager.isExpired('test')).toBe(true);
  });
});
```

### Testes de Integração (Exemplo)
```javascript
// tests/integration/api-endpoints.test.js
import request from 'supertest';
import app from '../../index.js';

describe('API Endpoints', () => {
  test('GET /health should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
      
    expect(response.body).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number)
    });
  });
  
  test('GET /api/autocomplete/airports should return filtered airports', async () => {
    const response = await request(app)
      .get('/api/autocomplete/airports?q=gru&limit=5')
      .expect(200);
      
    expect(response.body).toMatchObject({
      data: expect.any(Array),
      count: expect.any(Number),
      query: 'gru'
    });
    
    expect(response.body.data.length).toBeLessThanOrEqual(5);
  });
});
```

## 🔍 Debugging e Troubleshooting

### Logs Estruturados
```javascript
// Implementação recomendada para logs estruturados:
class Logger {
  static info(message, metadata = {}) {
    console.log(`ℹ️ ${new Date().toISOString()} [INFO] ${message}`, metadata);
  }
  
  static error(message, error = null, metadata = {}) {
    console.error(`❌ ${new Date().toISOString()} [ERROR] ${message}`, {
      error: error?.message,
      stack: error?.stack,
      ...metadata
    });
  }
  
  static debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 ${new Date().toISOString()} [DEBUG] ${message}`, metadata);
    }
  }
}
```

### Debug Endpoints (Desenvolvimento)
```javascript
// Adicionar apenas em desenvolvimento:
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/cache', (req, res) => {
    res.json({
      cache_keys: Array.from(cacheManager.cache.keys()),
      cache_stats: {
        airports_count: cacheManager.getCacheData('airports')?.length || 0,
        airlines_count: cacheManager.getCacheData('airlines')?.length || 0
      },
      memory_usage: process.memoryUsage()
    });
  });
  
  app.get('/debug/api-stats', (req, res) => {
    res.json({
      last_request_time: api.lastRequestTime,
      rate_limit_delay: api.rateLimitDelay,
      time_until_next_request: Math.max(0, api.rateLimitDelay - (Date.now() - api.lastRequestTime))
    });
  });
}
```

### Common Issues e Solutions

#### Issue: "API key não configurada"
```bash
# Solution:
cp .env.example .env
# Edit .env file:
AVIATIONSTACK_API_KEY=your_actual_api_key_here
```

#### Issue: "Cache não carrega dados"
```bash
# Debug steps:
curl http://localhost:3000/debug/cache        # Check cache state
curl http://localhost:3000/api/cache/preload  # Force cache reload
docker-compose logs aviationstack-app         # Check logs
```

#### Issue: "Rate limit issues"
```bash
# Debug steps:
curl http://localhost:3000/debug/api-stats    # Check rate limit state
# Wait 60+ seconds between API requests
```

#### Issue: "Docker build falha"
```bash
# Common solutions:
docker system prune -f          # Clean build cache
docker-compose build --no-cache # Force rebuild
docker-compose down -v          # Reset volumes
```

## 📊 Performance Guidelines

### Response Time Targets
| Endpoint Type | Target | Typical |
|---------------|--------|---------|
| **Cached data** (autocomplete) | <50ms | <10ms |
| **Health check** | <10ms | <5ms |
| **Static assets** | <100ms | <20ms |
| **API data** (first time) | <5s | 2-3s |
| **API data** (rate limited) | 60s+ | 60-65s |

### Memory Usage Guidelines
```javascript
// Monitoring de memória:
const MEMORY_THRESHOLDS = {
  normal: '< 100MB',        // Operação normal
  warning: '100-200MB',     // Investigar growth
  critical: '> 200MB'       // Possible memory leak
};

// Check memory usage:
setInterval(() => {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 200 * 1024 * 1024) {  // 200MB
    console.log('⚠️ High memory usage:', usage);
  }
}, 60000);  // Check every minute
```

### Cache Optimization
```javascript
// Best practices para cache:
const CACHE_BEST_PRACTICES = {
  preload_on_startup: true,     // Warm cache during startup
  monitor_hit_ratio: true,      // Track cache effectiveness  
  limit_cache_size: true,       // Prevent unlimited growth
  graceful_fallback: true       // Always have fallback data
};
```

## 🔄 Workflow de Desenvolvimento

### Git Flow Recomendado
```bash
# 1. Feature development
git checkout -b feature/nova-funcionalidade
git add .
git commit -m "feat: adiciona nova funcionalidade"

# 2. Testing
npm run dev                    # Test locally
docker-compose --profile dev up -d  # Test in container

# 3. Build validation
npm run build                  # Verify build works
docker-compose build           # Verify container build

# 4. Integration
git checkout main
git merge feature/nova-funcionalidade
```

### Code Review Checklist
- [ ] **Error handling**: Todas as async operations têm try/catch
- [ ] **Logging**: Logs informativos com emojis consistentes
- [ ] **Environment config**: Novas configs em .env.example
- [ ] **Documentation**: Comments para lógica complexa
- [ ] **Performance**: Considerações de memory e CPU
- [ ] **Security**: Validação de inputs, sanitização
- [ ] **Testing**: Unit tests para nova funcionalidade

## 🔧 Extensibilidade

### Adicionando Novos Endpoints
```javascript
// Template para novos endpoints:
app.get('/api/new-endpoint', async (req, res) => {
  try {
    // 1. Validate input
    const { param1, param2 } = req.params;
    if (!param1) {
      return res.status(400).json({ error: 'param1 é obrigatório' });
    }
    
    // 2. Business logic
    const data = await service.processRequest(param1, param2);
    
    // 3. Success response
    res.json({
      data: data,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'internal'
      }
    });
    
  } catch (error) {
    // 4. Error handling
    console.error('❌ Erro em /api/new-endpoint:', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

### Adicionando Novos Clientes de API
```javascript
// Template para novos clientes:
import axios from 'axios';

class NewAPIClient {
  constructor() {
    this.baseUrl = process.env.NEW_API_BASE_URL;
    this.apiKey = process.env.NEW_API_KEY;
    this.rateLimitDelay = 1000;  // Adjust per API
  }
  
  async makeRequest(endpoint, params = {}) {
    // Rate limiting se necessário
    // Error handling
    // Request logging
    // Response validation
  }
  
  async getSpecificData(filters) {
    return await this.makeRequest('endpoint', filters);
  }
}

export default NewAPIClient;
```

### Adicionando Cache para Novos Dados
```javascript
// Extensão do CacheManager:
// cache-manager.js - adicionar novos métodos:

async getNewDataType() {
  const cacheKey = 'new_data_type';
  
  if (!this.isExpired(cacheKey)) {
    console.log('📋 Usando new_data_type do cache');
    return this.getCacheData(cacheKey);
  }
  
  console.log('🔄 Carregando new_data_type...');
  try {
    const data = await this.fetchNewDataType();
    this.setCacheData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('❌ Erro ao carregar new_data_type:', error.message);
    return this.getStaticFallbackNewDataType();
  }
}
```

## 🎨 Frontend Development

### Estrutura de UI Components
```javascript
// Padrão para novos componentes de UI:
class UIComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.state = {};
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = this.template();
  }
  
  template() {
    return `
      <div class="card">
        <div class="card-header">
          <h3>${this.state.title}</h3>
        </div>
        <div class="card-body">
          <!-- Component content -->
        </div>
      </div>
    `;
  }
  
  bindEvents() {
    this.container.addEventListener('click', this.handleClick.bind(this));
  }
  
  handleClick(event) {
    // Event handling
  }
}
```

### CSS Classes Padrão
```css
/* Seguir patrões do Tailwind + custom classes: */
.card { @apply bg-white rounded-xl shadow-lg overflow-hidden; }
.card-header { @apply p-6 border-b border-gray-200; }
.card-body { @apply p-6; }

.btn { @apply px-4 py-2 rounded-lg font-medium transition-colors; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
.btn-disabled { @apply bg-gray-300 text-gray-500 cursor-not-allowed; }

.form-label { @apply block text-sm font-medium text-gray-700 mb-2; }
.form-input { @apply w-full px-3 py-2 border border-gray-300 rounded-lg; }
```

### JavaScript API Client (Frontend)
```javascript
// public/js/api-client.js (recomendado)
class APIClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }
  
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => 
      url.searchParams.append(key, params[key])
    );
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async searchAirports(query, limit = 10) {
    return await this.get('/api/autocomplete/airports', { q: query, limit });
  }
  
  async getFlightsByAirline(code, limit = 10) {
    return await this.get(`/api/flights/airline/${code}`, { limit });
  }
}
```

## 📊 Monitoramento em Desenvolvimento

### Health Check Dashboard (Desenvolvimento)
```javascript
// Implementação recomendada para dev dashboard:
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/dashboard', (req, res) => {
    res.json({
      app_status: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV
      },
      cache_status: {
        airports_loaded: !!cacheManager.getCacheData('airports'),
        airlines_loaded: !!cacheManager.getCacheData('airlines'),
        cache_age: cacheManager.getCacheAge()
      },
      api_status: {
        api_key_configured: !!api.apiKey,
        last_request: api.lastRequestTime,
        ready_for_request: (Date.now() - api.lastRequestTime) > api.rateLimitDelay
      }
    });
  });
}
```

### Performance Profiling
```javascript
// Profiling de performance:
class PerformanceProfiler {
  static startTimer(label) {
    console.time(label);
  }
  
  static endTimer(label) {
    console.timeEnd(label);
  }
  
  static async profileAsync(label, asyncFunction) {
    const start = Date.now();
    try {
      const result = await asyncFunction();
      const duration = Date.now() - start;
      console.log(`⏱️ ${label}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ ${label} failed after ${duration}ms:`, error.message);
      throw error;
    }
  }
}

// Usage:
const airports = await PerformanceProfiler.profileAsync(
  'Cache load airports',
  () => cacheManager.getAirports()
);
```

## 🚀 Deploy e CI/CD

### Local Build Validation
```bash
# Checklist antes de commit:
npm run build                    # ✅ Build deve funcionar
docker-compose build            # ✅ Docker build deve funcionar  
docker-compose up -d            # ✅ Containers devem startar
curl http://localhost:8080/health # ✅ Health check deve retornar 200
docker-compose down             # ✅ Cleanup
```

### Environment-specific Configurations
```bash
# Development
export NODE_ENV=development
export PORT=3000
export AVIATIONSTACK_API_KEY=dev_key

# Staging  
export NODE_ENV=staging
export PORT=3000
export AVIATIONSTACK_API_KEY=staging_key

# Production
export NODE_ENV=production
export PORT=3000
export AVIATIONSTACK_API_KEY=prod_key
```

### CI/CD Pipeline Recommendations
```yaml
# .github/workflows/ci.yml (recomendado)
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build
      
  docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build --target app .
      - run: docker-compose build
      - run: docker-compose up -d
      - run: curl http://localhost:8080/health
```

## 📋 Maintenance Guidelines

### Regular Maintenance Tasks
```bash
# Weekly:
docker system prune -f          # Clean unused containers/images
npm audit                       # Check security vulnerabilities
docker-compose logs --tail=100  # Review recent logs

# Monthly:
npm update                      # Update dependencies
docker pull node:20-alpine      # Update base images
curl http://localhost:3000/api/cache/preload  # Verify cache refresh
```

### Monitoring Checklist
- [ ] **Memory usage**: < 100MB em produção
- [ ] **Response times**: Cache < 50ms, API < 5s
- [ ] **Cache hit ratio**: > 90%
- [ ] **Error rate**: < 1%
- [ ] **Health checks**: 100% success
- [ ] **Log analysis**: Sem errors críticos

### Update Strategy
```javascript
// Estratégia para updates de dependências:
const UPDATE_STRATEGY = {
  security_patches: 'immediate',    // Security updates ASAP
  minor_versions: 'monthly',        // Minor updates monthly
  major_versions: 'quarterly',      // Major updates quarterly, with testing
  node_runtime: 'LTS_only'         // Stick to Node.js LTS versions
};
```

## 🎯 Next Steps para Developers

### Immediate Improvements
1. **Add unit tests**: Implementar testes para componentes críticos
2. **Structured logging**: Migrar para Winston ou Pino
3. **Error monitoring**: Integrar Sentry ou similar
4. **Performance metrics**: Adicionar Prometheus metrics

### Medium-term Goals
1. **Database integration**: Migrar cache para Redis
2. **Authentication**: Implementar API authentication se necessário
3. **Rate limiting**: Implement per-user rate limiting
4. **Monitoring**: Grafana dashboard para métricas

### Architecture Evolution
1. **Service extraction**: Identificar bounded contexts para microservices
2. **Event-driven**: Implementar event sourcing para audit log
3. **CQRS**: Separar read/write models se necessário
4. **API versioning**: Strategy para backward compatibility

---
*Guia atualizado em: 2024-01-15*